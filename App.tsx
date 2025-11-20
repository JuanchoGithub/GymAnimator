import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Timeline from './components/Timeline';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';
import { BodyPartType, Keyframe, SkeletonState, GymProp, PropTransform } from './types';
import { INITIAL_POSE, SAMPLE_PROPS, SKELETON_DEF, MIRROR_MAPPING, IK_CHAINS } from './constants';
import { generatePropSvg } from './services/geminiService';
import { getGlobalTransform, solveTwoBoneIK, toDegrees, normalizeAngle, transformPoint, syncDumbbells, exportAnimation } from './utils';

const SNAP_THRESHOLD = 20;
const UNSNAP_THRESHOLD = 50;

const App: React.FC = () => {
  // --- State ---
  const [keyframes, setKeyframes] = useState<Keyframe[]>([
    { id: uuidv4(), duration: 500, pose: { ...INITIAL_POSE }, propTransforms: {} }
  ]);
  const [currentFrameId, setCurrentFrameId] = useState<string>(keyframes[0].id);
  const [selectedBoneId, setSelectedBoneId] = useState<BodyPartType | null>(null);
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  
  const [props, setProps] = useState<GymProp[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPose, setCurrentPose] = useState<SkeletonState>({ ...INITIAL_POSE });
  const [propPrompt, setPropPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMirrorMode, setIsMirrorMode] = useState(false);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(true);

  // Map of Hand Bone ID -> Attachment Info
  const [attachments, setAttachments] = useState<Record<string, { propId: string, snapPointId: string, rotationOffset: number }>>({});

  // Dragging State
  const [dragState, setDragState] = useState<{
      isDragging: boolean;
      type: 'BONE' | 'PROP';
      id: string;
      startX: number; // Mouse Screen X
      startY: number; // Mouse Screen Y
      originalX?: number; // For Props
      originalY?: number; // For Props
  } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  // --- Helpers ---
  const getCurrentFrame = () => keyframes.find(k => k.id === currentFrameId) || keyframes[0];

  // Update current keyframe with new prop transforms
  const updateKeyframeProps = (newProps: GymProp[]) => {
      setKeyframes(prev => prev.map(kf => {
          if (kf.id === currentFrameId) {
              const transforms: Record<string, PropTransform> = {};
              newProps.forEach(p => {
                  transforms[p.id] = {
                      translateX: p.translateX,
                      translateY: p.translateY,
                      rotation: p.rotation,
                      scaleX: p.scaleX,
                      scaleY: p.scaleY
                  };
              });
              return { ...kf, propTransforms: transforms };
          }
          return kf;
      }));
  };

  // --- Effects ---
  // Sync currentPose and Props with selected frame when not playing
  useEffect(() => {
    if (!isPlaying) {
      const frame = getCurrentFrame();
      if (frame) {
        setCurrentPose(frame.pose);
        
        // Sync Props from Keyframe
        setProps(prevProps => prevProps.map(p => {
            const tr = frame.propTransforms[p.id];
            if (tr) {
                return { 
                    ...p, 
                    translateX: tr.translateX,
                    translateY: tr.translateY,
                    rotation: tr.rotation,
                    scaleX: tr.scaleX,
                    scaleY: tr.scaleY
                };
            }
            return p;
        }));
      }
    }
  }, [currentFrameId, isPlaying]); // Only trigger on frame switch or play/stop

  // Animation Loop
  useEffect(() => {
    let animationFrame: number;
    let startTime: number;
    let currentKeyframeIndex = 0;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      const currentKeyframe = keyframes[currentKeyframeIndex];
      
      if (elapsed < currentKeyframe.duration) {
        // Interpolate
        const progress = elapsed / currentKeyframe.duration;
        const nextIndex = (currentKeyframeIndex + 1) % keyframes.length;
        const nextKeyframe = keyframes[nextIndex];

        // Pose Interpolation
        const interpolatedPose: SkeletonState = {} as SkeletonState;
        Object.keys(currentKeyframe.pose).forEach((key) => {
            const k = key as BodyPartType;
            const startAngle = currentKeyframe.pose[k];
            const endAngle = nextKeyframe.pose[k];
            interpolatedPose[k] = startAngle + (endAngle - startAngle) * progress;
        });
        setCurrentPose(interpolatedPose);

        // Prop Interpolation
        setProps(currentProps => currentProps.map(p => {
            const startTr = currentKeyframe.propTransforms[p.id] || { 
                translateX: p.translateX, translateY: p.translateY, rotation: p.rotation, scaleX: p.scaleX, scaleY: p.scaleY 
            };
            // If next frame is missing the prop transform, use the start transform (no motion)
            const endTr = nextKeyframe.propTransforms[p.id] || startTr;

            return {
                ...p,
                translateX: startTr.translateX + (endTr.translateX - startTr.translateX) * progress,
                translateY: startTr.translateY + (endTr.translateY - startTr.translateY) * progress,
                rotation: startTr.rotation + (endTr.rotation - startTr.rotation) * progress,
                scaleX: startTr.scaleX + (endTr.scaleX - startTr.scaleX) * progress,
                scaleY: startTr.scaleY + (endTr.scaleY - startTr.scaleY) * progress,
            };
        }));

        animationFrame = requestAnimationFrame(animate);
      } else {
        // Next frame
        startTime = timestamp;
        currentKeyframeIndex = (currentKeyframeIndex + 1) % keyframes.length;
        animationFrame = requestAnimationFrame(animate);
      }
    };

    if (isPlaying) {
      animationFrame = requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, keyframes]);


  // --- Handlers ---

  const getSvgPoint = (screenX: number, screenY: number) => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const pt = svgRef.current.createSVGPoint();
      pt.x = screenX;
      pt.y = screenY;
      return pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
  };

  const handleBoneMouseDown = (id: BodyPartType, e: React.MouseEvent) => {
    if (isPlaying) return;
    setSelectedBoneId(id);
    setSelectedPropId(null);
    
    setDragState({
        isDragging: true,
        type: 'BONE',
        id,
        startX: e.clientX,
        startY: e.clientY
    });
  };

  const handlePropMouseDown = (e: React.MouseEvent, prop: GymProp) => {
      if (isPlaying) return;
      e.stopPropagation();
      setSelectedPropId(prop.id);
      setSelectedBoneId(null);

      setDragState({
          isDragging: true,
          type: 'PROP',
          id: prop.id,
          startX: e.clientX,
          startY: e.clientY,
          originalX: prop.translateX,
          originalY: prop.translateY
      });
  };

  const handleSvgMouseMove = (e: React.MouseEvent) => {
      if (!dragState || !dragState.isDragging) return;
      
      const svgPoint = getSvgPoint(e.clientX, e.clientY);

      // --- PROP DRAGGING ---
      if (dragState.type === 'PROP' && selectedPropId && dragState.originalX !== undefined) {
          const startPt = getSvgPoint(dragState.startX, dragState.startY);
          const dx = svgPoint.x - startPt.x;
          const dy = svgPoint.y - startPt.y;

          // Update the Moved Prop
          const updatedProps = props.map(p => {
              if (p.id === selectedPropId) {
                  return {
                      ...p,
                      translateX: dragState.originalX! + dx,
                      translateY: dragState.originalY! + dy
                  };
              }
              return p;
          });

          setProps(updatedProps);
          updateKeyframeProps(updatedProps);
          
          // --- IK Follow for Attached Hands ---
          const movingProp = updatedProps.find(p => p.id === selectedPropId);
          if (movingProp) {
              const attachedHands = Object.entries(attachments)
                  .filter(([_, info]) => info.propId === movingProp.id);
              
              if (attachedHands.length > 0) {
                  let newPose = { ...currentPose };
                  
                  attachedHands.forEach(([handId, info]) => {
                      const snapGlobal = transformPoint(
                          movingProp.snapPoints.find(sp => sp.id === info.snapPointId)?.x || 0,
                          movingProp.snapPoints.find(sp => sp.id === info.snapPointId)?.y || 0,
                          movingProp
                      );

                      // 1. Position IK
                      const chain = IK_CHAINS[handId];
                      if (chain) {
                          const ikResult = solveTwoBoneIK(chain.upper, chain.lower, snapGlobal, newPose);
                          if (ikResult) {
                              Object.assign(newPose, ikResult);
                          }
                      }

                      // 2. Rotation Sync (Hand Grips Prop)
                      const handBoneDef = SKELETON_DEF.find(b => b.id === handId);
                      if(handBoneDef && handBoneDef.parentId) {
                          const parentGlobal = getGlobalTransform(handBoneDef.parentId, newPose);
                          const offset = info.rotationOffset || 0;
                          const targetHandGlobal = movingProp.rotation + offset; 
                          const targetHandLocal = normalizeAngle(targetHandGlobal - parentGlobal.angle);
                          newPose[handId as BodyPartType] = targetHandLocal;
                      }
                  });

                  setCurrentPose(newPose);
                  setKeyframes(prev => prev.map(kf => {
                      if (kf.id === currentFrameId) {
                          return { ...kf, pose: newPose };
                      }
                      return kf;
                  }));
              }
          }
          return;
      }

      // --- BONE DRAGGING (IK / ROTATION) ---
      if (dragState.type === 'BONE' && selectedBoneId) {
          const boneId = selectedBoneId;
          let newPose = { ...currentPose };
          let affectedBones: BodyPartType[] = [];
          let newAttachments = { ...attachments };
          
          // 1. Check if it's an IK Chain End Effector (Hand/Foot)
          if (IK_CHAINS[boneId]) {
              const chain = IK_CHAINS[boneId];
              let targetPos = svgPoint;

              // --- Snap Logic (Only for hands) ---
              if (boneId.includes('HAND')) {
                  let nearestDist = Infinity;
                  let nearestSnapPos = svgPoint;
                  let nearestInfo: { propId: string, snapId: string } | null = null;

                  props.forEach(prop => {
                      prop.snapPoints.forEach(sp => {
                          const globalSp = transformPoint(sp.x, sp.y, prop);
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
                           const anchorPos = transformPoint(attachedSp.x, attachedSp.y, attachedProp);
                           const distFromAnchor = Math.sqrt(Math.pow(anchorPos.x - svgPoint.x, 2) + Math.pow(anchorPos.y - svgPoint.y, 2));
                           
                           if (distFromAnchor > UNSNAP_THRESHOLD) {
                               delete newAttachments[boneId];
                               targetPos = svgPoint; // Free movement
                           } else {
                               if (isDumbbell) {
                                   targetPos = svgPoint; // Prop follows hand
                               } else {
                                   targetPos = anchorPos; // Hand locked to prop
                               }
                           }
                      }
                  } else {
                      if (nearestDist < SNAP_THRESHOLD && nearestInfo) {
                          targetPos = nearestSnapPos;
                          const handGlobal = getGlobalTransform(boneId, currentPose);
                          const prop = props.find(p => p.id === nearestInfo!.propId)!;
                          const offset = normalizeAngle(handGlobal.angle - prop.rotation);

                          newAttachments[boneId] = { 
                              propId: nearestInfo.propId, 
                              snapPointId: nearestInfo.snapId,
                              rotationOffset: offset
                          };
                      }
                  }
              }

              const ikResult = solveTwoBoneIK(chain.upper, chain.lower, targetPos, currentPose);
              if (ikResult) {
                  newPose = { ...newPose, ...ikResult };
                  affectedBones.push(chain.upper, chain.lower);
              }
          } 
          // 2. Standard Rotation
          else {
             const boneDef = SKELETON_DEF.find(b => b.id === boneId);
             if (boneDef && boneDef.parentId) {
                 const parentGlobal = getGlobalTransform(boneDef.parentId, currentPose);
                 const dx = svgPoint.x - parentGlobal.x;
                 const dy = svgPoint.y - parentGlobal.y;
                 const targetGlobalAngle = toDegrees(Math.atan2(dy, dx));
                 const targetGlobalSvg = targetGlobalAngle - 90;
                 const localAngle = normalizeAngle(targetGlobalSvg - parentGlobal.angle);
                 newPose[boneId] = localAngle;
                 affectedBones.push(boneId);
             }
          }

          // 3. Apply Mirroring
          if (isMirrorMode) {
              affectedBones.forEach(sourceId => {
                  const mirrorId = MIRROR_MAPPING[sourceId];
                  if (mirrorId && newPose[sourceId] !== undefined) {
                      newPose[mirrorId] = -newPose[sourceId];
                  }
              });
          }

          // 4. Sync Dumbbells
          const syncedProps = syncDumbbells(props, newPose, newAttachments);
          if (syncedProps !== props) {
              setProps(syncedProps);
              updateKeyframeProps(syncedProps);
          }

          setCurrentPose(newPose);
          setAttachments(newAttachments);
          setKeyframes(prev => prev.map(kf => {
              if (kf.id === currentFrameId) {
                  // If syncedProps updated, we've already handled it via updateKeyframeProps logic
                  // But we need to ensure we update the pose too.
                  // Ideally updateKeyframeProps and this setKeyframes should be merged, but since state updates are batched, 
                  // we just need to make sure we don't overwrite propTransforms with old data.
                  // To keep it simple, we rely on the fact that 'syncedProps' is up to date.
                  
                  const transforms = kf.propTransforms || {};
                  if (syncedProps !== props) {
                      syncedProps.forEach(p => {
                         transforms[p.id] = {
                              translateX: p.translateX,
                              translateY: p.translateY,
                              rotation: p.rotation,
                              scaleX: p.scaleX,
                              scaleY: p.scaleY
                         };
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

    const updatePose = (pose: SkeletonState, id: BodyPartType, a: number) => {
        const p = { ...pose, [id]: a };
        if (isMirrorMode) {
            const mirrorId = MIRROR_MAPPING[id];
            if (mirrorId) {
                p[mirrorId] = -a;
            }
        }
        return p;
    };

    const newPose = updatePose(currentPose, selectedBoneId, angle);
    setCurrentPose(newPose);

    const syncedProps = syncDumbbells(props, newPose, attachments);
    if (syncedProps !== props) {
        setProps(syncedProps);
        updateKeyframeProps(syncedProps);
    }

    if (attachments[selectedBoneId]) {
         const att = attachments[selectedBoneId];
         const handGlobal = getGlobalTransform(selectedBoneId, newPose);
         const prop = syncedProps.find(p => p.id === att.propId);
         if (prop) {
             const newOffset = normalizeAngle(handGlobal.angle - prop.rotation);
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
                 transforms[p.id] = {
                      translateX: p.translateX,
                      translateY: p.translateY,
                      rotation: p.rotation,
                      scaleX: p.scaleX,
                      scaleY: p.scaleY
                 };
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
      pose: { ...currentFrame.pose }, // Copy previous pose
      propTransforms: { ...currentFrame.propTransforms } // Copy previous props
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

  // Helper to register a new prop to state and keyframes
  const registerNewProp = (newProp: GymProp) => {
      setProps(prev => [...prev, newProp]);
      // Backfill all keyframes (or at least current) with this prop to ensure it exists in animation
      setKeyframes(prev => prev.map(kf => ({
          ...kf,
          propTransforms: {
              ...kf.propTransforms,
              [newProp.id]: {
                  translateX: newProp.translateX,
                  translateY: newProp.translateY,
                  rotation: newProp.rotation,
                  scaleX: newProp.scaleX,
                  scaleY: newProp.scaleY
              }
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
        path: result.path,
        viewBox: result.viewBox,
        scaleX: 1,
        scaleY: 1,
        translateX: 200,
        translateY: 350,
        attachedTo: null,
        rotation: 0,
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
        path: preset.path,
        viewBox: preset.viewBox,
        scaleX: 1,
        scaleY: 1,
        translateX: 200,
        translateY: 350,
        attachedTo: null,
        rotation: preset.rotation || 0,
        snapPoints: preset.snapPoints || [],
        color: preset.color
      };
      registerNewProp(newProp);
  };

  const handleDeleteProp = () => {
      if (selectedPropId) {
          const newAttachments = { ...attachments };
          Object.keys(newAttachments).forEach(key => {
              if (newAttachments[key].propId === selectedPropId) {
                  delete newAttachments[key];
              }
          });
          setAttachments(newAttachments);

          setProps(props.filter(p => p.id !== selectedPropId));
          // Prop remains in keyframe data as junk, or we could clean it up.
          // For now, not cleaning up keyframes is safer to avoid history issues, but strictly we should:
          /*
          setKeyframes(prev => prev.map(kf => {
              const newTrans = { ...kf.propTransforms };
              delete newTrans[selectedPropId];
              return { ...kf, propTransforms: newTrans };
          }));
          */
          setSelectedPropId(null);
      }
  };

  const handlePropUpdate = (updatedProps: GymProp[]) => {
      setProps(updatedProps);
      updateKeyframeProps(updatedProps);
  };

  const handleExport = () => exportAnimation(keyframes, props);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 text-gray-100 overflow-hidden">
      <Header 
        isMirrorMode={isMirrorMode}
        setIsMirrorMode={setIsMirrorMode}
        onExport={handleExport}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar 
            selectedBoneId={selectedBoneId}
            selectedPropId={selectedPropId}
            currentPose={currentPose}
            props={props}
            setProps={handlePropUpdate} // Use wrapper to sync keyframes
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
            isMirrorMode={isMirrorMode}
            onBoneMouseDown={handleBoneMouseDown}
            onPropMouseDown={handlePropMouseDown}
            onSvgMouseMove={handleSvgMouseMove}
            onSvgMouseUp={handleSvgMouseUp}
            onClearSelection={() => {
                setSelectedBoneId(null);
                setSelectedPropId(null);
            }}
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