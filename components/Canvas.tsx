
import React from 'react';
import Character from './Character';
import { GymProp, SkeletonState, BodyPartType, ViewType, LayoutMode } from '../types';

interface CanvasProps {
    svgRef: React.RefObject<SVGSVGElement>;
    currentPose: SkeletonState;
    props: GymProp[];
    selectedBoneId: BodyPartType | null;
    selectedPropId: string | null;
    activeView: ViewType;
    layoutMode: LayoutMode;
    attachments: Record<string, { propId: string; snapPointId: string }>;
    dragState: { isDragging: boolean; type: 'BONE' | 'PROP'; id: string } | null;
    isPlaying: boolean;
    armsInFront: boolean;
    onBoneMouseDown: (id: BodyPartType, e: React.MouseEvent, view: ViewType) => void;
    onPropMouseDown: (e: React.MouseEvent, prop: GymProp, view: ViewType) => void;
    onSvgMouseMove: (e: React.MouseEvent, view: ViewType) => void;
    onSvgMouseUp: () => void;
    onClearSelection: () => void;
    onSetActiveView: (view: ViewType) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
    currentPose,
    props,
    selectedBoneId,
    selectedPropId,
    activeView,
    layoutMode,
    attachments,
    dragState,
    isPlaying,
    armsInFront,
    onBoneMouseDown,
    onPropMouseDown,
    onSvgMouseMove,
    onSvgMouseUp,
    onClearSelection,
    onSetActiveView
}) => {
  
  const renderViewport = (view: ViewType, label: string) => {
      const isActive = activeView === view;

      const renderProp = (prop: GymProp) => {
          const isSelected = selectedPropId === prop.id;
          const viewDef = prop.views[view];
          if(!viewDef) return null;

          // Use independent view transform
          const transform = prop.transforms[view];

          return (
            <g 
                key={prop.id} 
                id={`prop-${prop.id}-${view}`}
                transform={`translate(${transform.x}, ${transform.y}) rotate(${transform.rotation}) scale(${transform.scaleX}, ${transform.scaleY})`}
                onMouseDown={(e) => {
                    e.stopPropagation();
                    onSetActiveView(view);
                    onPropMouseDown(e, prop, view);
                }}
                style={{ cursor: dragState?.isDragging && isSelected ? 'grabbing' : 'grab' }}
                className="group"
            >
                {isSelected && (
                    <path d={viewDef.path} fill="none" stroke="#facc15" strokeWidth="4" opacity="0.5"/>
                )}
                <path 
                    d={viewDef.path} 
                    fill={prop.color} 
                    stroke={prop.stroke || "none"}
                    strokeWidth={prop.strokeWidth || 0}
                />
                 {isSelected && <circle r="3" fill="#facc15" stroke="black" strokeWidth="1" />}
            </g>
          );
      };

      return (
        <div 
            id={`viewport-${view}`}
            className={`relative bg-gray-200 overflow-hidden border-4 transition-colors w-full h-full min-h-0 min-w-0 ${isActive ? 'border-blue-500 shadow-lg z-10' : 'border-gray-700 opacity-90 hover:opacity-100'}`}
            onMouseDown={() => onSetActiveView(view)}
        >
            <div className="absolute top-2 left-2 z-20 bg-black/50 px-2 py-0.5 rounded text-xs text-white font-mono pointer-events-none">
                {label}
            </div>
            
            {/* Grid Background */}
            <div className="absolute inset-0 pointer-events-none opacity-30"
                style={{ backgroundImage: 'radial-gradient(#6b7280 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            </div>

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
                {props.filter(p => p.layer === 'back').map(renderProp)}

                <Character 
                    pose={currentPose}
                    selectedBoneId={selectedBoneId}
                    onSelectBone={(id, e) => {
                        onSetActiveView(view);
                        onBoneMouseDown(id, e, view);
                    }}
                    view={view}
                    armsInFront={armsInFront}
                />

                 {/* Render Props (Front) */}
                {props.filter(p => p.layer !== 'back').map(renderProp)}
            </svg>
        </div>
      );
  };

  // Layout Logic
  const getGridContent = () => {
      switch(layoutMode) {
          case 'SINGLE':
              return renderViewport(activeView, activeView);
          case 'SIDE_BY_SIDE':
              return (
                  <div className="grid grid-cols-2 gap-1 w-full h-full min-h-0">
                        {renderViewport('FRONT', 'FRONT')}
                        {renderViewport('SIDE', 'SIDE')}
                  </div>
              );
          case 'TOP_BOTTOM':
             return (
                  <div className="grid grid-rows-2 gap-1 w-full h-full min-h-0">
                        {renderViewport('FRONT', 'FRONT')}
                        {renderViewport('TOP', 'TOP')}
                  </div>
              );
          case 'THREE_SPLIT':
              return (
                  <div className="grid grid-cols-2 gap-1 w-full h-full min-h-0">
                      {renderViewport('FRONT', 'FRONT')}
                      <div className="grid grid-rows-2 gap-1 h-full min-h-0">
                          {renderViewport('SIDE', 'SIDE')}
                          {renderViewport('TOP', 'TOP')}
                      </div>
                  </div>
              );
          default:
              return renderViewport('FRONT', 'FRONT');
      }
  };

  return (
    <div className="flex-1 bg-gray-900 p-4 relative flex items-center justify-center overflow-hidden">
       <div className="w-full h-full flex flex-col">
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
