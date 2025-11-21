
import React from 'react';
import { Bone, SkeletonState, BodyPartType, ViewType } from '../types';
import { SKELETON_DEF } from '../constants';

interface CharacterProps {
  pose: SkeletonState;
  selectedBoneId: BodyPartType | null;
  onSelectBone: (id: BodyPartType, e: React.MouseEvent) => void;
  scale?: number;
  view: ViewType;
  armsInFront?: boolean;
}

const Character: React.FC<CharacterProps> = ({ 
  pose, 
  selectedBoneId, 
  onSelectBone, 
  scale = 1, 
  view,
  armsInFront = false
}) => {
  
  const renderBone = (bone: Bone) => {
    // Get rotation specifically for this view
    let rotation = pose[bone.id]?.[view] ?? 0;
    const isSelected = selectedBoneId === bone.id;
    const viewDef = bone.views[view];

    // If no path defined for this view, skip
    if (!viewDef || !viewDef.path) return null;

    // Determine effective Z-index
    let currentZIndex = viewDef.zIndex;
    if (armsInFront && (bone.id.includes('ARM') || bone.id.includes('HAND'))) {
        currentZIndex += 20;
    }

    const children = SKELETON_DEF.filter(b => b.parentId === bone.id);
    const getChildZIndex = (child: Bone) => {
        let z = child.views[view]?.zIndex || 0;
        if (armsInFront && (child.id.includes('ARM') || child.id.includes('HAND'))) {
            z += 20;
        }
        return z;
    };

    const lowerChildren = children.filter(c => getChildZIndex(c) < currentZIndex)
                                  .sort((a, b) => getChildZIndex(a) - getChildZIndex(b));
    const upperChildren = children.filter(c => getChildZIndex(c) >= currentZIndex)
                                  .sort((a, b) => getChildZIndex(a) - getChildZIndex(b));

    const jointRadius = bone.jointRadius ?? (bone.width / 2);
    const transform = `translate(${viewDef.originX}, ${viewDef.originY}) rotate(${rotation})`;

    return (
      <g
        key={bone.id}
        id={`bone-${bone.id}-${view}`}
        transform={transform}
        onMouseDown={(e) => {
          e.stopPropagation(); 
          e.preventDefault();
          onSelectBone(bone.id, e);
        }}
        className="group"
        style={{ cursor: isSelected ? 'grabbing' : 'grab' }}
      >
        {lowerChildren.map(child => renderBone(child))}

        {jointRadius > 0 && (
            <circle cx="0" cy="0" r={jointRadius} fill={bone.color} className="pointer-events-none" />
        )}

        <path
          d={viewDef.path}
          fill={bone.color}
          stroke={isSelected ? "#facc15" : "rgba(0,0,0,0.1)"}
          strokeWidth={isSelected ? 3 : 1}
          className="transition-colors duration-150 ease-in-out hover:fill-yellow-500/20 cursor-pointer pointer-events-auto"
        />

        {/* Face Details (Only Head, Only Front/Side) */}
        {bone.id === BodyPartType.HEAD && (
            <g className="pointer-events-none">
                {view === 'FRONT' && (
                    <g opacity="0.6" fill="#aa4444">
                        <circle cx="-6" cy="-28" r="2" />
                        <circle cx="6" cy="-28" r="2" />
                        <path d="M0,-25 L-2,-20 L2,-20 Z" />
                        <path d="M-5,-12 Q0,-8 5,-12" fill="none" stroke="#aa4444" strokeWidth="1.5" strokeLinecap="round"/>
                    </g>
                )}
                {view === 'SIDE' && (
                    <g opacity="0.6" fill="#aa4444">
                         <circle cx="8" cy="-28" r="2" />
                         <path d="M14,-25 L18,-22 L14,-18 Z" /> {/* Nose side */}
                    </g>
                )}
            </g>
        )}
        
        <circle 
            r="4" 
            fill={isSelected ? "#facc15" : "transparent"} 
            className={`group-hover:fill-white/30 ${isSelected ? 'animate-pulse' : ''}`} 
        />

        {upperChildren.map(child => renderBone(child))}
      </g>
    );
  };

  const rootBones = SKELETON_DEF.filter(b => b.parentId === null);

  return (
    <g transform={`scale(${scale})`} className="skeleton-rig">
      {rootBones.map(renderBone)}
    </g>
  );
};

export default Character;
