import React from 'react';
import Character from './Character';
import { GymProp, SkeletonState, BodyPartType, ViewMode } from '../types';

interface CanvasProps {
    svgRef: React.RefObject<SVGSVGElement>;
    currentPose: SkeletonState;
    props: GymProp[];
    selectedBoneId: BodyPartType | null;
    selectedPropId: string | null;
    attachments: Record<string, { propId: string; snapPointId: string }>;
    dragState: { isDragging: boolean; type: 'BONE' | 'PROP'; id: string } | null;
    isPlaying: boolean;
    isMirrorMode: boolean;
    viewMode: ViewMode;
    armsInFront: boolean;
    onBoneMouseDown: (id: BodyPartType, e: React.MouseEvent) => void;
    onPropMouseDown: (e: React.MouseEvent, prop: GymProp) => void;
    onSvgMouseMove: (e: React.MouseEvent) => void;
    onSvgMouseUp: () => void;
    onClearSelection: () => void;
}

export const Canvas: React.FC<CanvasProps> = ({
    svgRef,
    currentPose,
    props,
    selectedBoneId,
    selectedPropId,
    attachments,
    dragState,
    isPlaying,
    isMirrorMode,
    viewMode,
    armsInFront,
    onBoneMouseDown,
    onPropMouseDown,
    onSvgMouseMove,
    onSvgMouseUp,
    onClearSelection
}) => {
  
  const renderProp = (prop: GymProp) => {
      const isSelected = selectedPropId === prop.id;
      return (
        <g 
            key={prop.id} 
            id={`prop-${prop.id}`}
            transform={`translate(${prop.translateX}, ${prop.translateY}) rotate(${prop.rotation}) scale(${prop.scaleX}, ${prop.scaleY})`}
            onMouseDown={(e) => onPropMouseDown(e, prop)}
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
                stroke={prop.stroke || "none"}
                strokeWidth={prop.strokeWidth || 0}
                className="transition-opacity hover:opacity-90"
            />

            {/* Snap Points Visual (Visible if selected or dragging hand) */}
            {(isSelected || (dragState?.type === 'BONE' && dragState.id.includes('HAND'))) && prop.snapPoints?.map(sp => (
                <circle 
                    key={sp.id}
                    cx={sp.x}
                    cy={sp.y}
                    r={4 / prop.scaleX} // Counter-scale radius
                    fill="#ef4444"
                    opacity="0.5"
                    className="pointer-events-none"
                />
            ))}

            {/* Pivot Point (visible when selected) */}
            {isSelected && (
                <circle r="3" fill="#facc15" stroke="black" strokeWidth="1" />
            )}
        </g>
      );
  };

  return (
    <div className="flex-1 bg-gray-900 relative flex items-center justify-center overflow-hidden">
       
       {/* SVG Canvas Container */}
       <div className="bg-gray-200 border-4 border-gray-700 rounded-lg shadow-2xl relative overflow-hidden">
            
            {/* Grid Background (Inside the 'paper') */}
            <div className="absolute inset-0 pointer-events-none opacity-30"
                style={{ backgroundImage: 'radial-gradient(#6b7280 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            </div>

            <svg 
                ref={svgRef}
                width="400" 
                height="500" 
                viewBox="0 0 400 500"
                className="select-none relative z-10"
                style={{ cursor: dragState?.isDragging ? 'grabbing' : 'default' }}
                id="export-target"
                onMouseDown={onClearSelection}
                onMouseMove={onSvgMouseMove}
                onMouseUp={onSvgMouseUp}
                onMouseLeave={onSvgMouseUp}
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

                {/* Render Props Layer (Back) */}
                {props.filter(p => p.layer === 'back').map(renderProp)}

                {/* Character */}
                <Character 
                    pose={currentPose}
                    selectedBoneId={selectedBoneId}
                    onSelectBone={onBoneMouseDown}
                    viewMode={viewMode}
                    armsInFront={armsInFront}
                />

                {/* Render Props Layer (Front - Default) */}
                {props.filter(p => p.layer !== 'back').map(renderProp)}

            </svg>
       </div>
       
       <div className="absolute bottom-4 right-4 text-gray-500 text-xs font-mono flex flex-col items-end space-y-1 pointer-events-none select-none">
           <span>{isPlaying ? 'PLAYING' : 'EDIT MODE'}</span>
           {dragState?.isDragging && <span className="text-yellow-500 font-bold">DRAGGING</span>}
           {Object.keys(attachments).length > 0 && <span className="text-green-400">ATTACHED</span>}
           {isMirrorMode && <span className="text-blue-400">MIRROR: ON</span>}
           <span className="text-gray-400">VIEW: {viewMode}</span>
       </div>
    </div>
  );
};