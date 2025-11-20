import { BodyPartType, Bone, SkeletonState } from './types';

// Helper for capsule shapes
const capsule = (w: number, h: number) => 
  `M${w/2},0 A${w/2},${w/2} 0 1,1 ${w/2},${w} V${h-w/2} A${w/2},${w/2} 0 1,1 ${w/2},${h} Z`;

// A simplified head shape
const headPath = "M0,-25 C-15,-25 -20,-10 -20,10 C-20,35 -10,45 0,45 C10,45 20,35 20,10 C20,-10 15,-25 0,-25 Z";

export const SKELETON_DEF: Bone[] = [
  {
    id: BodyPartType.ROOT,
    parentId: null,
    name: "Waist (Root)",
    length: 0,
    width: 0,
    color: "#d97706", // Amber belt
    defaultAngle: 0,
    originX: 200,
    originY: 320,
    zIndex: 15,
    shapePath: "M-17,-5 L17,-5 L17,5 L-17,5 Z"
  },
  {
    id: BodyPartType.TORSO,
    parentId: BodyPartType.ROOT,
    name: "Torso",
    length: 70,
    width: 40,
    color: "#3b82f6", // Gym shirt blue
    defaultAngle: 0,
    originX: 0,
    originY: 0,
    zIndex: 10,
    // Drawn upwards from waist (0,0) to shoulders (Y=-70)
    shapePath: "M-16,0 L16,0 L22,-70 L-22,-70 Z" 
  },
  {
    id: BodyPartType.HIPS,
    parentId: BodyPartType.ROOT,
    name: "Hips",
    length: 30,
    width: 40,
    color: "#1f2937", // Shorts dark grey
    defaultAngle: 0,
    originX: 0,
    originY: 0,
    zIndex: 12,
    // Drawn downwards from waist (0,0) to legs area
    shapePath: "M-16,0 L16,0 L14,25 L-14,25 Z"
  },
  {
    id: BodyPartType.HEAD,
    parentId: BodyPartType.TORSO,
    name: "Head",
    length: 50,
    width: 40,
    color: "#fca5a5", // Skin tone
    defaultAngle: 0,
    originX: 0,
    originY: -70, // Relative to Torso top
    zIndex: 20,
    shapePath: headPath
  },
  // Left Arm
  {
    id: BodyPartType.UPPER_ARM_L,
    parentId: BodyPartType.TORSO,
    name: "Upper Arm L",
    length: 60,
    width: 18,
    color: "#3b82f6", // Shirt sleeve
    defaultAngle: 45,
    originX: -22,
    originY: -65, // Near shoulder
    zIndex: 5,
    shapePath: "M-9,0 L9,0 L7,60 L-7,60 Z"
  },
  {
    id: BodyPartType.LOWER_ARM_L,
    parentId: BodyPartType.UPPER_ARM_L,
    name: "Lower Arm L",
    length: 50,
    width: 14,
    color: "#fca5a5",
    defaultAngle: 10,
    originX: 0,
    originY: 60,
    zIndex: 4,
    shapePath: "M-7,0 L7,0 L5,50 L-5,50 Z"
  },
  {
    id: BodyPartType.HAND_L,
    parentId: BodyPartType.LOWER_ARM_L,
    name: "Hand L",
    length: 15,
    width: 15,
    color: "#fca5a5",
    defaultAngle: 0,
    originX: 0,
    originY: 50,
    zIndex: 3,
    shapePath: "M-6,0 L6,0 L4,15 L-4,15 Z"
  },
  // Right Arm
  {
    id: BodyPartType.UPPER_ARM_R,
    parentId: BodyPartType.TORSO,
    name: "Upper Arm R",
    length: 60,
    width: 18,
    color: "#3b82f6",
    defaultAngle: -45,
    originX: 22,
    originY: -65,
    zIndex: 5,
    shapePath: "M-9,0 L9,0 L7,60 L-7,60 Z"
  },
  {
    id: BodyPartType.LOWER_ARM_R,
    parentId: BodyPartType.UPPER_ARM_R,
    name: "Lower Arm R",
    length: 50,
    width: 14,
    color: "#fca5a5",
    defaultAngle: -10,
    originX: 0,
    originY: 60,
    zIndex: 4,
    shapePath: "M-7,0 L7,0 L5,50 L-5,50 Z"
  },
  {
    id: BodyPartType.HAND_R,
    parentId: BodyPartType.LOWER_ARM_R,
    name: "Hand R",
    length: 15,
    width: 15,
    color: "#fca5a5",
    defaultAngle: 0,
    originX: 0,
    originY: 50,
    zIndex: 3,
    shapePath: "M-6,0 L6,0 L4,15 L-4,15 Z"
  },
  // Left Leg
  {
    id: BodyPartType.UPPER_LEG_L,
    parentId: BodyPartType.HIPS,
    name: "Thigh L",
    length: 70,
    width: 22,
    color: "#1f2937", // Shorts dark grey
    defaultAngle: 10,
    originX: -10,
    originY: 20, // Relative to Hips
    zIndex: 6,
    shapePath: "M-11,0 L11,0 L8,70 L-8,70 Z"
  },
  {
    id: BodyPartType.LOWER_LEG_L,
    parentId: BodyPartType.UPPER_LEG_L,
    name: "Calf L",
    length: 60,
    width: 16,
    color: "#fca5a5",
    defaultAngle: 0,
    originX: 0,
    originY: 70,
    zIndex: 5,
    shapePath: "M-8,0 L8,0 L5,60 L-5,60 Z"
  },
  {
    id: BodyPartType.FOOT_L,
    parentId: BodyPartType.LOWER_LEG_L,
    name: "Foot L",
    length: 20,
    width: 12,
    color: "#ffffff", // Shoe
    defaultAngle: 90,
    originX: 0,
    originY: 60,
    zIndex: 4,
    shapePath: "M-6,0 L6,0 L6,20 L-6,20 Z"
  },
  // Right Leg
  {
    id: BodyPartType.UPPER_LEG_R,
    parentId: BodyPartType.HIPS,
    name: "Thigh R",
    length: 70,
    width: 22,
    color: "#1f2937",
    defaultAngle: -10,
    originX: 10,
    originY: 20,
    zIndex: 6,
    shapePath: "M-11,0 L11,0 L8,70 L-8,70 Z"
  },
  {
    id: BodyPartType.LOWER_LEG_R,
    parentId: BodyPartType.UPPER_LEG_R,
    name: "Calf R",
    length: 60,
    width: 16,
    color: "#fca5a5",
    defaultAngle: 0,
    originX: 0,
    originY: 70,
    zIndex: 5,
    shapePath: "M-8,0 L8,0 L5,60 L-5,60 Z"
  },
  {
    id: BodyPartType.FOOT_R,
    parentId: BodyPartType.LOWER_LEG_R,
    name: "Foot R",
    length: 20,
    width: 12,
    color: "#ffffff",
    defaultAngle: 90,
    originX: 0,
    originY: 60,
    zIndex: 4,
    shapePath: "M-6,0 L6,0 L6,20 L-6,20 Z"
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
};

export const IK_CHAINS: Record<string, { upper: BodyPartType, lower: BodyPartType, end: BodyPartType }> = {
    [BodyPartType.HAND_L]: { upper: BodyPartType.UPPER_ARM_L, lower: BodyPartType.LOWER_ARM_L, end: BodyPartType.HAND_L },
    [BodyPartType.HAND_R]: { upper: BodyPartType.UPPER_ARM_R, lower: BodyPartType.LOWER_ARM_R, end: BodyPartType.HAND_R },
    [BodyPartType.FOOT_L]: { upper: BodyPartType.UPPER_LEG_L, lower: BodyPartType.LOWER_LEG_L, end: BodyPartType.FOOT_L },
    [BodyPartType.FOOT_R]: { upper: BodyPartType.UPPER_LEG_R, lower: BodyPartType.LOWER_LEG_R, end: BodyPartType.FOOT_R },
};