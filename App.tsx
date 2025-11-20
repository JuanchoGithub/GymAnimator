import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Character from './components/Character';
import Timeline from './components/Timeline';
import { BodyPartType, Keyframe, SkeletonState, GymProp } from './types';
import { INITIAL_POSE, SAMPLE_PROPS, SKELETON_DEF, MIRROR_MAPPING, IK_CHAINS } from './constants';
import { generatePropSvg } from './services/geminiService';
import { getGlobalTransform, solveTwoBoneIK, toDegrees, normalizeAngle } from './utils';

const App: React.FC = () => {
  // --- State ---
  const [keyframes, setKeyframes] = useState<Keyframe[]>([
    { id: uuidv4(), duration: 500, pose: { ...INITIAL_POSE } }
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

  // --- Effects ---
  // Sync currentPose with selected frame when not playing
  useEffect(() => {
    if (!isPlaying) {
      const frame = getCurrentFrame();
      if (frame) {
        setCurrentPose(frame.pose);
      }
    }
  }, [currentFrameId, isPlaying, keyframes]);

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

        const interpolatedPose: SkeletonState = {} as SkeletonState;
        Object.keys(currentKeyframe.pose).forEach((key) => {
            const k = key as BodyPartType;
            const startAngle = currentKeyframe.pose[k];
            const endAngle = nextKeyframe.pose[k];
            interpolatedPose[k] = startAngle + (endAngle - startAngle) * progress;
        });
        setCurrentPose(interpolatedPose);
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

          setProps(prevProps => prevProps.map(p => {
              if (p.id === selectedPropId) {
                  return {
                      ...p,
                      translateX: dragState.originalX! + dx,
                      translateY: dragState.originalY! + dy
                  };
              }
              return p;
          }));
          return;
      }

      // --- BONE DRAGGING (IK / ROTATION) ---
      if (dragState.type === 'BONE' && selectedBoneId) {
          const boneId = selectedBoneId;
          let newPose = { ...currentPose };
          let affectedBones: BodyPartType[] = [];

          // 1. Check if it's an IK Chain End Effector (Hand/Foot)
          if (IK_CHAINS[boneId]) {
              const chain = IK_CHAINS[boneId];
              const ikResult = solveTwoBoneIK(chain.upper, chain.lower, svgPoint, currentPose);
              
              if (ikResult) {
                  newPose = { ...newPose, ...ikResult };
                  affectedBones.push(chain.upper, chain.lower);
              }
          } 
          // 2. Standard Rotation for other bones (Look At Mouse)
          else {
             const boneDef = SKELETON_DEF.find(b => b.id === boneId);
             if (boneDef && boneDef.parentId) {
                 // Get Global Transform of Parent (The pivot of current bone)
                 const parentGlobal = getGlobalTransform(boneDef.parentId, currentPose);
                 
                 // Calculate Angle from Pivot to Mouse
                 const dx = svgPoint.x - parentGlobal.x;
                 const dy = svgPoint.y - parentGlobal.y;
                 const targetGlobalAngle = toDegrees(Math.atan2(dy, dx));
                 
                 // SVG bones point down (+Y, 90 deg math). 
                 // So if target is at Math 90 (Down), we want Rotation 0.
                 // Rotation = Target - 90.
                 const targetGlobalSvg = targetGlobalAngle - 90;

                 // Convert to Local
                 const localAngle = normalizeAngle(targetGlobalSvg - parentGlobal.angle);
                 
                 newPose[boneId] = localAngle;
                 affectedBones.push(boneId);
             }
          }

          // 3. Apply Mirroring
          if (isMirrorMode) {
              // We iterate through bones that were changed this frame
              affectedBones.forEach(sourceId => {
                  const mirrorId = MIRROR_MAPPING[sourceId];
                  if (mirrorId && newPose[sourceId] !== undefined) {
                      // For symmetric horizontal movement: Left 45 -> Right -45
                      newPose[mirrorId] = -newPose[sourceId];
                  }
              });
          }

          // Update Real-time Pose
          setCurrentPose(newPose);

          // Update Keyframe
          setKeyframes(prev => prev.map(kf => {
              if (kf.id === currentFrameId) {
                  return { ...kf, pose: newPose };
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

    setKeyframes(keyframes.map(kf => {
      if (kf.id === currentFrameId) {
        return { ...kf, pose: newPose };
      }
      return kf;
    }));
  };

  const handleAddFrame = () => {
    const currentFrame = getCurrentFrame();
    const newFrame: Keyframe = {
      id: uuidv4(),
      duration: 500,
      pose: { ...currentFrame.pose } // Copy previous pose
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
        scale: 1,
        translateX: 200,
        translateY: 350,
        attachedTo: null,
        color: '#cccccc'
      };
      setProps([...props, newProp]);
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
        scale: 1,
        translateX: 200,
        translateY: 350,
        attachedTo: null,
        color: preset.color
      };
      setProps([...props, newProp]);
  };

  const handleDeleteProp = () => {
      if (selectedPropId) {
          setProps(props.filter(p => p.id !== selectedPropId));
          setSelectedPropId(null);
      }
  };

  const handleExport = () => {
    let css = `@keyframes gymAnim {`;
    let accumulatedTime = 0;
    const totalDuration = keyframes.reduce((sum, k) => sum + k.duration, 0);

    keyframes.forEach((kf) => {
        const percentage = (accumulatedTime / totalDuration) * 100;
        css += `\n  ${percentage.toFixed(1)}% {`;
        Object.entries(kf.pose).forEach(([boneId, angle]) => {
            css += ` --angle-${boneId}: ${angle}deg;`;
        });
        css += ` }`;
        accumulatedTime += kf.duration;
    });
    css += `\n  100% {`;
        Object.entries(keyframes[0].pose).forEach(([boneId, angle]) => {
            css += ` --angle-${boneId}: ${angle}deg;`;
        });
    css += ` }\n}`;

    const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" style="background:#f3f4f6">
  <style>
    ${css}
    .skeleton-rig {
        animation: gymAnim ${totalDuration}ms linear infinite;
    }
  </style>
  ${document.getElementById('export-target')?.innerHTML}
</svg>
    `;
    
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gym-animation.svg';
    a.click();
  };

  const activeBoneDef = SKELETON_DEF.find(b => b.id === selectedBoneId);
  const activeProp = props.find(p => p.id === selectedPropId);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 text-gray-100 overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-gray-800 border-b border-gray-700 flex items-center px-4 justify-between">
        <div className="flex items-center space-x-2">
            <span className="material-icons-round text-yellow-500">fitness_center</span>
            <h1 className="text-lg font-bold tracking-wide">GymAnimator</h1>
        </div>
        
        <div className="flex items-center space-x-4">
            {/* Mirror Toggle */}
             <label className="flex items-center space-x-2 text-sm cursor-pointer select-none bg-gray-900 px-3 py-1.5 rounded border border-gray-700 hover:border-gray-600 transition-colors">
                <input 
                    type="checkbox" 
                    checked={isMirrorMode} 
                    onChange={(e) => setIsMirrorMode(e.target.checked)}
                    className="w-4 h-4 rounded text-yellow-500 focus:ring-0 bg-gray-700 border-gray-600"
                />
                <span className={isMirrorMode ? "text-yellow-400 font-semibold" : "text-gray-400"}>Mirror Mode</span>
            </label>

            <button 
                onClick={handleExport}
                className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 px-4 py-1.5 rounded font-semibold text-sm flex items-center transition-colors"
            >
                <span className="material-icons-round text-sm mr-2">download</span> Export SVG
            </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Props & Tools */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 flex flex-col space-y-6 overflow-y-auto">
            
            {/* Bone Controls */}
            <div className="p-3 bg-gray-900 rounded-lg border border-gray-700">
                <h2 className="text-xs font-bold text-gray-400 uppercase mb-3">Selection Control</h2>
                
                {activeBoneDef ? (
                    <div className="space-y-3">
                         <div className="flex justify-between text-sm items-center">
                            <span className="text-blue-400 font-semibold">{activeBoneDef.name}</span>
                            <span className="font-mono text-yellow-500 bg-gray-800 px-2 rounded">
                                {currentPose[activeBoneDef.id]?.toFixed(0)}°
                            </span>
                        </div>
                        <input 
                            type="range"
                            min="-180"
                            max="180"
                            value={currentPose[activeBoneDef.id] || 0}
                            onChange={(e) => handleRotationChange(Number(e.target.value))}
                            className="w-full accent-yellow-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-gray-500">
                            <span>Rotation</span>
                            {isMirrorMode && MIRROR_MAPPING[activeBoneDef.id] && <span className="text-yellow-500">Mirrored</span>}
                        </div>
                    </div>
                ) : activeProp ? (
                     <div className="space-y-3">
                         <div className="flex justify-between text-sm items-center">
                            <span className="text-green-400 font-semibold truncate pr-2">{activeProp.name}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                             <div>
                                <label className="text-[10px] text-gray-500">X</label>
                                <input 
                                    type="number" 
                                    value={Math.round(activeProp.translateX)}
                                    onChange={(e) => setProps(props.map(p => p.id === activeProp.id ? {...p, translateX: Number(e.target.value)} : p))}
                                    className="w-full bg-gray-800 text-xs text-gray-200 border border-gray-600 rounded px-1 py-1 focus:border-yellow-500 outline-none"
                                />
                             </div>
                             <div>
                                <label className="text-[10px] text-gray-500">Y</label>
                                <input 
                                    type="number" 
                                    value={Math.round(activeProp.translateY)}
                                    onChange={(e) => setProps(props.map(p => p.id === activeProp.id ? {...p, translateY: Number(e.target.value)} : p))}
                                    className="w-full bg-gray-800 text-xs text-gray-200 border border-gray-600 rounded px-1 py-1 focus:border-yellow-500 outline-none"
                                />
                             </div>
                        </div>

                        <button 
                            onClick={handleDeleteProp}
                            className="w-full py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs rounded border border-red-900/50 transition-colors flex items-center justify-center mt-2"
                        >
                            <span className="material-icons-round text-sm mr-1">delete</span> Delete Prop
                        </button>
                    </div>
                ) : (
                    <div className="text-sm text-gray-500 italic text-center py-2">
                        <p>Drag limbs to pose.</p>
                        <p className="mt-1 text-xs text-gray-600">Hands & Feet use IK.</p>
                    </div>
                )}
            </div>

            {/* Props Generation */}
            <div className="p-3 bg-gray-900 rounded-lg border border-gray-700 flex-1 flex flex-col">
                <h2 className="text-xs font-bold text-gray-400 uppercase mb-3">Props Library</h2>
                
                <div className="flex flex-wrap gap-2 mb-4">
                    {SAMPLE_PROPS.map(p => (
                        <button 
                            key={p.id}
                            onClick={() => handleAddPresetProp(p)}
                            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs border border-gray-600 text-gray-300 transition-colors"
                        >
                            + {p.name}
                        </button>
                    ))}
                </div>

                <div className="mt-auto border-t border-gray-700 pt-3">
                     <label className="text-[10px] text-gray-400 mb-1 block">AI Generator (Gemini)</label>
                     <textarea
                        className="w-full bg-gray-800 text-sm p-2 rounded border border-gray-600 mb-2 focus:border-yellow-500 focus:outline-none resize-none text-gray-200 placeholder-gray-600"
                        rows={2}
                        placeholder="e.g., A red kettlebell"
                        value={propPrompt}
                        onChange={(e) => setPropPrompt(e.target.value)}
                     />
                     <button 
                        onClick={handleGenerateProp}
                        disabled={isGenerating || !propPrompt}
                        className={`w-full py-1.5 rounded text-xs font-semibold flex justify-center items-center transition-colors
                            ${isGenerating ? 'bg-gray-700 cursor-not-allowed text-gray-500' : 'bg-blue-600 hover:bg-blue-500 text-white'}
                        `}
                     >
                        {isGenerating ? <span className="material-icons-round animate-spin text-sm">refresh</span> : 'Generate SVG'}
                     </button>
                </div>
            </div>
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 bg-[#111827] relative flex items-center justify-center overflow-hidden">
           {/* Grid Background */}
           <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
           </div>

           {/* SVG Canvas */}
           <div className="bg-white/5 border border-white/10 rounded-lg shadow-2xl backdrop-blur-sm">
                <svg 
                    ref={svgRef}
                    width="400" 
                    height="500" 
                    viewBox="0 0 400 500"
                    className="select-none"
                    style={{ cursor: dragState?.isDragging ? 'grabbing' : 'default' }}
                    id="export-target"
                    onMouseDown={() => {
                        setSelectedBoneId(null);
                        setSelectedPropId(null);
                    }}
                    onMouseMove={handleSvgMouseMove}
                    onMouseUp={handleSvgMouseUp}
                    onMouseLeave={handleSvgMouseUp}
                >
                    <defs>
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Character */}
                    <Character 
                        pose={currentPose}
                        selectedBoneId={selectedBoneId}
                        onSelectBone={handleBoneMouseDown}
                    />

                    {/* Render Props Layer (Front) */}
                    {props.map(prop => {
                        const isSelected = selectedPropId === prop.id;
                        return (
                            <g 
                                key={prop.id} 
                                transform={`translate(${prop.translateX}, ${prop.translateY}) scale(${prop.scale})`}
                                onMouseDown={(e) => handlePropMouseDown(e, prop)}
                                style={{ cursor: dragState?.isDragging && isSelected ? 'grabbing' : 'grab' }}
                                className="group"
                            >
                                {/* Halo/Selection Indicator */}
                                {isSelected && (
                                    <path 
                                        d={prop.path} 
                                        fill="none" 
                                        stroke="#facc15" 
                                        strokeWidth="4" 
                                        opacity="0.5"
                                    />
                                )}
                                
                                {/* The Prop */}
                                <path 
                                    d={prop.path} 
                                    fill={prop.color} 
                                    stroke={isSelected ? "white" : "none"}
                                    strokeWidth={isSelected ? 1 : 0}
                                    className="transition-opacity hover:opacity-90"
                                />

                                {/* Pivot Point (visible when selected) */}
                                {isSelected && (
                                    <circle r="3" fill="#facc15" stroke="black" strokeWidth="1" />
                                )}
                            </g>
                        );
                    })}
                </svg>
           </div>
           
           <div className="absolute bottom-4 right-4 text-gray-500 text-xs font-mono flex flex-col items-end space-y-1 pointer-events-none">
               <span>{isPlaying ? 'PLAYING' : 'EDIT MODE'}</span>
               {dragState?.isDragging && <span className="text-yellow-500 font-bold">DRAGGING</span>}
               {isMirrorMode && <span className="text-blue-400">MIRROR: ON</span>}
           </div>
        </div>
      </div>

      {/* Bottom: Timeline */}
      <div className="h-48">
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
        />
      </div>
    </div>
  );
};

export default App;