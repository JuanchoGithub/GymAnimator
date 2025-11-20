import React from 'react';
import { Bone, SkeletonState, BodyPartType, ViewMode } from '../types';
import { SKELETON_DEF } from '../constants';

interface CharacterProps {
  pose: SkeletonState;
  selectedBoneId: BodyPartType | null;
  onSelectBone: (id: BodyPartType, e: React.MouseEvent) => void;
  scale?: number;
  viewMode?: ViewMode;
  armsInFront?: boolean;
}

const Character: React.FC<CharacterProps> = ({ 
  pose, 
  selectedBoneId, 
  onSelectBone, 
  scale = 1, 
  viewMode = 'FRONT',
  armsInFront = false
}) => {
  
  const renderBone = (bone: Bone) => {
    // Get current rotation from pose state
    const rotation = pose[bone.id] || 0;
    const isSelected = selectedBoneId === bone.id;

    // Adjust Z-Index based on props
    let currentZIndex = bone.zIndex;
    if (armsInFront && (bone.id.includes('ARM') || bone.id.includes('HAND'))) {
        currentZIndex += 20; // Move above Torso (10) and Head (20)
    }

    // Find children
    const children = SKELETON_DEF.filter(b => b.parentId === bone.id);

    // Sort Children for Rendering Order
    // We need to consider the modified Z-Index of children too
    const getChildZIndex = (child: Bone) => {
        let z = child.zIndex;
        if (armsInFront && (child.id.includes('ARM') || child.id.includes('HAND'))) {
            z += 20;
        }
        return z;
    };

    // Split children into layers based on parent's (current) zIndex
    const lowerChildren = children.filter(c => getChildZIndex(c) < currentZIndex)
                                  .sort((a, b) => getChildZIndex(a) - getChildZIndex(b));
    const upperChildren = children.filter(c => getChildZIndex(c) >= currentZIndex)
                                  .sort((a, b) => getChildZIndex(a) - getChildZIndex(b));

    // Determine joint circle radius (default to half width if not specified)
    const jointRadius = bone.jointRadius ?? (bone.width / 2);

    return (
      <g
        key={bone.id}
        id={`bone-${bone.id}`}
        transform={`translate(${bone.originX}, ${bone.originY}) rotate(${rotation})`}
        onMouseDown={(e) => {
          // Prevent bubbling so we select the specific bone clicked
          e.stopPropagation(); 
          e.preventDefault();
          onSelectBone(bone.id, e);
        }}
        className="group"
        style={{ cursor: isSelected ? 'grabbing' : 'grab' }}
      >
        {/* Render children that should be BEHIND the current bone */}
        {lowerChildren.map(child => renderBone(child))}

        {/* Permanent Joint Circle (The "Joint Ball") */}
        {jointRadius > 0 && (
            <circle
                cx="0"
                cy="0"
                r={jointRadius}
                fill={bone.color}
                className="pointer-events-none" 
            />
        )}

        {/* The Bone Visual (The current bone shape) */}
        <path
          d={bone.shapePath}
          fill={bone.color}
          stroke={isSelected ? "#facc15" : "rgba(0,0,0,0.1)"}
          strokeWidth={isSelected ? 3 : 1}
          className="transition-colors duration-150 ease-in-out hover:fill-yellow-500/20"
        />

        {/* Details: Face or Hair (Only for Head) */}
        {bone.id === BodyPartType.HEAD && (
            <g className="pointer-events-none">
                {viewMode === 'FRONT' ? (
                    <g opacity="0.6" fill="#aa4444">
                        {/* Eyes */}
                        <circle cx="-6" cy="-28" r="2" />
                        <circle cx="6" cy="-28" r="2" />
                        {/* Nose */}
                        <path d="M0,-25 L-2,-20 L2,-20 Z" />
                        {/* Mouth */}
                        <path d="M-5,-12 Q0,-8 5,-12" fill="none" stroke="#aa4444" strokeWidth="1.5" strokeLinecap="round"/>
                    </g>
                ) : (
                    <g fill="#1f2937">
                        {/* Fuller Hair Shape covering back of head */}
                        <path d="M-15,-25 C-16,-45 -10,-53 0,-53 C10,-53 16,-45 15,-25 L14,6 C14,11 8,13 0,13 C-8,13 -14,11 -14,6 Z" />
                    </g>
                )}
            </g>
        )}
        
        {/* Selection Highlight Overlay (Pulsing pivot indicator) */}
        <circle 
            r="4" 
            fill={isSelected ? "#facc15" : "transparent"} 
            className={`group-hover:fill-white/30 ${isSelected ? 'animate-pulse' : ''}`} 
        />

        {/* Render children that should be IN FRONT of the current bone */}
        {upperChildren.map(child => renderBone(child))}
      </g>
    );
  };

  // Start rendering from root bones (bones with no parent)
  const rootBones = SKELETON_DEF.filter(b => b.parentId === null);

  return (
    <g transform={`scale(${scale})`} className="skeleton-rig">
      {rootBones.map(renderBone)}
    </g>
  );
};

export default Character;