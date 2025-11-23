
import React, { useState } from 'react';
import { BodyPartType, GymProp, SkeletonState, PropViewTransform, Appearance, ViewType, MuscleGroup, ExerciseData } from '../types';
import { SKELETON_DEF, SAMPLE_PROPS, MIRROR_MAPPING, getCablePath } from '../constants';
import { synchronizePropViews } from '../utils';

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
  onSelectBone: (id: BodyPartType, e: React.MouseEvent) => void;
  armsInFront: boolean;
  setArmsInFront: (val: boolean) => void;
  activeView?: ViewType;
  appearance: Appearance;
  setAppearance: React.Dispatch<React.SetStateAction<Appearance>>;
  activeMuscles?: MuscleGroup[];
  onToggleMuscle?: (muscle: MuscleGroup) => void;
  
  // Exercise Management
  exerciseName: string;
  setExerciseName: (val: string) => void;
  onNew: () => void;
  onSave: () => void;
  onLoad: (id: string) => void;
  onDeleteExercise: (id: string) => void;
  savedExercises: ExerciseData[];
}

const CollapsibleSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border border-gray-700 rounded-lg bg-gray-900 overflow-hidden flex-shrink-0">
            <button 
                className="w-full px-3 py-2 bg-gray-800 flex items-center justify-between text-xs font-bold text-gray-300 hover:bg-gray-750 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{title.toUpperCase()}</span>
                <span className="material-icons-round text-sm">{isOpen ? 'expand_less' : 'expand_more'}</span>
            </button>
            {isOpen && <div className="p-3">{children}</div>}
        </div>
    );
};

const SkeletonTreeItem: React.FC<{
    bone: typeof SKELETON_DEF[0];
    selectedBoneId: BodyPartType | null;
    onSelectBone: (id: BodyPartType, e: React.MouseEvent) => void;
    depth: number;
}> = ({ bone, selectedBoneId, onSelectBone, depth }) => {
    const [collapsed, setCollapsed] = useState(false);
    const children = SKELETON_DEF.filter(b => b.parentId === bone.id);
    const hasChildren = children.length > 0;

    return (
        <li>
            <div 
                className={`flex items-center text-xs py-1 rounded cursor-pointer transition-colors select-none
                    ${selectedBoneId === bone.id ? 'bg-blue-900/50 text-blue-200 border border-blue-800' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}
                `}
                style={{ paddingLeft: depth === 0 ? '4px' : '0px' }} 
            >
                {/* Expand Toggle */}
                <button 
                    className={`p-0.5 mr-1 rounded hover:bg-gray-700 text-gray-500 ${!hasChildren ? 'invisible' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}
                >
                    <span className="material-icons-round text-[10px] block">
                        {collapsed ? 'chevron_right' : 'expand_more'}
                    </span>
                </button>
                
                <div className="flex items-center flex-1" onClick={(e) => onSelectBone(bone.id, e)}>
                    <span className="w-1.5 h-1.5 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: bone.color }}></span>
                    {bone.name}
                </div>
            </div>
            
            {!collapsed && hasChildren && (
                <ul className="pl-3 space-y-1 border-l border-gray-700 ml-2">
                     {children.map(child => (
                         <SkeletonTreeItem 
                            key={child.id} 
                            bone={child} 
                            selectedBoneId={selectedBoneId} 
                            onSelectBone={onSelectBone}
                            depth={depth + 1}
                         />
                     ))}
                </ul>
            )}
        </li>
    );
};

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
  isMirrorMode,
  onSelectProp,
  onSelectBone,
  armsInFront,
  setArmsInFront,
  activeView = 'FRONT',
  appearance,
  setAppearance,
  activeMuscles = [],
  onToggleMuscle = () => {},
  exerciseName,
  setExerciseName,
  onNew,
  onSave,
  onLoad,
  onDeleteExercise,
  savedExercises
}) => {
  const activeBoneDef = SKELETON_DEF.find(b => b.id === selectedBoneId);
  const activeProp = props.find(p => p.id === selectedPropId);
  const [isSkeletonCollapsed, setIsSkeletonCollapsed] = useState(false);
  const [isPropsCollapsed, setIsPropsCollapsed] = useState(false);

  // Helper to update prop transform with synchronization
  const updatePropTransform = (propId: string, view: ViewType, field: keyof PropViewTransform, value: number) => {
      const updatedProps = props.map(p => {
          if (p.id !== propId) return p;
          
          const currentTransform = p.transforms[view];
          const newTransform = { ...currentTransform, [field]: value };
          
          // Apply synchronization rules
          return synchronizePropViews(p, view, newTransform);
      });
      setProps(updatedProps);
  };
  
  const updatePropVariant = (propId: string, variant: 'default' | 'alternate') => {
      setProps(props.map(p => p.id === propId ? { ...p, variant } : p));
  };
  
  const updatePropLayer = (propId: string, layer: 'front' | 'back') => {
      setProps(props.map(p => p.id === propId ? { ...p, layer } : p));
  };

  // Helper to update prop cable config
  const updateCableConfig = (propId: string, showLine: boolean) => {
      const updatedProps = props.map(p => {
          if (p.id !== propId || !p.cableConfig) return p;
          
          const newPath = getCablePath(p.cableConfig.handleType, showLine);
          
          const newViews = { ...p.views };
          (['FRONT', 'SIDE', 'TOP'] as ViewType[]).forEach(v => {
              newViews[v] = { ...newViews[v], path: newPath };
          });

          return {
              ...p,
              cableConfig: { ...p.cableConfig, showLine },
              views: newViews
          };
      });
      setProps(updatedProps);
  };

  // Helper to toggle cable up/down (invert scaleY)
  const toggleCableDirection = (prop: GymProp) => {
      const view = activeView;
      const currentScale = prop.transforms[view].scaleY || 1;
      updatePropTransform(prop.id, view, 'scaleY', currentScale * -1);
  };

  const rootBones = SKELETON_DEF.filter(b => b.parentId === null);

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 p-2 flex flex-col gap-2 overflow-y-auto scrollbar-thin flex-shrink-0 h-full z-50">
        
        {/* PROJECT MANAGEMENT */}
        <CollapsibleSection title="Project">
             <div className="space-y-3">
                <div className="flex space-x-1">
                    <button 
                        onClick={onNew}
                        className="px-3 py-1 rounded bg-green-600 hover:bg-green-500 text-white transition-colors font-bold text-xs"
                        title="Create New Exercise"
                    >
                        NEW
                    </button>
                    <input 
                        type="text" 
                        value={exerciseName}
                        onChange={(e) => setExerciseName(e.target.value)}
                        placeholder="Exercise Name"
                        className="flex-1 bg-gray-800 text-xs text-white placeholder-gray-500 border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-blue-500 min-w-0"
                    />
                    <button 
                        onClick={onSave}
                        className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors font-bold text-xs"
                        title="Save Exercise"
                    >
                        SAVE
                    </button>
                </div>

                <div className="bg-gray-800 rounded border border-gray-700 overflow-hidden">
                    <div className="px-2 py-1 bg-gray-900 border-b border-gray-700 text-[10px] font-bold text-gray-400 uppercase">
                        Saved Exercises ({savedExercises.length})
                    </div>
                    <ul className="max-h-40 overflow-y-auto scrollbar-thin">
                        {savedExercises.length === 0 ? (
                            <li className="p-2 text-center text-gray-500 text-[10px] italic">
                                No exercises saved
                            </li>
                        ) : (
                            savedExercises.map(ex => (
                                <li key={ex.id} className="border-b border-gray-700 last:border-0 hover:bg-gray-750 group flex items-center justify-between p-1.5">
                                    <span 
                                        className="text-xs font-medium text-gray-300 truncate cursor-pointer flex-1 hover:text-blue-400 transition-colors"
                                        onClick={() => onLoad(ex.id)}
                                        title={`Load ${ex.name}`}
                                    >
                                        {ex.name}
                                    </span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onDeleteExercise(ex.id); }}
                                        className="p-0.5 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete"
                                    >
                                        <span className="material-icons-round text-[12px]">close</span>
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
             </div>
        </CollapsibleSection>

        {/* MUSCLE ACTIVATION */}
        <CollapsibleSection title="Muscle Activation" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-2">
                {Object.values(MuscleGroup).map(muscle => (
                    <label key={muscle} className="flex items-center space-x-2 cursor-pointer bg-gray-800 p-1 rounded hover:bg-gray-700 transition-colors border border-transparent hover:border-gray-600">
                        <input 
                            type="checkbox" 
                            checked={activeMuscles.includes(muscle)}
                            onChange={() => onToggleMuscle(muscle)}
                            className="w-3.5 h-3.5 rounded text-red-500 focus:ring-0 bg-gray-900 border-gray-600"
                        />
                        <span className="text-[10px] text-gray-300 font-medium">{muscle}</span>
                    </label>
                ))}
            </div>
            <div className="mt-2 text-[9px] text-gray-500 italic">
                Select muscles to pulse red for the current frame.
            </div>
        </CollapsibleSection>

        {/* APPEARANCE */}
        <CollapsibleSection title="Character & Scene">
            <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                        <label className="text-[10px] text-gray-500 mb-1">Shirt</label>
                        <input type="color" value={appearance.shirtColor} onChange={e => setAppearance({...appearance, shirtColor: e.target.value})} className="w-full h-6 rounded cursor-pointer" />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[10px] text-gray-500 mb-1">Pants</label>
                        <input type="color" value={appearance.pantsColor} onChange={e => setAppearance({...appearance, pantsColor: e.target.value})} className="w-full h-6 rounded cursor-pointer" />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[10px] text-gray-500 mb-1">Shoes</label>
                        <input type="color" value={appearance.shoesColor} onChange={e => setAppearance({...appearance, shoesColor: e.target.value})} className="w-full h-6 rounded cursor-pointer" />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[10px] text-gray-500 mb-1">Hair</label>
                        <input type="color" value={appearance.hairColor} onChange={e => setAppearance({...appearance, hairColor: e.target.value})} className="w-full h-6 rounded cursor-pointer" />
                    </div>
                     <div className="flex flex-col">
                        <label className="text-[10px] text-gray-500 mb-1">Background</label>
                        <div className="flex space-x-1">
                             <input type="color" value={appearance.backgroundColor === 'transparent' ? '#000000' : appearance.backgroundColor} onChange={e => setAppearance({...appearance, backgroundColor: e.target.value})} className="w-full h-6 rounded cursor-pointer" />
                             <button 
                                onClick={() => setAppearance({...appearance, backgroundColor: 'transparent'})}
                                className="bg-gray-700 text-[10px] px-1 rounded hover:bg-gray-600 text-white"
                                title="Transparent"
                             >
                                 TP
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        </CollapsibleSection>

        {/* SCENE HIERARCHY */}
        <CollapsibleSection title="Scene" defaultOpen={true}>
            <div className="max-h-60 overflow-y-auto pr-1">
                {/* Skeleton */}
                <div className="mb-2">
                     <div 
                        className="flex items-center cursor-pointer hover:bg-gray-800 rounded px-1 py-0.5 mb-1"
                        onClick={() => setIsSkeletonCollapsed(!isSkeletonCollapsed)}
                     >
                         <span className="material-icons-round text-sm text-gray-500 mr-1">
                             {isSkeletonCollapsed ? 'chevron_right' : 'expand_more'}
                         </span>
                         <h3 className="text-[10px] text-gray-500 uppercase font-bold select-none">Skeleton</h3>
                     </div>
                     
                     {!isSkeletonCollapsed && (
                         <ul className="pl-1 ml-1 border-l border-gray-700 space-y-1">
                             {rootBones.map(bone => (
                                 <SkeletonTreeItem 
                                    key={bone.id} 
                                    bone={bone} 
                                    selectedBoneId={selectedBoneId} 
                                    onSelectBone={onSelectBone}
                                    depth={0}
                                 />
                             ))}
                         </ul>
                     )}
                </div>
                
                {/* Props */}
                <div>
                     <div 
                        className="flex items-center cursor-pointer hover:bg-gray-800 rounded px-1 py-0.5 mb-1 border-t border-gray-700 pt-2"
                        onClick={() => setIsPropsCollapsed(!isPropsCollapsed)}
                     >
                         <span className="material-icons-round text-sm text-gray-500 mr-1">
                             {isPropsCollapsed ? 'chevron_right' : 'expand_more'}
                         </span>
                         <h3 className="text-[10px] text-gray-500 uppercase font-bold select-none">Props</h3>
                     </div>

                    {!isPropsCollapsed && (
                        props.length === 0 ? (
                            <div className="text-[10px] text-gray-600 italic pl-6">No objects</div>
                        ) : (
                            <ul className="space-y-1 pl-1 border-l border-gray-700 ml-2">
                                {props.map(p => (
                                    <li 
                                        key={p.id} 
                                        className={`text-xs flex items-center justify-between px-2 py-1 rounded cursor-pointer hover:bg-gray-800 ${selectedPropId === p.id ? 'bg-gray-700 text-white font-semibold border-l-2 border-yellow-500' : 'text-gray-400'}`}
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
                        )
                    )}
                </div>
            </div>
        </CollapsibleSection>

        {/* SELECTION DETAILS */}
        <CollapsibleSection title="Properties" defaultOpen={true}>
             <div className="flex justify-between items-center mb-2 border-b border-gray-800 pb-1">
                 <span className="text-[10px] text-blue-400 bg-blue-900/30 px-1.5 rounded">View: {activeView}</span>
            </div>
            
            {activeBoneDef ? (
                <div className="space-y-3">
                     <div className="flex justify-between text-sm items-center">
                        <span className="text-blue-400 font-semibold">{activeBoneDef.name}</span>
                        <span className="font-mono text-yellow-500 bg-gray-800 px-2 rounded">
                            {currentPose[activeBoneDef.id]?.[activeView]?.toFixed(0)}°
                        </span>
                    </div>
                    <input 
                        type="range"
                        min="-180"
                        max="180"
                        value={currentPose[activeBoneDef.id]?.[activeView] || 0}
                        onChange={(e) => onRotationChange(Number(e.target.value))}
                        className="w-full accent-yellow-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500">
                        <span>Rotation</span>
                        {isMirrorMode && MIRROR_MAPPING[activeBoneDef.id] && <span className="text-yellow-500">Mirrored</span>}
                    </div>

                    {/* Arm Layering Toggle */}
                    {selectedBoneId && (selectedBoneId.includes('ARM') || selectedBoneId.includes('HAND')) && (
                         <div className="mt-2 pt-2 border-t border-gray-700">
                             <label className="flex items-center space-x-2 cursor-pointer">
                                 <input 
                                    type="checkbox" 
                                    checked={armsInFront}
                                    onChange={(e) => setArmsInFront(e.target.checked)}
                                    className="w-3 h-3 rounded text-blue-500 focus:ring-0 bg-gray-700 border-gray-600"
                                 />
                                 <span className="text-xs text-gray-300">Arms In Front</span>
                             </label>
                         </div>
                    )}

                    {/* Detach Logic for Bone */}
                    {attachments[activeBoneDef.id] && (
                         <div className="mt-2 pt-2 border-t border-gray-700">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-green-400 font-semibold flex items-center">
                                    <span className="material-icons-round text-sm mr-1">link</span>
                                    Attached
                                </span>
                            </div>
                            <div className="text-[10px] text-gray-400 mb-2 bg-gray-800 p-1 px-2 rounded truncate">
                                {(() => {
                                    const att = attachments[activeBoneDef.id];
                                    const p = props.find(prop => prop.id === att.propId);
                                    const sp = p?.snapPoints.find(s => s.id === att.snapPointId);
                                    return `${p?.name || 'Unknown'} -> ${sp?.name || 'Point'}`;
                                })()}
                            </div>
                            <button 
                                onClick={() => onDetachBone(activeBoneDef.id)}
                                className="w-full py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded border border-gray-500 transition-colors"
                            >
                                Detach
                            </button>
                         </div>
                    )}
                </div>
            ) : activeProp ? (
                 <div className="space-y-3">
                     <div className="flex justify-between text-sm items-center border-b border-gray-800 pb-1">
                        <span className="text-green-400 font-semibold truncate pr-2">{activeProp.name}</span>
                    </div>
                    
                    {/* Cable specific controls */}
                    {activeProp.cableConfig && (
                        <div className="bg-gray-800 p-2 rounded border border-gray-600 mb-2 space-y-2">
                            <div className="text-[10px] font-bold text-gray-400 uppercase">Cable Controls</div>
                             <label className="flex items-center space-x-2 cursor-pointer">
                                 <input 
                                    type="checkbox" 
                                    checked={activeProp.cableConfig.showLine}
                                    onChange={(e) => updateCableConfig(activeProp.id, e.target.checked)}
                                    className="w-3 h-3 rounded text-blue-500 focus:ring-0 bg-gray-700 border-gray-600"
                                 />
                                 <span className="text-xs text-gray-300">Show Line</span>
                             </label>
                             <button 
                                onClick={() => toggleCableDirection(activeProp)}
                                className="w-full py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded border border-gray-500 flex items-center justify-center"
                             >
                                 <span className="material-icons-round text-sm mr-1">swap_vert</span> Flip Direction
                             </button>
                        </div>
                    )}

                    {/* Special Props Control (Bench Variant) */}
                    {activeProp.propType === 'BENCH' && activeView === 'FRONT' && (
                         <div className="bg-gray-800 p-2 rounded border border-gray-600 mb-2">
                            <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Bench View</div>
                             <label className="flex items-center space-x-2 cursor-pointer">
                                 <input 
                                    type="checkbox" 
                                    checked={activeProp.variant === 'alternate'}
                                    onChange={(e) => updatePropVariant(activeProp.id, e.target.checked ? 'alternate' : 'default')}
                                    className="w-3 h-3 rounded text-blue-500 focus:ring-0 bg-gray-700 border-gray-600"
                                 />
                                 <span className="text-xs text-gray-300">Top-Down Look</span>
                             </label>
                        </div>
                    )}

                    {/* Layer Control */}
                    <div className="bg-gray-800 p-2 rounded border border-gray-600 mb-2">
                         <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Layering</div>
                         <label className="flex items-center space-x-2 cursor-pointer">
                             <input 
                                type="checkbox" 
                                checked={activeProp.layer === 'back'}
                                onChange={(e) => updatePropLayer(activeProp.id, e.target.checked ? 'back' : 'front')}
                                className="w-3 h-3 rounded text-blue-500 focus:ring-0 bg-gray-700 border-gray-600"
                             />
                             <span className="text-xs text-gray-300">Draw Behind Character</span>
                         </label>
                    </div>

                    {/* Transforms */}
                    <div className="grid grid-cols-2 gap-2">
                        {/* Position */}
                        <div className="col-span-2">
                             <div className="mb-2">
                                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                    <span>Position X</span>
                                    <span>{Math.round(activeProp.transforms[activeView].x)}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="-200"
                                    max="600"
                                    step="1"
                                    value={activeProp.transforms[activeView].x}
                                    onChange={(e) => updatePropTransform(activeProp.id, activeView, 'x', Number(e.target.value))}
                                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                             </div>
                             <div>
                                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                    <span>Position Y</span>
                                    <span>{Math.round(activeProp.transforms[activeView].y)}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="-200"
                                    max="700"
                                    step="1"
                                    value={activeProp.transforms[activeView].y}
                                    onChange={(e) => updatePropTransform(activeProp.id, activeView, 'y', Number(e.target.value))}
                                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                             </div>
                        </div>

                         <div className="col-span-2 border-t border-gray-700 pt-2">
                            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                <span>Rotation</span>
                                <span>{Math.round(activeProp.transforms[activeView].rotation)}°</span>
                            </div>
                            <input 
                                type="range"
                                min="-180"
                                max="180"
                                value={activeProp.transforms[activeView].rotation}
                                onChange={(e) => updatePropTransform(activeProp.id, activeView, 'rotation', Number(e.target.value))}
                                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>

                        <div className="col-span-2 border-t border-gray-700 pt-2 mt-1">
                            <div className="text-[10px] text-gray-400 font-bold mb-2 uppercase">Scaling</div>
                            
                            <div className="mb-2">
                                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                    <span>Scale X (Width/Length)</span>
                                    <span>{Number((activeProp.transforms[activeView].scaleX || 1).toFixed(2))}x</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0.2"
                                    max="3"
                                    step="0.05"
                                    value={activeProp.transforms[activeView].scaleX || 1}
                                    onChange={(e) => updatePropTransform(activeProp.id, activeView, 'scaleX', Number(e.target.value))}
                                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                    <span>Scale Y (Height/Size)</span>
                                    <span>{Number((activeProp.transforms[activeView].scaleY || 1).toFixed(2))}x</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0.2"
                                    max="3"
                                    step="0.05"
                                    value={activeProp.transforms[activeView].scaleY || 1}
                                    onChange={(e) => updatePropTransform(activeProp.id, activeView, 'scaleY', Number(e.target.value))}
                                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                                />
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => onDeleteProp(activeProp.id)}
                        className="w-full py-1.5 mt-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs rounded border border-red-900/50 transition-colors flex items-center justify-center"
                    >
                        <span className="material-icons-round text-sm mr-1">delete</span> Delete Prop
                    </button>

                </div>
            ) : (
                <div className="text-xs text-gray-500 italic text-center py-4">
                    Select a bone or prop to edit details.
                </div>
            )}
        </CollapsibleSection>

        {/* PROPS LIBRARY */}
        <CollapsibleSection title="Prop Library" defaultOpen={false}>
            <div className="flex flex-wrap gap-2">
                {SAMPLE_PROPS.map(p => (
                    <button 
                        key={p.name}
                        onClick={() => onAddPresetProp(p)}
                        className="flex-grow px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-[10px] border border-gray-600 text-gray-300 transition-colors text-center"
                    >
                        {p.name}
                    </button>
                ))}
            </div>
        </CollapsibleSection>
    </div>
  );
};
