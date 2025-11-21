


import React from 'react';
import { Bone, SkeletonState, BodyPartType, ViewType } from '../types';
import { SKELETON_DEF } from '../constants';
import { getGlobalTransform } from '../utils';

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
  
  // Calculate render list
  const renderItems = SKELETON_DEF.map(bone => {
      // Calculate Global Transform for this bone
      const transform = getGlobalTransform(bone.id, pose, view);
      
      // Determine Z-index
      let zIndex = bone.views[view]?.zIndex || 0;
      
      // Apply modifier for arms
      if (armsInFront && (bone.id.includes('ARM') || bone.id.includes('HAND'))) {
          zIndex += 20;
      }

      return { bone, transform, zIndex };
  }).sort((a, b) => a.zIndex - b.zIndex); // Sort by Z-index (Painter's Algorithm)

  return (
    <g transform={`scale(${scale})`} className="skeleton-rig">
      {renderItems.map(({ bone, transform }) => {
          const viewDef = bone.views[view];
          if (!viewDef || !viewDef.path) return null;

          const isSelected = selectedBoneId === bone.id;
          const transformString = `translate(${transform.x}, ${transform.y}) rotate(${transform.angle})`;
          
          // Joint Logic
          const jointRadius = bone.jointRadius ?? (bone.width / 2);
          const showJoint = bone.parentId !== null; 
          const effectiveRadius = jointRadius > 0 ? jointRadius : (bone.id.includes('HAND') || bone.id.includes('FOOT') ? 6 : 12);

          return (
              <g
                key={bone.id}
                id={`bone-${bone.id}-${view}`}
                transform={transformString}
                onMouseDown={(e) => {
                  e.stopPropagation(); 
                  e.preventDefault();
                  onSelectBone(bone.id, e);
                }}
                className="group"
                style={{ cursor: isSelected ? 'grabbing' : 'grab' }}
              >
                {/* Joint Circle - Rendered first (below bone path) */}
                {showJoint && (
                     <circle cx="0" cy="0" r={effectiveRadius} fill={bone.color} className="pointer-events-none" />
                )}

                {/* Bone Path */}
                <path
                  d={viewDef.path}
                  fill={bone.color}
                  stroke={isSelected ? "#facc15" : "rgba(0,0,0,0.1)"}
                  strokeWidth={isSelected ? 3 : 1}
                  className="transition-colors duration-150 ease-in-out hover:fill-yellow-500/20 cursor-pointer pointer-events-auto"
                />

                {/* Face Details & Hair */}
                {bone.id === BodyPartType.HEAD && (
                    <g className="pointer-events-none">
                        {/* Hair - Black */}
                        {view === 'FRONT' && <path d="M-14,-38 C-16,-60 16,-60 14,-38 C10,-45 -10,-45 -14,-38 Z" fill="#111827" />}
                        {view === 'SIDE' && <path d="M14,-38 C15,-55 -5,-60 -18,-45 C-25,-35 -24,-10 -14,-5 L-10,-5 L-10,-20 L8,-38 Z" fill="#111827" />}
                        {view === 'TOP' && <circle cx="0" cy="-2" r="14" fill="#111827" />}

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
                
                {/* Selection Handle/Highlight */}
                <circle 
                    r="4" 
                    fill={isSelected ? "#facc15" : "transparent"} 
                    className={`group-hover:fill-white/30 ${isSelected ? 'animate-pulse' : ''}`} 
                />
              </g>
          );
      })}
    </g>
  );
};

export default Character;