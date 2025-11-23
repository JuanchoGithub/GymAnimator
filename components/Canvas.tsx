
import React from 'react';
import Character from './Character';
import { GymProp, SkeletonState, BodyPartType, ViewType, LayoutMode, Appearance, MuscleGroup } from '../types';
import { getSnapPointDef } from '../utils';
import { getSmartPath } from '../constants';

interface CanvasProps {
    svgRef: React.RefObject<SVGSVGElement>;
    currentPose: SkeletonState;
    props: GymProp[];
    selectedBoneId: BodyPartType | null;
    selectedPropId: string | null;
    activeView: ViewType;
    layoutMode: LayoutMode;
    slotViews: ViewType[];
    attachments: Record<string, { propId: string; snapPointId: string }>;
    dragState: { isDragging: boolean; type: 'BONE' | 'PROP'; id: string } | null;
    isPlaying: boolean;
    armsInFront: boolean;
    appearance: Appearance;
    activeMuscles: MuscleGroup[];
    // interpolated or static root pos from App
    rootPos?: Record<ViewType, {x: number, y: number}>;
    onBoneMouseDown: (id: BodyPartType, e: React.MouseEvent, view: ViewType) => void;
    onPropMouseDown: (e: React.MouseEvent, prop: GymProp, view: ViewType) => void;
    onSvgMouseMove: (e: React.MouseEvent, view: ViewType) => void;
    onSvgMouseUp: () => void;
    onClearSelection: () => void;
    onSetActiveView: (view: ViewType) => void;
    onUpdateSlotView: (index: number, view: ViewType) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
    currentPose,
    props,
    selectedBoneId,
    selectedPropId,
    activeView,
    layoutMode,
    slotViews,
    attachments,
    dragState,
    isPlaying,
    armsInFront,
    appearance,
    activeMuscles,
    rootPos,
    onBoneMouseDown,
    onPropMouseDown,
    onSvgMouseMove,
    onSvgMouseUp,
    onClearSelection,
    onSetActiveView,
    onUpdateSlotView
}) => {
  
  const renderViewport = (view: ViewType, label: string, slotIndex: number = -1, showControls: boolean = false) => {
      const isActive = activeView === view;
      const currentViewRootPos = rootPos ? rootPos[view] : undefined;

      const renderProp = (prop: GymProp) => {
          const isSelected = selectedPropId === prop.id;
          const viewDef = prop.views[view];
          if(!viewDef) return null;

          // Determine Path and Transform
          const transform = prop.transforms[view];
          let pathData = viewDef.path;
          let finalScaleX = transform.scaleX;
          let finalScaleY = transform.scaleY;

          // Check if we have a "smart" parametric path for this prop
          const smartPath = getSmartPath(prop.propType, view, prop.variant, transform.scaleX || 1, transform.scaleY || 1);
          
          if (smartPath) {
              pathData = smartPath;
              // If we use smart path, we baked the scale into the path data, so CSS scale is 1.
              finalScaleX = 1;
              finalScaleY = 1;
          }

          const isDraggingBone = dragState?.isDragging && dragState.type === 'BONE';

          return (
            <g 
                key={prop.id} 
                id={`prop-${prop.id}-${view}`}
                transform={`translate(${transform.x}, ${transform.y}) rotate(${transform.rotation}) scale(${finalScaleX}, ${finalScaleY})`}
                onMouseDown={(e) => {
                    e.stopPropagation();
                    onSetActiveView(view);
                    onPropMouseDown(e, prop, view);
                }}
                style={{ cursor: dragState?.isDragging && isSelected ? 'grabbing' : 'grab' }}
                className="group"
            >
                {isSelected && (
                    <path d={pathData} fill="none" stroke="#facc15" strokeWidth="4" opacity="0.5"/>
                )}
                <path 
                    d={pathData} 
                    fill={prop.color} 
                    stroke={prop.stroke || "none"}
                    strokeWidth={prop.strokeWidth || 0}
                />
                 {isSelected && <circle r="3" fill="#facc15" stroke="black" strokeWidth="1" />}

                 {/* Visual Snap Points (Only when dragging a bone) */}
                 {isDraggingBone && prop.snapPoints.map(sp => {
                     const { x, y, visible } = getSnapPointDef(sp, view);
                     if (!visible) return null;

                     // Calculate inverse scale to keep snap points circular and consistent size
                     const baseRadius = 5;
                     const scaleX = finalScaleX || 1;
                     const scaleY = finalScaleY || 1;
                     const rx = baseRadius / Math.abs(scaleX);
                     const ry = baseRadius / Math.abs(scaleY);
                     const strokeWidth = 1.5 / Math.max(Math.abs(scaleX), Math.abs(scaleY));

                     return (
                         <g key={sp.id}>
                             <ellipse 
                                cx={x} 
                                cy={y} 
                                rx={rx} 
                                ry={ry} 
                                fill="#22c55e" 
                                stroke="white" 
                                strokeWidth={strokeWidth}
                                className="pointer-events-none animate-pulse"
                                opacity="0.9"
                             />
                             <ellipse 
                                cx={x} 
                                cy={y} 
                                rx={rx * 0.3} 
                                ry={ry * 0.3} 
                                fill="white" 
                                className="pointer-events-none"
                             />
                         </g>
                     );
                 })}
            </g>
          );
      };

      // Determine Back vs Front props
      // Use prop.layer property strictly
      const isBackProp = (p: GymProp) => {
          return p.layer === 'back';
      };

      return (
        <div 
            id={`viewport-${view}`}
            className={`relative overflow-hidden border-4 transition-colors w-full h-full min-h-0 min-w-0 flex flex-col ${isActive ? 'border-blue-500 shadow-lg z-10' : 'border-gray-700 opacity-90 hover:opacity-100'}`}
            onMouseDown={() => onSetActiveView(view)}
            style={{ backgroundColor: appearance.backgroundColor === 'transparent' ? 'transparent' : appearance.backgroundColor }}
        >
             {/* Label & Controls Overlay */}
             <div className="absolute top-0 left-0 w-full p-2 z-20 flex justify-between items-start pointer-events-none">
                <div className="bg-black/50 px-2 py-0.5 rounded text-xs text-white font-mono">
                    {label}
                </div>
                
                {showControls && (
                     <div className="flex space-x-1 pointer-events-auto shadow-lg">
                         {(['FRONT', 'SIDE', 'TOP'] as ViewType[]).map(v => (
                             <button 
                                key={v}
                                onMouseDown={(e) => { 
                                    e.stopPropagation();
                                    onUpdateSlotView(slotIndex, v);
                                }}
                                className={`text-[10px] px-2 py-1 rounded border border-gray-600 transition-colors font-bold ${view === v ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}
                             >
                                 {v}
                             </button>
                         ))}
                     </div>
                )}
            </div>
            
            {/* Grid Background */}
            {appearance.backgroundColor !== 'transparent' && (
                <div className="absolute inset-0 pointer-events-none opacity-30"
                    style={{ backgroundImage: 'radial-gradient(#6b7280 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                </div>
            )}

            <svg 
                width="100%" 
                height="100%" 
                viewBox="0 0 400 500"
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full select-none relative z-10"
                onMouseDown={onClearSelection}
                onMouseMove={(e) => onSvgMouseMove(e, view)}
                onMouseUp={onSvgMouseUp}
                onMouseLeave={onSvgMouseUp}
            >
                 {/* Render Props (Back) */}
                {props.filter(p => isBackProp(p)).map(renderProp)}

                <Character 
                    pose={currentPose}
                    selectedBoneId={selectedBoneId}
                    onSelectBone={(id, e) => {
                        onSetActiveView(view);
                        onBoneMouseDown(id, e, view);
                    }}
                    view={view}
                    armsInFront={armsInFront}
                    appearance={appearance}
                    activeMuscles={activeMuscles}
                    rootPos={currentViewRootPos}
                />

                 {/* Render Props (Front) */}
                {props.filter(p => !isBackProp(p)).map(renderProp)}
            </svg>
        </div>
      );
  };

  // Layout Logic
  const getGridContent = () => {
      switch(layoutMode) {
          case 'SINGLE':
              return renderViewport(activeView, activeView, -1, true);
          case 'SIDE_BY_SIDE':
              return (
                  <div className="grid grid-cols-2 gap-1 w-full h-full min-h-0">
                        <div className="min-w-0 min-h-0 h-full">{renderViewport(slotViews[0], slotViews[0], 0, true)}</div>
                        <div className="min-w-0 min-h-0 h-full">{renderViewport(slotViews[1], slotViews[1], 1, true)}</div>
                  </div>
              );
          case 'TOP_BOTTOM':
             return (
                  <div className="grid grid-rows-2 gap-1 w-full h-full min-h-0">
                        <div className="min-w-0 min-h-0 h-full">{renderViewport(slotViews[0], slotViews[0], 0, true)}</div>
                        <div className="min-w-0 min-h-0 h-full">{renderViewport(slotViews[2], slotViews[2], 2, true)}</div>
                  </div>
              );
          case 'THREE_SPLIT':
              return (
                  <div className="grid grid-cols-2 gap-1 w-full h-full min-h-0">
                      <div className="min-w-0 min-h-0 h-full">{renderViewport(slotViews[0], slotViews[0], 0, true)}</div>
                      <div className="grid grid-rows-2 gap-1 h-full min-h-0">
                          <div className="min-w-0 min-h-0 h-full">{renderViewport(slotViews[1], slotViews[1], 1, true)}</div>
                          <div className="min-w-0 min-h-0 h-full">{renderViewport(slotViews[2], slotViews[2], 2, true)}</div>
                      </div>
                  </div>
              );
          default:
              return renderViewport(activeView, activeView, -1, true);
      }
  };

  return (
    <div className="w-full h-full bg-gray-900 p-4 relative flex items-center justify-center overflow-hidden">
       <div className="w-full h-full flex flex-col min-h-0">
            {getGridContent()}
       </div>
       
       <div className="absolute bottom-4 right-4 text-gray-500 text-xs font-mono flex flex-col items-end space-y-1 pointer-events-none select-none z-50">
           <span>{isPlaying ? 'PLAYING' : 'EDIT MODE'}</span>
           {dragState?.isDragging && <span className="text-yellow-500 font-bold">DRAGGING</span>}
           <span className="text-blue-400">ACTIVE: {activeView}</span>
       </div>
    </div>
  );
};
