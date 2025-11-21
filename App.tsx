
import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Timeline from './components/Timeline';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';
import { BodyPartType, Keyframe, SkeletonState, GymProp, PropViewTransform, ViewType, LayoutMode } from './types';
import { INITIAL_POSE, SAMPLE_PROPS, SKELETON_DEF, MIRROR_MAPPING, IK_CHAINS } from './constants';
import { generatePropSvg } from './services/geminiService';
import { getGlobalTransform, solveTwoBoneIK, toDegrees, normalizeAngle, transformPoint, syncDumbbells, exportAnimation, Point, getSnapPointDef, synchronizePropViews } from './utils';

const SNAP_THRESHOLD = 20;
const UNSNAP_THRESHOLD = 50;
const VIEWS: ViewType[] = ['FRONT', 'SIDE', 'TOP'];

const App: React.FC = () => {
  // --- State ---
  // Initialize keyframes with deep cloned state
  const [keyframes, setKeyframes] = useState<Keyframe[]>([
    { id: uuidv4(), duration: 500, pose: JSON.parse(JSON.stringify(INITIAL_POSE)), propTransforms: {} }
  ]);
  const [currentFrameId, setCurrentFrameId] = useState<string>(keyframes[0].id);
  const [selectedBoneId, setSelectedBoneId] = useState<BodyPartType | null>(null);
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  
  const [props, setProps] = useState<GymProp[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPose, setCurrentPose] = useState<SkeletonState>(JSON.parse(JSON.stringify(INITIAL_POSE)));
  const [propPrompt, setPropPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMirrorMode, setIsMirrorMode] = useState(false);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(true);
  const [exportMode, setExportMode] = useState<'accurate' | 'interpolated'>('accurate');
  const [activeView, setActiveView] = useState<ViewType>('FRONT');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('SINGLE');
  // Slot configuration for multi-view modes: 0=Primary, 1=Secondary(Right), 2=Tertiary(Bottom)
  const [slotViews, setSlotViews] = useState<ViewType[]>(['FRONT', 'SIDE', 'TOP']);
  const [armsInFront, setArmsInFront] = useState(false);

  const [attachments, setAttachments] = useState<Record<string, { propId: string, snapPointId: string, rotationOffset: number }>>({});

  // Dragging State
  const [dragState, setDragState] = useState<{
      isDragging: boolean;
      type: 'BONE' | 'PROP';
      id: string;
      startX: number; 
      startY: number; 
      originalX?: number; 
      originalY?: number; 
      view: ViewType; // Track which view initiated drag
  } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  // --- Helpers ---
  const getCurrentFrame = () => keyframes.find(k => k.id === currentFrameId) || keyframes[0];

  const updateKeyframeProps = (newProps: GymProp[]) => {
      setKeyframes(prev => prev.map(kf => {
          if (kf.id === currentFrameId) {
              const transforms: Record<string, Record<ViewType, PropViewTransform>> = {};
              newProps.forEach(p => {
                  transforms[p.id] = JSON.parse(JSON.stringify(p.transforms));
              });
              return { ...kf, propTransforms: transforms };
          }
          return kf;
      }));
  };

  // --- Effects ---
  useEffect(() => {
    if (!isPlaying) {
      const frame = getCurrentFrame();
      if (frame) {
        setCurrentPose(JSON.parse(JSON.stringify(frame.pose)));
        setProps(prevProps => prevProps.map(p => {
            const tr = frame.propTransforms[p.id];
            if (tr) {
                return { ...p, transforms: JSON.parse(JSON.stringify(tr)) };
            }
            return p;
        }));
      }
    }
  }, [currentFrameId, isPlaying]);

  useEffect(() => {
    let animationFrame: number;
    let startTime: number;
    let currentKeyframeIndex = 0;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      const currentKeyframe = keyframes[currentKeyframeIndex];
      
      if (elapsed < currentKeyframe.duration) {
        const progress = elapsed / currentKeyframe.duration;
        const nextIndex = (currentKeyframeIndex + 1) % keyframes.length;
        const nextKeyframe = keyframes[nextIndex];

        // Interpolate Props
        const nextProps = props.map(p => {
            const startTrAll = currentKeyframe.propTransforms[p.id] || p.transforms;
            const endTrAll = nextKeyframe.propTransforms[p.id] || startTrAll;
            
            const interpolatedTransforms: Record<ViewType, PropViewTransform> = {} as any;
            VIEWS.forEach(v => {
                const start = startTrAll[v];
                const end = endTrAll[v];
                interpolatedTransforms[v] = {
                    x: start.x + (end.x - start.x) * progress,
                    y: start.y + (end.y - start.y) * progress,
                    rotation: start.rotation + (end.rotation - start.rotation) * progress,
                    scaleX: start.scaleX + (end.scaleX - start.scaleX) * progress,
                    scaleY: start.scaleY + (end.scaleY - start.scaleY) * progress,
                }
            });

            return { ...p, transforms: interpolatedTransforms };
        });

        // Interpolate Pose
        const interpolatedPose: SkeletonState = {} as SkeletonState;
        Object.keys(currentKeyframe.pose).forEach((key) => {
            const k = key as BodyPartType;
            interpolatedPose[k] = {} as any;
            VIEWS.forEach(v => {
                const startAngle = currentKeyframe.pose[k][v];
                const endAngle = nextKeyframe.pose[k][v];
                interpolatedPose[k][v] = startAngle + (endAngle - startAngle) * progress;
            });
        });

        // IK Logic (Run for each view)
        VIEWS.forEach(view => {
            Object.entries(attachments).forEach(([boneId, info]) => {
                const attachedProp = nextProps.find(p => p.id === info.propId);
                if (attachedProp) {
                    const snapPoint = attachedProp.snapPoints.find(sp => sp.id === info.snapPointId);
                    if (snapPoint) {
                        const spPos = getSnapPointDef(snapPoint, view);
                        const targetGlobal = transformPoint(spPos.x, spPos.y, attachedProp.transforms[view]);
                        const chain = IK_CHAINS[boneId];
                        if (chain) {
                            const ikResult = solveTwoBoneIK(chain.upper, chain.lower, targetGlobal, interpolatedPose, view);
                            if (ikResult) {
                                interpolatedPose[chain.upper as BodyPartType][view] = ikResult[chain.upper];
                                interpolatedPose[chain.lower as BodyPartType][view] = ikResult[chain.lower];
                            }
                        }
                        const handBoneDef = SKELETON_DEF.find(b => b.id === boneId);
                        if(handBoneDef && handBoneDef.parentId) {
                              const parentGlobal = getGlobalTransform(handBoneDef.parentId, interpolatedPose, view);
                              const offset = info.rotationOffset || 0;
                              const targetHandGlobal = attachedProp.transforms[view].rotation + offset; 
                              const targetHandLocal = normalizeAngle(targetHandGlobal - parentGlobal.angle);
                              interpolatedPose[boneId as BodyPartType][view] = targetHandLocal;
                        }
                    }
                }
            });
        });

        setCurrentPose(interpolatedPose);
        setProps(nextProps);

        animationFrame = requestAnimationFrame(animate);
      } else {
        startTime = timestamp;
        currentKeyframeIndex = (currentKeyframeIndex + 1) % keyframes.length;
        animationFrame = requestAnimationFrame(animate);
      }
    };

    if (isPlaying) {
      animationFrame = requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, keyframes, attachments]);


  // --- Handlers ---

  const handleBoneMouseDown = (id: BodyPartType, e: React.MouseEvent, view: ViewType) => {
    if (isPlaying) return;
    setSelectedBoneId(id);
    setSelectedPropId(null);
    setActiveView(view);
    
    setDragState({
        isDragging: true,
        type: 'BONE',
        id,
        startX: e.clientX,
        startY: e.clientY,
        view
    });
  };

  const handlePropMouseDown = (e: React.MouseEvent, prop: GymProp, view: ViewType) => {
      if (isPlaying) return;
      e.stopPropagation();
      setSelectedPropId(prop.id);
      setSelectedBoneId(null);
      setActiveView(view);

      setDragState({
          isDragging: true,
          type: 'PROP',
          id: prop.id,
          startX: e.clientX,
          startY: e.clientY,
          originalX: prop.transforms[view].x,
          originalY: prop.transforms[view].y,
          view
      });
  };

  const handleSvgMouseMove = (e: React.MouseEvent, view: ViewType) => {
      if (!dragState || !dragState.isDragging) return;
      
      // If dragging started in a different view, ignore or handle carefully. 
      // Here we strictly control based on the view where drag started.
      if (dragState.view !== view) return;

      const svg = e.currentTarget as SVGSVGElement;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse());
      
      const startPt = svg.createSVGPoint();
      startPt.x = dragState.startX;
      startPt.y = dragState.startY;
      const startSvgPoint = startPt.matrixTransform(svg.getScreenCTM()?.inverse());

      const dx = svgPoint.x - startSvgPoint.x;
      const dy = svgPoint.y - startSvgPoint.y;

      // --- PROP DRAGGING (Synchronized Views) ---
      if (dragState.type === 'PROP' && selectedPropId) {
          const updatedProps = props.map(p => {
              if (p.id === selectedPropId) {
                  const newX = dragState.originalX! + dx;
                  const newY = dragState.originalY! + dy;
                  
                  const newTransform = {
                      ...p.transforms[view],
                      x: newX,
                      y: newY
                  };
                  
                  // Use helper to sync other views based on rules
                  return synchronizePropViews(p, view, newTransform);
              }
              return p;
          });

          setProps(updatedProps);
          updateKeyframeProps(updatedProps);
          
          // IK Follow
          const movingProp = updatedProps.find(p => p.id === selectedPropId);
          if (movingProp) {
              const attachedHands = Object.entries(attachments)
                  .filter(([_, info]) => info.propId === movingProp.id);
              
              if (attachedHands.length > 0) {
                  let newPose = JSON.parse(JSON.stringify(currentPose));
                  // IK updates need to happen in all views potentially if the prop moved in a way that affects them
                  VIEWS.forEach(v => {
                    attachedHands.forEach(([handId, info]) => {
                        const snapPoint = movingProp.snapPoints.find(sp => sp.id === info.snapPointId);
                        const spPos = snapPoint ? getSnapPointDef(snapPoint, v) : { x: 0, y: 0 };
                        const snapGlobal = transformPoint(
                            spPos.x,
                            spPos.y,
                            movingProp.transforms[v]
                        );
                        const chain = IK_CHAINS[handId];
                        if (chain) {
                            const ikResult = solveTwoBoneIK(chain.upper, chain.lower, snapGlobal, newPose, v);
                            if (ikResult) {
                                newPose[chain.upper][v] = ikResult[chain.upper];
                                newPose[chain.lower][v] = ikResult[chain.lower];
                            }
                        }
                        const handBoneDef = SKELETON_DEF.find(b => b.id === handId);
                        if(handBoneDef && handBoneDef.parentId) {
                            const parentGlobal = getGlobalTransform(handBoneDef.parentId, newPose, v);
                            const offset = info.rotationOffset || 0;
                            const targetHandGlobal = movingProp.transforms[v].rotation + offset; 
                            const targetHandLocal = normalizeAngle(targetHandGlobal - parentGlobal.angle);
                            newPose[handId as BodyPartType][v] = targetHandLocal;
                        }
                    });
                  });
                  setCurrentPose(newPose);
                  setKeyframes(prev => prev.map(kf => {
                      if (kf.id === currentFrameId) return { ...kf, pose: newPose };
                      return kf;
                  }));
              }
          }
          return;
      }

      // --- BONE DRAGGING (Independent View) ---
      if (dragState.type === 'BONE' && selectedBoneId) {
          const boneId = selectedBoneId;
          let newPose = JSON.parse(JSON.stringify(currentPose));
          let affectedBones: BodyPartType[] = [];
          let newAttachments = { ...attachments };
          
          if (IK_CHAINS[boneId]) {
              const chain = IK_CHAINS[boneId];
              let targetPos: Point = svgPoint;

              // Snap Logic (Only for FRONT view usually, but we can support all)
              if (boneId.includes('HAND')) {
                  let nearestDist = Infinity;
                  let nearestSnapPos: Point = svgPoint;
                  let nearestInfo: { propId: string, snapId: string } | null = null;

                  props.forEach(prop => {
                      prop.snapPoints.forEach(sp => {
                          const { x, y, visible } = getSnapPointDef(sp, view);
                          if (!visible) return; // Skip hidden snap points

                          const globalSp = transformPoint(x, y, prop.transforms[view]);
                          const dist = Math.sqrt(Math.pow(globalSp.x - svgPoint.x, 2) + Math.pow(globalSp.y - svgPoint.y, 2));
                          if (dist < nearestDist) {
                              nearestDist = dist;
                              nearestSnapPos = globalSp;
                              nearestInfo = { propId: prop.id, snapId: sp.id };
                          }
                      });
                  });

                  const currentAttachment = attachments[boneId];

                  if (currentAttachment) {
                      const attachedProp = props.find(p => p.id === currentAttachment.propId);
                      const attachedSp = attachedProp?.snapPoints.find(sp => sp.id === currentAttachment.snapPointId);
                      const isDumbbell = attachedProp?.name.toLowerCase().includes('dumbbell');
                      
                      if (attachedProp && attachedSp) {
                           const spPos = getSnapPointDef(attachedSp, view);
                           const anchorPos = transformPoint(spPos.x, spPos.y, attachedProp.transforms[view]);
                           const distFromAnchor = Math.sqrt(Math.pow(anchorPos.x - svgPoint.x, 2) + Math.pow(anchorPos.y - svgPoint.y, 2));
                           
                           if (distFromAnchor > UNSNAP_THRESHOLD) {
                               delete newAttachments[boneId];
                               targetPos = svgPoint; 
                           } else {
                               if (isDumbbell) targetPos = svgPoint; 
                               else targetPos = anchorPos; 
                           }
                      }
                  } else {
                      if (nearestDist < SNAP_THRESHOLD && nearestInfo) {
                          targetPos = nearestSnapPos;
                          const handGlobal = getGlobalTransform(boneId, currentPose, view);
                          const prop = props.find(p => p.id === nearestInfo!.propId)!;
                          const offset = normalizeAngle(handGlobal.angle - prop.transforms[view].rotation);

                          newAttachments[boneId] = { 
                              propId: nearestInfo.propId, 
                              snapPointId: nearestInfo.snapId,
                              rotationOffset: offset
                          };
                      }
                  }
              }

              const ikResult = solveTwoBoneIK(chain.upper, chain.lower, targetPos, currentPose, view);
              if (ikResult) {
                  newPose[chain.upper][view] = ikResult[chain.upper];
                  newPose[chain.lower][view] = ikResult[chain.lower];
                  affectedBones.push(chain.upper, chain.lower);
              }
          } 
          else {
             const boneDef = SKELETON_DEF.find(b => b.id === boneId);
             if (boneDef && boneDef.parentId) {
                 const parentGlobal = getGlobalTransform(boneDef.parentId, currentPose, view);
                 const dx = svgPoint.x - parentGlobal.x;
                 const dy = svgPoint.y - parentGlobal.y;
                 const targetGlobalAngle = toDegrees(Math.atan2(dy, dx));
                 const targetGlobalSvg = targetGlobalAngle - 90;
                 const localAngle = normalizeAngle(targetGlobalSvg - parentGlobal.angle);
                 newPose[boneId][view] = localAngle;
                 affectedBones.push(boneId);
             }
          }

          if (isMirrorMode) {
              affectedBones.forEach(sourceId => {
                  const mirrorId = MIRROR_MAPPING[sourceId];
                  if (mirrorId && newPose[sourceId][view] !== undefined) {
                      // For SIDE view, mirror direction is identical (moving forward/backward together).
                      // For FRONT/TOP view, mirror direction is opposite (abduction/adduction).
                      const mirrorSign = view === 'SIDE' ? 1 : -1;
                      newPose[mirrorId][view] = newPose[sourceId][view] * mirrorSign;
                  }
              });
          }

          const syncedProps = syncDumbbells(props, newPose, newAttachments);
          if (syncedProps !== props) {
              setProps(syncedProps);
              updateKeyframeProps(syncedProps);
          }

          setCurrentPose(newPose);
          setAttachments(newAttachments);
          setKeyframes(prev => prev.map(kf => {
              if (kf.id === currentFrameId) {
                  const transforms = kf.propTransforms || {};
                  if (syncedProps !== props) {
                      syncedProps.forEach(p => {
                         transforms[p.id] = JSON.parse(JSON.stringify(p.transforms));
                      });
                  }
                  return { ...kf, pose: newPose, propTransforms: { ...transforms } };
              }
              return kf;
          }));
      }
  };

  const handleSvgMouseUp = () => {
      setDragState(null);
  };

  const handleRotationChange = (angle: number) => {
    if (!selectedBoneId || isPlaying) return;

    const updatePose = (pose: SkeletonState, id: BodyPartType, a: number, view: ViewType) => {
        const p = JSON.parse(JSON.stringify(pose));
        p[id][view] = a;
        if (isMirrorMode) {
            const mirrorId = MIRROR_MAPPING[id];
            if (mirrorId) {
                // Side view rotation is usually synchronous (same direction), Front is mirrored (opposite)
                const mirrorSign = view === 'SIDE' ? 1 : -1;
                p[mirrorId][view] = a * mirrorSign;
            }
        }
        return p;
    };

    const newPose = updatePose(currentPose, selectedBoneId, angle, activeView);
    setCurrentPose(newPose);

    const syncedProps = syncDumbbells(props, newPose, attachments);
    if (syncedProps !== props) {
        setProps(syncedProps);
        updateKeyframeProps(syncedProps);
    }

    // Update offsets if attached (Specific to current view context? No, usually syncing keeps relative angle)
    if (attachments[selectedBoneId]) {
         const att = attachments[selectedBoneId];
         const handGlobal = getGlobalTransform(selectedBoneId, newPose, activeView);
         const prop = syncedProps.find(p => p.id === att.propId);
         if (prop) {
             const newOffset = normalizeAngle(handGlobal.angle - prop.transforms[activeView].rotation);
             setAttachments(prev => ({
                 ...prev,
                 [selectedBoneId]: { ...att, rotationOffset: newOffset }
             }));
         }
    }

    setKeyframes(prev => prev.map(kf => {
      if (kf.id === currentFrameId) {
         const transforms = kf.propTransforms || {};
          if (syncedProps !== props) {
              syncedProps.forEach(p => {
                 transforms[p.id] = JSON.parse(JSON.stringify(p.transforms));
              });
          }
        return { ...kf, pose: newPose, propTransforms: { ...transforms } };
      }
      return kf;
    }));
  };

  const handleDetachBone = (boneId: string) => {
      const newAttachments = { ...attachments };
      delete newAttachments[boneId];
      setAttachments(newAttachments);
  };

  const handleAddFrame = () => {
    const currentFrame = getCurrentFrame();
    const newFrame: Keyframe = {
      id: uuidv4(),
      duration: 500,
      pose: JSON.parse(JSON.stringify(currentFrame.pose)), 
      propTransforms: JSON.parse(JSON.stringify(currentFrame.propTransforms))
    };
    setKeyframes([...keyframes, newFrame]);
    setCurrentFrameId(newFrame.id);
  };

  const handleDeleteFrame = (id: string) => {
    if (keyframes.length <= 1) return;
    const newFrames = keyframes.filter(k => k.id !== id);
    setKeyframes(newFrames);
    if (currentFrameId === id) {
        setCurrentFrameId(newFrames[newFrames.length - 1].id);
    }
  };

  const handleDurationChange = (id: string, dur: number) => {
      setKeyframes(keyframes.map(k => k.id === id ? { ...k, duration: dur } : k));
  };

  const registerNewProp = (newProp: GymProp) => {
      setProps(prev => [...prev, newProp]);
      setKeyframes(prev => prev.map(kf => ({
          ...kf,
          propTransforms: {
              ...kf.propTransforms,
              [newProp.id]: JSON.parse(JSON.stringify(newProp.transforms))
          }
      })));
  };

  const handleGenerateProp = async () => {
    if (!propPrompt) return;
    setIsGenerating(true);
    try {
      const result = await generatePropSvg(propPrompt);
      const newProp: GymProp = {
        id: uuidv4(),
        name: result.name,
        views: {
            FRONT: { path: result.path, viewBox: result.viewBox },
            SIDE: { path: result.path, viewBox: result.viewBox }, 
            TOP: { path: result.path, viewBox: result.viewBox }
        },
        transforms: {
            FRONT: { x: 200, y: 350, rotation: 0, scaleX: 1, scaleY: 1 },
            SIDE: { x: 200, y: 350, rotation: 0, scaleX: 1, scaleY: 1 },
            TOP: { x: 200, y: 200, rotation: 0, scaleX: 1, scaleY: 1 },
        },
        attachedTo: null,
        snapPoints: [{ id: 'center', name: 'Center', x: 0, y: 0 }],
        color: '#cccccc'
      };
      registerNewProp(newProp);
      setPropPrompt('');
    } catch (e) {
      alert("Failed to generate prop. Please check your API Key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddPresetProp = (preset: any) => {
       const newProp: GymProp = {
        id: uuidv4(),
        name: preset.name,
        views: preset.views,
        transforms: {
            FRONT: { x: 200, y: 350, rotation: 0, scaleX: 1, scaleY: 1 },
            SIDE: { x: 200, y: 350, rotation: 0, scaleX: 1, scaleY: 1 },
            TOP: { x: 200, y: 200, rotation: 0, scaleX: 1, scaleY: 1 },
        },
        attachedTo: null,
        snapPoints: preset.snapPoints || [],
        color: preset.color,
        layer: preset.layer,
        stroke: preset.stroke,
        strokeWidth: preset.strokeWidth
      };
      registerNewProp(newProp);
  };

  const handleDeleteProp = (id?: string) => {
      const targetId = id || selectedPropId;
      if (targetId) {
          const newAttachments = { ...attachments };
          Object.keys(newAttachments).forEach(key => {
              if (newAttachments[key].propId === targetId) {
                  delete newAttachments[key];
              }
          });
          setAttachments(newAttachments);

          setProps(props.filter(p => p.id !== targetId));
          if (selectedPropId === targetId) {
            setSelectedPropId(null);
          }
      }
  };

  const handlePropUpdate = (updatedProps: GymProp[]) => {
      setProps(updatedProps);
      updateKeyframeProps(updatedProps);
  };

  const handleSelectProp = (id: string) => {
      setSelectedPropId(id);
      setSelectedBoneId(null);
  };

  const handleExport = () => exportAnimation(keyframes, props, attachments, exportMode, layoutMode, activeView, slotViews);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 text-gray-100 overflow-hidden">
      <Header 
        isMirrorMode={isMirrorMode}
        setIsMirrorMode={setIsMirrorMode}
        onExport={handleExport}
        exportMode={exportMode}
        setExportMode={setExportMode}
        activeView={activeView}
        setActiveView={setActiveView}
        layoutMode={layoutMode}
        setLayoutMode={setLayoutMode}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar 
            selectedBoneId={selectedBoneId}
            selectedPropId={selectedPropId}
            currentPose={currentPose}
            props={props}
            setProps={handlePropUpdate} 
            attachments={attachments}
            onRotationChange={handleRotationChange}
            onDetachBone={handleDetachBone}
            onDeleteProp={handleDeleteProp}
            onAddPresetProp={handleAddPresetProp}
            onGenerateProp={handleGenerateProp}
            isGenerating={isGenerating}
            propPrompt={propPrompt}
            setPropPrompt={setPropPrompt}
            isMirrorMode={isMirrorMode}
            onSelectProp={handleSelectProp}
            armsInFront={armsInFront}
            setArmsInFront={setArmsInFront}
            activeView={activeView}
        />

        <Canvas 
            svgRef={svgRef}
            currentPose={currentPose}
            props={props}
            selectedBoneId={selectedBoneId}
            selectedPropId={selectedPropId}
            attachments={attachments}
            dragState={dragState}
            isPlaying={isPlaying}
            armsInFront={armsInFront}
            activeView={activeView}
            layoutMode={layoutMode}
            slotViews={slotViews}
            onUpdateSlotView={(index, view) => {
                const newSlots = [...slotViews];
                newSlots[index] = view;
                setSlotViews(newSlots);
                setActiveView(view);
            }}
            onBoneMouseDown={handleBoneMouseDown}
            onPropMouseDown={handlePropMouseDown}
            onSvgMouseMove={handleSvgMouseMove}
            onSvgMouseUp={handleSvgMouseUp}
            onClearSelection={() => {
                setSelectedBoneId(null);
                setSelectedPropId(null);
            }}
            onSetActiveView={setActiveView}
        />
      </div>

      <div className={`flex-shrink-0 transition-[height] duration-300 ease-in-out ${isTimelineExpanded ? 'h-48' : 'h-12'}`}>
        <Timeline 
            keyframes={keyframes}
            currentFrameId={currentFrameId}
            onSelectFrame={(id) => {
                setCurrentFrameId(id);
                setIsPlaying(false);
            }}
            onAddFrame={handleAddFrame}
            onDeleteFrame={handleDeleteFrame}
            onDurationChange={handleDurationChange}
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            isExpanded={isTimelineExpanded}
            onToggleExpand={() => setIsTimelineExpanded(!isTimelineExpanded)}
        />
      </div>
    </div>
  );
};

export default App;
