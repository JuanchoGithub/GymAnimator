import React from 'react';
import { BodyPartType, GymProp, SkeletonState } from '../types';
import { SKELETON_DEF, SAMPLE_PROPS, MIRROR_MAPPING } from '../constants';

interface SidebarProps {
  selectedBoneId: BodyPartType | null;
  selectedPropId: string | null;
  currentPose: SkeletonState;
  props: GymProp[];
  setProps: React.Dispatch<React.SetStateAction<GymProp[]>>;
  attachments: Record<string, { propId: string; snapPointId: string; rotationOffset: number }>;
  onRotationChange: (angle: number) => void;
  onDetachBone: (boneId: string) => void;
  onDeleteProp: (id?: string) => void;
  onAddPresetProp: (preset: any) => void;
  onGenerateProp: () => void;
  isGenerating: boolean;
  propPrompt: string;
  setPropPrompt: (val: string) => void;
  isMirrorMode: boolean;
  onSelectProp: (id: string) => void;
  armsInFront: boolean;
  setArmsInFront: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedBoneId,
  selectedPropId,
  currentPose,
  props,
  setProps,
  attachments,
  onRotationChange,
  onDetachBone,
  onDeleteProp,
  onAddPresetProp,
  onGenerateProp,
  isGenerating,
  propPrompt,
  setPropPrompt,
  isMirrorMode,
  onSelectProp,
  armsInFront,
  setArmsInFront
}) => {
  const activeBoneDef = SKELETON_DEF.find(b => b.id === selectedBoneId);
  const activeProp = props.find(p => p.id === selectedPropId);

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 flex flex-col space-y-6 overflow-y-auto">
        
        {/* Scene Objects List */}
        <div className="p-3 bg-gray-900 rounded-lg border border-gray-700 max-h-48 overflow-y-auto">
             <h2 className="text-xs font-bold text-gray-400 uppercase mb-2 sticky top-0 bg-gray-900 z-10">Scene Objects</h2>
             {props.length === 0 ? (
                 <div className="text-[10px] text-gray-600 italic">No objects in scene</div>
             ) : (
                 <ul className="space-y-1">
                     {props.map(p => (
                         <li 
                            key={p.id} 
                            className={`text-xs flex items-center justify-between px-2 py-1 rounded cursor-pointer hover:bg-gray-700 ${selectedPropId === p.id ? 'bg-gray-700 text-white font-semibold border-l-2 border-yellow-500' : 'text-gray-400'}`}
                            onClick={() => onSelectProp(p.id)}
                         >
                             <span className="truncate">{p.name}</span>
                             <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteProp(p.id); }}
                                className="text-gray-500 hover:text-red-400"
                             >
                                 <span className="material-icons-round text-[10px]">close</span>
                             </button>
                         </li>
                     ))}
                 </ul>
             )}
        </div>

        {/* Bone/Prop Selection Controls */}
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
                        onChange={(e) => onRotationChange(Number(e.target.value))}
                        className="w-full accent-yellow-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500">
                        <span>Rotation</span>
                        {isMirrorMode && MIRROR_MAPPING[activeBoneDef.id] && <span className="text-yellow-500">Mirrored</span>}
                    </div>

                    {/* Arm Layering Toggle */}
                    {selectedBoneId && (selectedBoneId.includes('ARM') || selectedBoneId.includes('HAND')) && (
                         <div className="mt-4 pt-3 border-t border-gray-700">
                             <label className="flex items-center space-x-2 cursor-pointer">
                                 <input 
                                    type="checkbox" 
                                    checked={armsInFront}
                                    onChange={(e) => setArmsInFront(e.target.checked)}
                                    className="w-4 h-4 rounded text-blue-500 focus:ring-0 bg-gray-700 border-gray-600"
                                 />
                                 <span className="text-xs text-gray-300">Show Arms In Front</span>
                             </label>
                         </div>
                    )}

                    {/* Detach Logic for Bone */}
                    {attachments[activeBoneDef.id] && (
                         <div className="mt-4 pt-3 border-t border-gray-700">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-green-400 font-semibold flex items-center">
                                    <span className="material-icons-round text-sm mr-1">link</span>
                                    Attached
                                </span>
                            </div>
                            <div className="text-[10px] text-gray-400 mb-2 bg-gray-800 p-2 rounded">
                                {(() => {
                                    const att = attachments[activeBoneDef.id];
                                    const p = props.find(prop => prop.id === att.propId);
                                    const sp = p?.snapPoints.find(s => s.id === att.snapPointId);
                                    return `${p?.name || 'Unknown'} (${sp?.name || 'Point'})`;
                                })()}
                            </div>
                            <button 
                                onClick={() => onDetachBone(activeBoneDef.id)}
                                className="w-full py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded border border-gray-500 transition-colors"
                            >
                                Detach
                            </button>
                         </div>
                    )}
                </div>
            ) : activeProp ? (
                 <div className="space-y-4">
                     <div className="flex justify-between text-sm items-center border-b border-gray-800 pb-2">
                        <span className="text-green-400 font-semibold truncate pr-2">{activeProp.name}</span>
                    </div>

                    {/* Cable Flip Toggle */}
                    {activeProp.name.toLowerCase().includes('cable') && (
                        <div className="flex items-center justify-between">
                             <span className="text-[10px] text-gray-400">Orientation</span>
                             <label className="flex items-center space-x-1 cursor-pointer text-xs">
                                 <input 
                                    type="checkbox" 
                                    checked={activeProp.scaleY < 0}
                                    onChange={(e) => {
                                        const sign = e.target.checked ? -1 : 1;
                                        setProps(props.map(p => p.id === activeProp.id ? {...p, scaleY: Math.abs(p.scaleY) * sign} : p));
                                    }}
                                    className="rounded bg-gray-700 border-gray-600 text-yellow-500 focus:ring-0"
                                 />
                                 <span className="text-gray-300">Flip Vertical</span>
                             </label>
                        </div>
                    )}
                    
                    {/* Position X */}
                    <div>
                        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                            <span>Position X</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input 
                                type="range"
                                min="-100"
                                max="500"
                                value={activeProp.translateX}
                                onChange={(e) => setProps(props.map(p => p.id === activeProp.id ? {...p, translateX: Number(e.target.value)} : p))}
                                className="flex-1 accent-yellow-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <input 
                                type="number" 
                                value={Math.round(activeProp.translateX)}
                                onChange={(e) => setProps(props.map(p => p.id === activeProp.id ? {...p, translateX: Number(e.target.value)} : p))}
                                className="w-12 bg-gray-800 text-[10px] text-gray-200 border border-gray-600 rounded px-1 py-0.5 text-center focus:border-yellow-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Position Y */}
                    <div>
                        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                            <span>Position Y</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input 
                                type="range"
                                min="-100"
                                max="600"
                                value={activeProp.translateY}
                                onChange={(e) => setProps(props.map(p => p.id === activeProp.id ? {...p, translateY: Number(e.target.value)} : p))}
                                className="flex-1 accent-yellow-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <input 
                                type="number" 
                                value={Math.round(activeProp.translateY)}
                                onChange={(e) => setProps(props.map(p => p.id === activeProp.id ? {...p, translateY: Number(e.target.value)} : p))}
                                className="w-12 bg-gray-800 text-[10px] text-gray-200 border border-gray-600 rounded px-1 py-0.5 text-center focus:border-yellow-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Rotation */}
                    <div>
                        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                            <span>Rotation</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input 
                                type="range"
                                min="-180"
                                max="180"
                                value={activeProp.rotation}
                                onChange={(e) => setProps(props.map(p => p.id === activeProp.id ? {...p, rotation: Number(e.target.value)} : p))}
                                className="flex-1 accent-yellow-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <input 
                                type="number" 
                                value={Math.round(activeProp.rotation)}
                                onChange={(e) => setProps(props.map(p => p.id === activeProp.id ? {...p, rotation: Number(e.target.value)} : p))}
                                className="w-12 bg-gray-800 text-[10px] text-gray-200 border border-gray-600 rounded px-1 py-0.5 text-center focus:border-yellow-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Scale */}
                    <div>
                        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                            <span>Scale</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input 
                                type="range"
                                min="0.1"
                                max="3.0"
                                step="0.1"
                                value={Math.abs(activeProp.scaleX)}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    const signY = activeProp.scaleY < 0 ? -1 : 1;
                                    setProps(props.map(p => p.id === activeProp.id ? {...p, scaleX: val, scaleY: val * signY} : p));
                                }}
                                className="flex-1 accent-yellow-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <input 
                                type="number" 
                                step="0.1"
                                value={Math.abs(activeProp.scaleX)}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    const signY = activeProp.scaleY < 0 ? -1 : 1;
                                    setProps(props.map(p => p.id === activeProp.id ? {...p, scaleX: val, scaleY: val * signY} : p));
                                }}
                                className="w-12 bg-gray-800 text-[10px] text-gray-200 border border-gray-600 rounded px-1 py-0.5 text-center focus:border-yellow-500 outline-none"
                            />
                        </div>
                    </div>

                    <button 
                        onClick={() => onDeleteProp(activeProp.id)}
                        className="w-full py-2 mt-4 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs rounded border border-red-900/50 transition-colors flex items-center justify-center"
                    >
                        <span className="material-icons-round text-sm mr-1">delete</span> Delete Prop
                    </button>

                    {/* Attached Hands List */}
                    {(() => {
                         const attachedHands = Object.entries(attachments).filter(([_, info]) => info.propId === activeProp.id);
                         if (attachedHands.length > 0) {
                             return (
                                 <div className="mt-4 pt-3 border-t border-gray-700">
                                     <div className="text-xs font-bold text-gray-400 mb-2 flex items-center">
                                        <span className="material-icons-round text-sm mr-1">link</span> Attached Hands
                                     </div>
                                     <div className="space-y-1.5">
                                         {attachedHands.map(([boneId, info]) => {
                                             const boneName = SKELETON_DEF.find(b => b.id === boneId)?.name || boneId;
                                             const snapName = activeProp.snapPoints.find(sp => sp.id === info.snapPointId)?.name || 'Point';
                                             return (
                                                 <div key={boneId} className="flex items-center justify-between bg-gray-800 p-2 rounded border border-gray-600">
                                                     <div className="flex flex-col">
                                                         <span className="text-xs text-gray-200">{boneName}</span>
                                                         <span className="text-[10px] text-gray-500">{snapName}</span>
                                                     </div>
                                                     <button 
                                                         onClick={() => onDetachBone(boneId)}
                                                         className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                                                         title="Detach"
                                                     >
                                                         <span className="material-icons-round text-sm">link_off</span>
                                                     </button>
                                                 </div>
                                             );
                                         })}
                                     </div>
                                 </div>
                             );
                         }
                         return null;
                    })()}

                </div>
            ) : (
                <div className="text-sm text-gray-500 italic text-center py-2">
                    <p>Drag limbs to pose.</p>
                    <p className="mt-1 text-xs text-gray-600">Hands & Feet use IK.</p>
                </div>
            )}
        </div>

        {/* Props Library */}
        <div className="p-3 bg-gray-900 rounded-lg border border-gray-700 flex-1 flex flex-col">
            <h2 className="text-xs font-bold text-gray-400 uppercase mb-3">Props Library</h2>
            
            <div className="flex flex-wrap gap-2 mb-4">
                {SAMPLE_PROPS.map(p => (
                    <button 
                        key={p.name}
                        onClick={() => onAddPresetProp(p)}
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
                    onClick={onGenerateProp}
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
  );
};