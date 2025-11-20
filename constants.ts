import { BodyPartType, Bone, SkeletonState } from './types';

// Helper for capsule shapes (kept for reference, though custom paths are used)
const capsule = (w: number, h: number) => 
  `M${w/2},0 A${w/2},${w/2} 0 1,1 ${w/2},${w} V${h-w/2} A${w/2},${w/2} 0 1,1 ${w/2},${h} Z`;

// Improved head shape with stronger jawline
const headPath = "M-9,10 L9,10 L13,-5 L14,-25 C14,-45 8,-50 0,-50 C-8,-50 -14,-45 -14,-25 L-13,-5 Z";

export const SKELETON_DEF: Bone[] = [
  {
    id: BodyPartType.ROOT,
    parentId: null,
    name: "Waist (Root)",
    length: 0,
    width: 0,
    jointRadius: 0,
    color: "#d97706", // Amber belt
    defaultAngle: 0,
    originX: 200,
    originY: 320,
    zIndex: 15,
    shapePath: "M-17,-6 L17,-6 L17,6 L-17,6 Z"
  },
  {
    id: BodyPartType.TORSO,
    parentId: BodyPartType.ROOT,
    name: "Torso",
    length: 75,
    width: 56,
    jointRadius: 15, // Waist joint
    color: "#3b82f6", // Gym shirt blue
    defaultAngle: 0,
    originX: 0,
    originY: 0,
    zIndex: 10,
    // V-Taper Shape with curved lats
    shapePath: "M-15,0 C-15,0 -30,-45 -36,-75 L36,-75 C30,-45 15,0 15,0 Z" 
  },
  {
    id: BodyPartType.NECK,
    parentId: BodyPartType.TORSO,
    name: "Neck",
    length: 15,
    width: 14,
    jointRadius: 8,
    color: "#fca5a5", // Skin
    defaultAngle: 0,
    originX: 0,
    originY: -75, // Top of Torso
    zIndex: 9, // Behind shirt/head
    shapePath: "M-7,0 L7,0 L7,-12 L-7,-12 Z"
  },
  {
    id: BodyPartType.HEAD,
    parentId: BodyPartType.NECK,
    name: "Head",
    length: 50,
    width: 30,
    jointRadius: 0, // Neck joint covers this
    color: "#fca5a5", // Skin tone
    defaultAngle: 0,
    originX: 0,
    originY: -12, // Top of Neck
    zIndex: 20,
    shapePath: headPath
  },
  {
    id: BodyPartType.HIPS,
    parentId: BodyPartType.ROOT,
    name: "Hips",
    length: 25,
    width: 40,
    jointRadius: 16,
    color: "#1f2937", // Shorts dark grey
    defaultAngle: 0,
    originX: 0,
    originY: 0,
    zIndex: 12,
    // Briefs shape
    shapePath: "M-16,0 L16,0 C16,0 20,20 14,25 L-14,25 C-20,20 -16,0 -16,0 Z"
  },
  // Left Arm
  {
    id: BodyPartType.UPPER_ARM_L,
    parentId: BodyPartType.TORSO,
    name: "Upper Arm L",
    length: 60,
    width: 22,
    jointRadius: 12, // Shoulder Ball
    color: "#fca5a5", // Skin (Sleeveless)
    defaultAngle: 45,
    originX: -30, // Moved slightly out for V-taper
    originY: -70, // Shoulder joint
    zIndex: 5,
    // Bicep curve
    shapePath: "M-12,0 C-17,15 -17,40 -10,60 L10,60 C17,40 17,15 12,0 Z"
  },
  {
    id: BodyPartType.LOWER_ARM_L,
    parentId: BodyPartType.UPPER_ARM_L,
    name: "Lower Arm L",
    length: 50,
    width: 18,
    jointRadius: 10, // Elbow Ball
    color: "#fca5a5",
    defaultAngle: 10,
    originX: 0,
    originY: 60,
    zIndex: 4,
    // Forearm muscle
    shapePath: "M-10,0 C-13,10 -12,35 -7,50 L7,50 C12,35 13,10 10,0 Z"
  },
  {
    id: BodyPartType.HAND_L,
    parentId: BodyPartType.LOWER_ARM_L,
    name: "Hand L",
    length: 15,
    width: 15,
    jointRadius: 7, // Wrist
    color: "#fca5a5",
    defaultAngle: 0,
    originX: 0,
    originY: 50,
    zIndex: 3,
    shapePath: "M-6,0 L6,0 L5,15 L-5,15 Z"
  },
  // Right Arm
  {
    id: BodyPartType.UPPER_ARM_R,
    parentId: BodyPartType.TORSO,
    name: "Upper Arm R",
    length: 60,
    width: 22,
    jointRadius: 12,
    color: "#fca5a5",
    defaultAngle: -45,
    originX: 30,
    originY: -70,
    zIndex: 5,
    shapePath: "M-12,0 C-17,15 -17,40 -10,60 L10,60 C17,40 17,15 12,0 Z"
  },
  {
    id: BodyPartType.LOWER_ARM_R,
    parentId: BodyPartType.UPPER_ARM_R,
    name: "Lower Arm R",
    length: 50,
    width: 18,
    jointRadius: 10,
    color: "#fca5a5",
    defaultAngle: -10,
    originX: 0,
    originY: 60,
    zIndex: 4,
    shapePath: "M-10,0 C-13,10 -12,35 -7,50 L7,50 C12,35 13,10 10,0 Z"
  },
  {
    id: BodyPartType.HAND_R,
    parentId: BodyPartType.LOWER_ARM_R,
    name: "Hand R",
    length: 15,
    width: 15,
    jointRadius: 7,
    color: "#fca5a5",
    defaultAngle: 0,
    originX: 0,
    originY: 50,
    zIndex: 3,
    shapePath: "M-6,0 L6,0 L5,15 L-5,15 Z"
  },
  // Left Leg
  {
    id: BodyPartType.UPPER_LEG_L,
    parentId: BodyPartType.HIPS,
    name: "Thigh L",
    length: 70,
    width: 26,
    jointRadius: 13, // Hip Joint
    color: "#1f2937", // Shorts
    defaultAngle: 10,
    originX: -10,
    originY: 20, // Relative to Hips
    zIndex: 6,
    // Quad curve
    shapePath: "M-13,0 C-20,20 -18,50 -10,70 L10,70 C18,50 20,20 13,0 Z"
  },
  {
    id: BodyPartType.LOWER_LEG_L,
    parentId: BodyPartType.UPPER_LEG_L,
    name: "Calf L",
    length: 60,
    width: 20,
    jointRadius: 10, // Knee
    color: "#fca5a5", // Skin
    defaultAngle: 0,
    originX: 0,
    originY: 70,
    zIndex: 5,
    // Calf muscle
    shapePath: "M-10,0 C-14,15 -13,45 -7,60 L7,60 C13,45 14,15 10,0 Z"
  },
  {
    id: BodyPartType.FOOT_L,
    parentId: BodyPartType.LOWER_LEG_L,
    name: "Foot L",
    length: 20,
    width: 12,
    jointRadius: 8, // Ankle
    color: "#ffffff", // Shoe
    defaultAngle: 90,
    originX: 0,
    originY: 60,
    zIndex: 4,
    shapePath: "M-6,0 L6,0 L6,8 C6,18 2,22 -4,22 L-6,22 Z"
  },
  // Right Leg
  {
    id: BodyPartType.UPPER_LEG_R,
    parentId: BodyPartType.HIPS,
    name: "Thigh R",
    length: 70,
    width: 26,
    jointRadius: 13,
    color: "#1f2937",
    defaultAngle: -10,
    originX: 10,
    originY: 20,
    zIndex: 6,
    shapePath: "M-13,0 C-20,20 -18,50 -10,70 L10,70 C18,50 20,20 13,0 Z"
  },
  {
    id: BodyPartType.LOWER_LEG_R,
    parentId: BodyPartType.UPPER_LEG_R,
    name: "Calf R",
    length: 60,
    width: 20,
    jointRadius: 10,
    color: "#fca5a5",
    defaultAngle: 0,
    originX: 0,
    originY: 70,
    zIndex: 5,
    shapePath: "M-10,0 C-14,15 -13,45 -7,60 L7,60 C13,45 14,15 10,0 Z"
  },
  {
    id: BodyPartType.FOOT_R,
    parentId: BodyPartType.LOWER_LEG_R,
    name: "Foot R",
    length: 20,
    width: 12,
    jointRadius: 8,
    color: "#ffffff",
    defaultAngle: 90,
    originX: 0,
    originY: 60,
    zIndex: 4,
    shapePath: "M-6,0 L6,0 L6,8 C6,18 2,22 -4,22 L-6,22 Z"
  },
];

export const INITIAL_POSE: SkeletonState = SKELETON_DEF.reduce((acc, bone) => {
  acc[bone.id] = bone.defaultAngle;
  return acc;
}, {} as SkeletonState);

export const SAMPLE_PROPS = [
  {
    id: 'barbell',
    name: 'Barbell',
    path: 'M-120,-4 L120,-4 L120,4 L-120,4 Z M-80,-35 L-70,-35 L-70,35 L-80,35 Z M-92,-35 L-82,-35 L-82,35 L-92,35 Z M70,-35 L80,-35 L80,35 L70,35 Z M82,-35 L92,-35 L92,35 L82,35 Z M-65,-6 L-62,-6 L-62,6 L-65,6 Z M62,-6 L65,-6 L65,6 L62,6 Z',
    viewBox: "-125 -40 250 80",
    color: "#6b7280"
  },
  {
    id: 'dumbbell',
    name: 'Dumbbell',
    path: 'M-20,-2 L20,-2 L20,2 L-20,2 Z M-20,-10 L-10,-10 L-10,10 L-20,10 Z M10,-10 L20,-10 L20,10 L10,10 Z',
    viewBox: "-25 -15 50 30",
    color: "#6b7280"
  }
];

export const MIRROR_MAPPING: Record<BodyPartType, BodyPartType | undefined> = {
    [BodyPartType.UPPER_ARM_L]: BodyPartType.UPPER_ARM_R,
    [BodyPartType.UPPER_ARM_R]: BodyPartType.UPPER_ARM_L,
    [BodyPartType.LOWER_ARM_L]: BodyPartType.LOWER_ARM_R,
    [BodyPartType.LOWER_ARM_R]: BodyPartType.LOWER_ARM_L,
    [BodyPartType.HAND_L]: BodyPartType.HAND_R,
    [BodyPartType.HAND_R]: BodyPartType.HAND_L,
    [BodyPartType.UPPER_LEG_L]: BodyPartType.UPPER_LEG_R,
    [BodyPartType.UPPER_LEG_R]: BodyPartType.UPPER_LEG_L,
    [BodyPartType.LOWER_LEG_L]: BodyPartType.LOWER_LEG_R,
    [BodyPartType.LOWER_LEG_R]: BodyPartType.LOWER_LEG_L,
    [BodyPartType.FOOT_L]: BodyPartType.FOOT_R,
    [BodyPartType.FOOT_R]: BodyPartType.FOOT_L,
    [BodyPartType.ROOT]: undefined,
    [BodyPartType.TORSO]: undefined,
    [BodyPartType.HIPS]: undefined,
    [BodyPartType.HEAD]: undefined,
    [BodyPartType.NECK]: undefined,
};

export const IK_CHAINS: Record<string, { upper: BodyPartType, lower: BodyPartType, end: BodyPartType }> = {
    [BodyPartType.HAND_L]: { upper: BodyPartType.UPPER_ARM_L, lower: BodyPartType.LOWER_ARM_L, end: BodyPartType.HAND_L },
    [BodyPartType.HAND_R]: { upper: BodyPartType.UPPER_ARM_R, lower: BodyPartType.LOWER_ARM_R, end: BodyPartType.HAND_R },
    [BodyPartType.FOOT_L]: { upper: BodyPartType.UPPER_LEG_L, lower: BodyPartType.LOWER_LEG_L, end: BodyPartType.FOOT_L },
    [BodyPartType.FOOT_R]: { upper: BodyPartType.UPPER_LEG_R, lower: BodyPartType.LOWER_LEG_R, end: BodyPartType.FOOT_R },
};