
import React from 'react';
import { Bone, SkeletonState, BodyPartType, ViewType, Appearance, MuscleGroup } from '../types';
import { SKELETON_DEF, MUSCLE_OVERLAYS } from '../constants';
import { getGlobalTransform } from '../utils';

interface CharacterProps {
  pose: SkeletonState;
  selectedBoneId: BodyPartType | null;
  onSelectBone: (id: BodyPartType, e: React.MouseEvent) => void;
  scale?: number;
  view: ViewType;
  armsInFront?: boolean;
  appearance?: Appearance;
  activeMuscles?: MuscleGroup[];
}

const Character: React.FC<CharacterProps> = ({ 
  pose, 
  selectedBoneId, 
  onSelectBone, 
  scale = 1, 
  view,
  armsInFront = false,
  appearance = {
      shirtColor: "#3b82f6",
      pantsColor: "#1f2937",
      shoesColor: "#ffffff",
      skinColor: "#fca5a5",
      hairColor: "#111827",
      backgroundColor: "#111827"
  },
  activeMuscles = []
}) => {
  
  // Helper to resolve color based on body part type
  const getBoneColor = (boneId: BodyPartType, defaultColor: string): string => {
      // Skin parts (Head, Neck, Hands, Lower Arms, Lower Legs)
      if (
          boneId === BodyPartType.HEAD || 
          boneId === BodyPartType.NECK || 
          boneId.includes('HAND') ||
          boneId.includes('LOWER_ARM') ||
          boneId.includes('LOWER_LEG')
      ) {
          return appearance.skinColor;
      }
      // Shirt parts (Torso, Upper Arms)
      if (boneId === BodyPartType.TORSO || boneId.includes('UPPER_ARM')) {
          return appearance.shirtColor;
      }
      // Pants parts (Hips, Upper Legs)
      if (boneId === BodyPartType.HIPS || boneId.includes('UPPER_LEG')) {
          return appearance.pantsColor;
      }
      // Shoes (Feet)
      if (boneId.includes('FOOT')) {
          return appearance.shoesColor;
      }
      return defaultColor;
  };

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
          
          const fillColor = getBoneColor(bone.id, bone.color);

          // Check for active muscles associated with this bone
          const boneActiveMuscles = activeMuscles.filter(m => {
              // Check if we have an overlay defined for this muscle on this bone
              if (MUSCLE_OVERLAYS[m]?.[bone.id]) return true;
              return false;
          });

          // Check for special Joint highlighting
          const isShoulderActive = activeMuscles.includes(MuscleGroup.SHOULDERS) && bone.id.includes('UPPER_ARM');
          const isGluteActive = activeMuscles.includes(MuscleGroup.GLUTES) && bone.id.includes('UPPER_LEG');
          const isJointActive = isShoulderActive || isGluteActive;

          // Determine Joint Color
          let jointColor = fillColor;
          let jointClass = '';

          if (isJointActive) {
              jointColor = '#ef4444';
              jointClass = 'animate-pulse-red';
          } else {
            if (bone.id.includes('LOWER_ARM')) {
                jointColor = appearance.shirtColor;
            } else if (bone.id.includes('LOWER_LEG')) {
                jointColor = appearance.pantsColor;
            }
          }

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
                {/* Base Bone Path */}
                <path
                  d={viewDef.path}
                  fill={fillColor}
                  stroke={isSelected ? "#facc15" : "none"}
                  strokeWidth={isSelected ? 3 : 0}
                  className={`transition-colors duration-150 ease-in-out hover:fill-yellow-500/20 cursor-pointer pointer-events-auto`}
                />

                {/* Muscle Overlays (Rendered on top of bone path) */}
                {boneActiveMuscles.map(muscle => {
                    const overlayPath = MUSCLE_OVERLAYS[muscle]?.[bone.id]?.[view];
                    if (overlayPath) {
                        return (
                            <path 
                                key={muscle}
                                d={overlayPath} 
                                fill="#ef4444" 
                                className="animate-pulse-red pointer-events-none"
                            />
                        );
                    }
                    return null;
                })}

                {/* Joint Circle - Rendered on top */}
                {showJoint && (
                     <circle cx="0" cy="0" r={effectiveRadius} fill={jointColor} className={`pointer-events-none ${jointClass}`} />
                )}

                {/* Face Details & Hair */}
                {bone.id === BodyPartType.HEAD && (
                    <g className="pointer-events-none">
                        {/* Hair */}
                        {view === 'FRONT' && <path d="M-14,-38 C-16,-60 16,-60 14,-38 C10,-45 -10,-45 -14,-38 Z" fill={appearance.hairColor} />}
                        {view === 'SIDE' && <path d="M14,-38 C15,-55 -5,-60 -18,-45 C-25,-35 -24,-10 -14,-5 L-10,-5 L-10,-20 L8,-38 Z" fill={appearance.hairColor} />}
                        {view === 'TOP' && <circle cx="0" cy="-2" r="14" fill={appearance.hairColor} />}

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
