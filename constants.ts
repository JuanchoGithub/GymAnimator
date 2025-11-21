
import { BodyPartType, Bone, SkeletonState, GymProp, ViewType } from './types';

// --- SKELETON DEFINITIONS ---

const createBone = (
    base: Partial<Bone>, 
    front: {p: string, x: number, y: number, z: number},
    side: {p: string, x: number, y: number, z: number},
    top: {p: string, x: number, y: number, z: number}
): Bone => {
    return {
        length: 0, width: 0, jointRadius: 0, defaultAngle: 0, color: "#fca5a5",
        ...base,
        views: {
            FRONT: { path: front.p, originX: front.x, originY: front.y, zIndex: front.z },
            SIDE: { path: side.p, originX: side.x, originY: side.y, zIndex: side.z },
            TOP: { path: top.p, originX: top.x, originY: top.y, zIndex: top.z },
        }
    } as Bone;
};

export const SKELETON_DEF: Bone[] = [
  createBone({ id: BodyPartType.ROOT, parentId: null, name: "Waist", color: "#d97706", originX: 200, originY: 320 },
    { p: "M-17,-6 L17,-6 L17,6 L-17,6 Z", x: 200, y: 320, z: 15 }, // Front
    { p: "M-10,-6 L10,-6 L10,6 L-10,6 Z", x: 200, y: 320, z: 15 }, // Side (thinner)
    { p: "M-17,-10 L17,-10 L17,10 L-17,10 Z", x: 200, y: 200, z: 15 }  // Top (looking down at waist)
  ),
  createBone({ id: BodyPartType.TORSO, parentId: BodyPartType.ROOT, name: "Torso", color: "#3b82f6", jointRadius: 15 },
    { p: "M-15,0 C-15,0 -30,-45 -36,-75 L36,-75 C30,-45 15,0 15,0 Z", x: 0, y: 0, z: 10 },
    { p: "M-12,0 L-12,-75 L18,-75 C22,-45 20,0 12,0 Z", x: 0, y: 0, z: 10 }, // Side: Kyphosis curve
    { p: "M-36,-15 L36,-15 L36,15 L-36,15 Z", x: 0, y: 0, z: 10 } // Top: Cross section shoulders
  ),
  createBone({ id: BodyPartType.NECK, parentId: BodyPartType.TORSO, name: "Neck", color: "#fca5a5", jointRadius: 8 },
    { p: "M-7,0 L7,0 L7,-12 L-7,-12 Z", x: 0, y: -75, z: 9 },
    { p: "M-6,0 L6,0 L8,-12 L-4,-12 Z", x: 4, y: -75, z: 9 }, // Side: angled forward
    { p: "M-7,-7 L7,-7 L7,7 L-7,7 Z", x: 0, y: -10, z: 9 } // Top: circle-ish
  ),
  createBone({ id: BodyPartType.HEAD, parentId: BodyPartType.NECK, name: "Head", color: "#fca5a5", jointRadius: 0 },
    { p: "M-9,10 L9,10 L13,-5 L14,-25 C14,-45 8,-50 0,-50 C-8,-50 -14,-45 -14,-25 L-13,-5 Z", x: 0, y: -12, z: 20 },
    { p: "M-10,10 L10,10 L14,-5 L14,-25 C14,-45 0,-50 -10,-45 L-10,-25 L-14,-5 Z", x: 2, y: -10, z: 20 }, // Side profile
    { p: "M-12,-12 L12,-12 L12,12 L-12,12 Z", x: 0, y: 0, z: 20 } // Top of head
  ),
  createBone({ id: BodyPartType.HIPS, parentId: BodyPartType.ROOT, name: "Hips", color: "#1f2937", jointRadius: 16 },
    { p: "M-16,0 L16,0 C16,0 20,20 14,25 L-14,25 C-20,20 -16,0 -16,0 Z", x: 0, y: 0, z: 12 },
    { p: "M-14,0 L14,0 L16,25 L-12,25 Z", x: 0, y: 0, z: 12 }, // Side
    { p: "M-16,-14 L16,-14 L16,14 L-16,14 Z", x: 0, y: 0, z: 12 } // Top
  ),
  // Left Arm
  createBone({ id: BodyPartType.UPPER_ARM_L, parentId: BodyPartType.TORSO, name: "Upper Arm L", defaultAngle: 45, color: "#fca5a5", length: 60 },
    { p: "M-12,0 C-17,15 -17,40 -10,60 L10,60 C17,40 17,15 12,0 Z", x: -30, y: -70, z: 5 },
    { p: "M-10,0 L10,0 L8,60 L-8,60 Z", x: 0, y: -70, z: 5 }, // Side cylinder
    { p: "M-10,0 L10,0 L8,60 L-8,60 Z", x: -35, y: 0, z: 5 } // Top cylinder (projection)
  ),
  createBone({ id: BodyPartType.LOWER_ARM_L, parentId: BodyPartType.UPPER_ARM_L, name: "Lower Arm L", defaultAngle: 10, color: "#fca5a5", length: 50 },
    { p: "M-10,0 C-13,10 -12,35 -7,50 L7,50 C12,35 13,10 10,0 Z", x: 0, y: 60, z: 4 },
    { p: "M-8,0 L8,0 L6,50 L-6,50 Z", x: 0, y: 60, z: 4 },
    { p: "M-8,0 L8,0 L6,50 L-6,50 Z", x: 0, y: 60, z: 4 }
  ),
  createBone({ id: BodyPartType.HAND_L, parentId: BodyPartType.LOWER_ARM_L, name: "Hand L", color: "#fca5a5", length: 15 },
    { p: "M-6,0 L6,0 L6,0 L5,15 L-5,15 Z", x: 0, y: 50, z: 3 },
    { p: "M-6,0 L6,0 L6,0 L5,15 L-5,15 Z", x: 0, y: 50, z: 3 },
    { p: "M-6,0 L6,0 L6,0 L5,15 L-5,15 Z", x: 0, y: 50, z: 3 }
  ),
  // Right Arm
  createBone({ id: BodyPartType.UPPER_ARM_R, parentId: BodyPartType.TORSO, name: "Upper Arm R", defaultAngle: -45, color: "#fca5a5", length: 60 },
    { p: "M-12,0 C-17,15 -17,40 -10,60 L10,60 C17,40 17,15 12,0 Z", x: 30, y: -70, z: 5 },
    { p: "M-10,0 L10,0 L8,60 L-8,60 Z", x: 0, y: -70, z: 5 },
    { p: "M-10,0 L10,0 L8,60 L-8,60 Z", x: 35, y: 0, z: 5 }
  ),
  createBone({ id: BodyPartType.LOWER_ARM_R, parentId: BodyPartType.UPPER_ARM_R, name: "Lower Arm R", defaultAngle: -10, color: "#fca5a5", length: 50 },
    { p: "M-10,0 C-13,10 -12,35 -7,50 L7,50 C12,35 13,10 10,0 Z", x: 0, y: 60, z: 4 },
    { p: "M-8,0 L8,0 L6,50 L-6,50 Z", x: 0, y: 60, z: 4 },
    { p: "M-8,0 L8,0 L6,50 L-6,50 Z", x: 0, y: 60, z: 4 }
  ),
  createBone({ id: BodyPartType.HAND_R, parentId: BodyPartType.LOWER_ARM_R, name: "Hand R", color: "#fca5a5", length: 15 },
    { p: "M-6,0 L6,0 L6,0 L5,15 L-5,15 Z", x: 0, y: 50, z: 3 },
    { p: "M-6,0 L6,0 L6,0 L5,15 L-5,15 Z", x: 0, y: 50, z: 3 },
    { p: "M-6,0 L6,0 L6,0 L5,15 L-5,15 Z", x: 0, y: 50, z: 3 }
  ),
  // Legs
  createBone({ id: BodyPartType.UPPER_LEG_L, parentId: BodyPartType.HIPS, name: "Thigh L", defaultAngle: 10, color: "#1f2937", length: 70 },
    { p: "M-13,0 C-20,20 -18,50 -10,70 L10,70 C18,50 20,20 13,0 Z", x: -10, y: 20, z: 6 },
    { p: "M-14,0 L14,0 L10,70 L-10,70 Z", x: 0, y: 20, z: 6 },
    { p: "M-14,0 L14,0 L10,70 L-10,70 Z", x: -10, y: 0, z: 6 }
  ),
  createBone({ id: BodyPartType.LOWER_LEG_L, parentId: BodyPartType.UPPER_LEG_L, name: "Calf L", color: "#fca5a5", length: 60 },
    { p: "M-10,0 C-14,15 -13,45 -7,60 L7,60 C13,45 14,15 10,0 Z", x: 0, y: 70, z: 5 },
    { p: "M-10,0 L10,0 L8,60 L-8,60 Z", x: 0, y: 70, z: 5 },
    { p: "M-10,0 L10,0 L8,60 L-8,60 Z", x: 0, y: 70, z: 5 }
  ),
  createBone({ id: BodyPartType.FOOT_L, parentId: BodyPartType.LOWER_LEG_L, name: "Foot L", defaultAngle: 90, color: "#ffffff", length: 20 },
    { p: "M-6,0 L6,0 L6,8 C6,18 2,22 -4,22 L-6,22 Z", x: 0, y: 60, z: 4 },
    { p: "M-5,0 L5,0 L5,8 L15,22 L-5,22 Z", x: 0, y: 60, z: 4 }, // Side: Points Right (+X)
    { p: "M-6,0 L6,0 L6,25 L-6,25 Z", x: 0, y: 60, z: 4 }
  ),
   createBone({ id: BodyPartType.UPPER_LEG_R, parentId: BodyPartType.HIPS, name: "Thigh R", defaultAngle: -10, color: "#1f2937", length: 70 },
    { p: "M-13,0 C-20,20 -18,50 -10,70 L10,70 C18,50 20,20 13,0 Z", x: 10, y: 20, z: 6 },
    { p: "M-14,0 L14,0 L10,70 L-10,70 Z", x: 0, y: 20, z: 6 },
    { p: "M-14,0 L14,0 L10,70 L-10,70 Z", x: 10, y: 0, z: 6 }
  ),
  createBone({ id: BodyPartType.LOWER_LEG_R, parentId: BodyPartType.UPPER_LEG_R, name: "Calf R", color: "#fca5a5", length: 60 },
    { p: "M-10,0 C-14,15 -13,45 -7,60 L7,60 C13,45 14,15 10,0 Z", x: 0, y: 70, z: 5 },
    { p: "M-10,0 L10,0 L8,60 L-8,60 Z", x: 0, y: 70, z: 5 },
    { p: "M-10,0 L10,0 L8,60 L-8,60 Z", x: 0, y: 70, z: 5 }
  ),
  createBone({ id: BodyPartType.FOOT_R, parentId: BodyPartType.LOWER_LEG_R, name: "Foot R", defaultAngle: 90, color: "#ffffff", length: 20 },
    { p: "M-6,0 L6,0 L6,8 C6,18 2,22 -4,22 L-6,22 Z", x: 0, y: 60, z: 4 },
    { p: "M-5,0 L5,0 L5,8 L15,22 L-5,22 Z", x: 0, y: 60, z: 4 }, // Side: Points Right (+X)
    { p: "M-6,0 L6,0 L6,25 L-6,25 Z", x: 0, y: 60, z: 4 }
  ),
];

export const INITIAL_POSE: SkeletonState = SKELETON_DEF.reduce((acc, bone) => {
  // Initialize separate rotations for each view.
  // We can provide some smarter defaults if we want, but 0 is safe (Straight down).
  // For Top view arms, 90/-90 is a good starting point to look "T-pose-ish"
  let topAngle = 0;
  if (bone.id === BodyPartType.UPPER_ARM_L) topAngle = 90;
  if (bone.id === BodyPartType.UPPER_ARM_R) topAngle = -90;

  acc[bone.id] = {
      FRONT: bone.defaultAngle,
      SIDE: 0,
      TOP: topAngle
  };
  return acc;
}, {} as SkeletonState);

// --- PROP DEFINITIONS ---

const createProp = (base: Partial<GymProp>, frontV: string, sideV: string, topV: string): Omit<GymProp, 'id' | 'attachedTo'> => {
    return {
        snapPoints: [], color: '#6b7280',
        ...base,
        views: {
            FRONT: { path: frontV, viewBox: base.views?.FRONT?.viewBox || "-100 -100 200 200" },
            SIDE: { path: sideV, viewBox: base.views?.SIDE?.viewBox || "-100 -100 200 200" },
            TOP: { path: topV, viewBox: base.views?.TOP?.viewBox || "-100 -100 200 200" },
        },
        transforms: {
            FRONT: { x: 200, y: 350, rotation: 0, scaleX: 1, scaleY: 1 },
            SIDE: { x: 200, y: 350, rotation: 0, scaleX: 1, scaleY: 1 },
            TOP: { x: 200, y: 200, rotation: 0, scaleX: 1, scaleY: 1 },
        }
    } as any;
};

export const SAMPLE_PROPS = [
  createProp(
    {
        name: 'Barbell', 
        views: { FRONT: { viewBox: "-190 -40 380 80" } } as any,
        snapPoints: [{ id: 'center', name: 'Center', x: 0, y: 0 }, { id: 'wide_l', name: 'Wide L', x: -110, y: 0 }, { id: 'wide_r', name: 'Wide R', x: 110, y: 0 }]
    },
    'M-180,-4 L180,-4 L180,4 L-180,4 Z M-140,-35 L-130,-35 L-130,35 L-140,35 Z M-152,-35 L-142,-35 L-142,35 L-152,35 Z M130,-35 L140,-35 L140,35 L130,35 Z M142,-35 L152,-35 L152,35 L142,35 Z',
    'M-4,-4 L4,-4 L4,4 L-4,4 Z M-35,-35 L35,-35 L35,35 L-35,35 Z', // Side: Just the plate and end of bar
    'M-180,-4 L180,-4 L180,4 L-180,4 Z M-140,-5 L-130,-5 L-130,5 L-140,5 Z M130,-5 L140,-5 L140,5 L130,5 Z' // Top: Bar and thin plates
  ),
  createProp(
      {
        name: 'Dumbbell',
        views: { FRONT: { viewBox: "-35 -15 70 30" } } as any,
        snapPoints: [{ id: 'center', name: 'Handle', x: 0, y: 0 }]
      },
      'M-30,-3 L30,-3 L30,3 L-30,3 Z M-30,-12 L-15,-12 L-15,12 L-30,12 Z M15,-12 L30,-12 L30,12 L15,12 Z',
      'M-3,-3 L3,-3 L3,3 L-3,3 Z M-12,-12 L12,-12 L12,12 L-12,12 Z', // Side: Hexagon/Circle
      'M-30,-3 L30,-3 L30,3 L-30,3 Z M-30,-12 L-15,-12 L-15,12 L-30,12 Z' // Top: Looks like front
  ),
  createProp(
      {
        name: 'Bench (Flat)',
        color: "#374151", stroke: "#9ca3af", strokeWidth: 2, layer: 'back',
        views: { FRONT: { viewBox: "-30 -100 60 200" } } as any,
        snapPoints: [{ id: 'head', name: 'Head', x: 0, y: -80 }, { id: 'center', name: 'Center', x: 0, y: 0 }]
      },
      'M-90,-20 L90,-20 L90,-10 L-90,-10 Z M-80,-10 L-80,20 M80,-10 L80,20', // Side of bench (seen from Front of screen)
      'M-20,-20 L20,-20 L20,-10 L-20,-10 Z M-15,-10 L-15,20 M15,-10 L15,20', // End of bench (seen from Side of screen)
      'M-90,-20 L90,-20 L90,20 L-90,20 Z' // Top of bench
  )
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
