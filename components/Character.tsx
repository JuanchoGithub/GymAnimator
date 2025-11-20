import React from 'react';
import { Bone, SkeletonState, BodyPartType } from '../types';
import { SKELETON_DEF } from '../constants';

interface CharacterProps {
  pose: SkeletonState;
  selectedBoneId: BodyPartType | null;
  onSelectBone: (id: BodyPartType, e: React.MouseEvent) => void;
  scale?: number;
}

const Character: React.FC<CharacterProps> = ({ pose, selectedBoneId, onSelectBone, scale = 1 }) => {
  
  const renderBone = (bone: Bone) => {
    // Get current rotation from pose state
    const rotation = pose[bone.id] || 0;
    const isSelected = selectedBoneId === bone.id;

    // Find children and sort them by zIndex
    const children = SKELETON_DEF.filter(b => b.parentId === bone.id)
      .sort((a, b) => a.zIndex - b.zIndex);

    // Split children into layers based on parent's zIndex
    const lowerChildren = children.filter(c => c.zIndex < bone.zIndex);
    const upperChildren = children.filter(c => c.zIndex >= bone.zIndex);

    // Determine joint circle radius (default to half width if not specified)
    const jointRadius = bone.jointRadius ?? (bone.width / 2);

    return (
      <g
        key={bone.id}
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
    <g transform={`scale(${scale})`}>
      {rootBones.map(renderBone)}
    </g>
  );
};

export default Character;