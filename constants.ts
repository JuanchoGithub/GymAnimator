
import { BodyPartType, Bone, SkeletonState, GymProp, ViewType, PropType, MuscleGroup } from './types';

// --- MUSCLE MAPPING ---
export const MUSCLE_OVERLAYS: Partial<Record<MuscleGroup, Partial<Record<BodyPartType, Partial<Record<ViewType, string>>>>>> = {
    [MuscleGroup.CHEST]: {
        [BodyPartType.TORSO]: {
            FRONT: "M-36,-75 L36,-75 L28,-45 L-28,-45 Z", // Upper Chest
            SIDE: "M0,-75 L28,-75 C32,-55 28,-40 20,-40 L0,-40 Z", // Upper Front
            TOP: "M-42,-18 C-42,-18 0,-26 42,-18 L42,0 L-42,0 Z"
        }
    },
    [MuscleGroup.ABS]: {
        [BodyPartType.TORSO]: {
            FRONT: "M-20,-45 L20,-45 L12,0 L-12,0 Z", // Lower Center
            SIDE: "M0,-40 L20,-40 C20,-10 15,0 15,0 L0,0 Z" // Lower Front
        }
    },
    [MuscleGroup.BACK]: {
        [BodyPartType.TORSO]: {
             FRONT: "M-36,-75 L-28,-45 L-15,0 L-22,-20 L-36,-60 Z M36,-75 L28,-45 L15,0 L22,-20 L36,-60 Z", // Lats wings
             SIDE: "M0,-75 L-20,-75 C-18,-40 -15,-10 -15,0 L0,0 Z", // Back curve
             TOP: "M-42,-18 C-42,-18 0,-26 42,-18 L42,-18 L42,-30 L-42,-30 Z" 
        }
    },
    [MuscleGroup.BICEPS]: {
        [BodyPartType.UPPER_ARM_L]: {
            FRONT: "M-6,10 C-12,20 -12,40 -6,50 L6,50 C12,40 12,20 6,10 Z", // Center/Inner
            SIDE: "M0,10 L11,10 C18,30 18,45 10,55 L0,55 Z" // Front half
        },
        [BodyPartType.UPPER_ARM_R]: {
            FRONT: "M-6,10 C-12,20 -12,40 -6,50 L6,50 C12,40 12,20 6,10 Z",
            SIDE: "M0,10 L11,10 C18,30 18,45 10,55 L0,55 Z"
        }
    },
    [MuscleGroup.TRICEPS]: {
         [BodyPartType.UPPER_ARM_L]: {
            FRONT: "M-10,10 L-6,10 L-6,50 L-10,50 Z M10,10 L6,10 L6,50 L10,50 Z", // Sides
            SIDE: "M0,10 L-11,10 C-18,30 -18,45 -10,55 L0,55 Z" // Back half
        },
        [BodyPartType.UPPER_ARM_R]: {
            FRONT: "M-10,10 L-6,10 L-6,50 L-10,50 Z M10,10 L6,10 L6,50 L10,50 Z",
            SIDE: "M0,10 L-11,10 C-18,30 -18,45 -10,55 L0,55 Z"
        }
    },
    [MuscleGroup.QUADS]: {
        [BodyPartType.UPPER_LEG_L]: {
            FRONT: "M-8,10 C-14,25 -12,50 -6,60 L6,60 C12,50 14,25 8,10 Z", // Front center
            SIDE: "M0,10 L12,10 C18,30 18,50 10,60 L0,60 Z" // Front half
        },
        [BodyPartType.UPPER_LEG_R]: {
            FRONT: "M-8,10 C-14,25 -12,50 -6,60 L6,60 C12,50 14,25 8,10 Z",
            SIDE: "M0,10 L12,10 C18,30 18,50 10,60 L0,60 Z"
        }
    },
    [MuscleGroup.HAMSTRINGS]: {
        [BodyPartType.UPPER_LEG_L]: {
            SIDE: "M0,10 L-12,10 C-18,30 -18,50 -10,60 L0,60 Z" // Back half
        },
        [BodyPartType.UPPER_LEG_R]: {
             SIDE: "M0,10 L-12,10 C-18,30 -18,50 -10,60 L0,60 Z"
        }
    },
     [MuscleGroup.CALVES]: {
        [BodyPartType.LOWER_LEG_L]: {
             FRONT: "M-6,10 C-10,20 -10,40 -4,50 L4,50 C10,40 10,20 6,10 Z",
             SIDE: "M0,10 L-8,10 C-14,25 -12,45 -6,55 L0,55 Z" // Back of lower leg
        },
        [BodyPartType.LOWER_LEG_R]: {
             FRONT: "M-6,10 C-10,20 -10,40 -4,50 L4,50 C10,40 10,20 6,10 Z",
             SIDE: "M0,10 L-8,10 C-14,25 -12,45 -6,55 L0,55 Z"
        }
    }
};

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
    { p: "M-17,-6 L17,-6 L17,6 L-17,6 Z", x: 200, y: 320, z: 15 }, 
    { p: "M-16,-6 L16,-6 L16,6 L-16,6 Z", x: 200, y: 320, z: 15 }, // Side: Thicker
    { p: "M-18,-12 L18,-12 L18,12 L-18,12 Z", x: 200, y: 200, z: 5 }  // Top: Thicker, Z=5 (Below Torso)
  ),
  createBone({ id: BodyPartType.TORSO, parentId: BodyPartType.ROOT, name: "Torso", color: "#3b82f6", jointRadius: 15 },
    { p: "M-15,0 C-15,0 -30,-45 -36,-75 L36,-75 C30,-45 15,0 15,0 Z", x: 0, y: 0, z: 10 },
    { p: "M-15,0 C-15,-10 -18,-40 -20,-75 L28,-75 C34,-45 25,-10 15,0 Z", x: 0, y: 0, z: 10 }, // Side: Chest/Lat spread
    { p: "M-42,-18 C-42,-18 0,-26 42,-18 L42,18 C42,18 0,26 -42,18 Z", x: 0, y: 0, z: 10 } // Top: Broad oval shoulders
  ),
  createBone({ id: BodyPartType.NECK, parentId: BodyPartType.TORSO, name: "Neck", color: "#fca5a5", jointRadius: 8 },
    { p: "M-7,0 L7,0 L7,-12 L-7,-12 Z", x: 0, y: -75, z: 9 },
    { p: "M-8,0 L8,0 L10,-12 L-4,-12 Z", x: 4, y: -75, z: 9 }, // Side: Thicker, angled
    { p: "M-9,-9 L9,-9 L9,9 L-9,9 Z", x: 0, y: -10, z: 11 } // Top: Z=11 (Above Torso)
  ),
  createBone({ id: BodyPartType.HEAD, parentId: BodyPartType.NECK, name: "Head", color: "#fca5a5", jointRadius: 0 },
    { p: "M-9,10 L9,10 L13,-5 L14,-25 C14,-45 8,-50 0,-50 C-8,-50 -14,-45 -14,-25 L-13,-5 Z", x: 0, y: -12, z: 20 },
    { p: "M-11,10 L11,10 L15,-5 L15,-25 C15,-45 0,-50 -11,-45 L-11,-25 L-15,-5 Z", x: 2, y: -10, z: 20 }, 
    { p: "M-13,-13 L13,-13 L13,13 L-13,13 Z", x: 0, y: 0, z: 20 } 
  ),
  createBone({ id: BodyPartType.HIPS, parentId: BodyPartType.ROOT, name: "Hips", color: "#1f2937", jointRadius: 16 },
    { p: "M-16,0 L16,0 C16,0 20,20 14,25 L-14,25 C-20,20 -16,0 -16,0 Z", x: 0, y: 0, z: 12 },
    { p: "M-16,0 L16,0 C20,10 20,20 16,25 L-18,25 C-24,15 -22,5 -16,0 Z", x: 0, y: 0, z: 8 }, // Side: Glutes
    { p: "M-18,-16 L18,-16 L18,16 L-18,16 Z", x: 0, y: 0, z: 4 } // Top: Z=4 (Below Root)
  ),
  // Left Arm
  createBone({ id: BodyPartType.UPPER_ARM_L, parentId: BodyPartType.TORSO, name: "Upper Arm L", defaultAngle: 45, color: "#fca5a5", length: 60 },
    { p: "M-12,0 C-17,15 -17,40 -10,60 L10,60 C17,40 17,15 12,0 Z", x: -30, y: -70, z: 5 },
    { p: "M-13,0 C-20,20 -18,45 -11,60 L11,60 C18,45 20,20 13,0 Z", x: 0, y: -70, z: 5 }, // Side: Buff
    { p: "M-13,0 C-18,20 -18,40 -11,60 L11,60 C18,40 18,20 13,0 Z", x: -35, y: 0, z: 5 } // Top: Buff
  ),
  createBone({ id: BodyPartType.LOWER_ARM_L, parentId: BodyPartType.UPPER_ARM_L, name: "Lower Arm L", defaultAngle: 10, color: "#fca5a5", length: 50 },
    { p: "M-10,0 C-13,10 -12,35 -7,50 L7,50 C12,35 13,10 10,0 Z", x: 0, y: 60, z: 4 },
    { p: "M-11,0 C-15,15 -13,35 -8,50 L8,50 C13,35 15,15 11,0 Z", x: 0, y: 60, z: 4 },
    { p: "M-11,0 C-15,15 -13,35 -8,50 L8,50 C13,35 15,15 11,0 Z", x: 0, y: 60, z: 4 }
  ),
  createBone({ id: BodyPartType.HAND_L, parentId: BodyPartType.LOWER_ARM_L, name: "Hand L", color: "#fca5a5", length: 15 },
    { p: "M-6,0 L6,0 L6,0 L5,15 L-5,15 Z", x: 0, y: 50, z: 3 },
    { p: "M-7,0 L7,0 L7,5 L6,15 L-6,15 L-7,5 Z", x: 0, y: 50, z: 3 },
    { p: "M-7,0 L7,0 L7,5 L6,15 L-6,15 L-7,5 Z", x: 0, y: 50, z: 3 }
  ),
  // Right Arm
  createBone({ id: BodyPartType.UPPER_ARM_R, parentId: BodyPartType.TORSO, name: "Upper Arm R", defaultAngle: -45, color: "#fca5a5", length: 60 },
    { p: "M-12,0 C-17,15 -17,40 -10,60 L10,60 C17,40 17,15 12,0 Z", x: 30, y: -70, z: 5 },
    { p: "M-13,0 C-20,20 -18,45 -11,60 L11,60 C18,45 20,20 13,0 Z", x: 0, y: -70, z: 25 },
    { p: "M-13,0 C-18,20 -18,40 -11,60 L11,60 C18,40 18,20 13,0 Z", x: 35, y: 0, z: 5 }
  ),
  createBone({ id: BodyPartType.LOWER_ARM_R, parentId: BodyPartType.UPPER_ARM_R, name: "Lower Arm R", defaultAngle: -10, color: "#fca5a5", length: 50 },
    { p: "M-10,0 C-13,10 -12,35 -7,50 L7,50 C12,35 13,10 10,0 Z", x: 0, y: 60, z: 4 },
    { p: "M-11,0 C-15,15 -13,35 -8,50 L8,50 C13,35 15,15 11,0 Z", x: 0, y: 60, z: 26 },
    { p: "M-11,0 C-15,15 -13,35 -8,50 L8,50 C13,35 15,15 11,0 Z", x: 0, y: 60, z: 4 }
  ),
  createBone({ id: BodyPartType.HAND_R, parentId: BodyPartType.LOWER_ARM_R, name: "Hand R", color: "#fca5a5", length: 15 },
    { p: "M-6,0 L6,0 L6,0 L5,15 L-5,15 Z", x: 0, y: 50, z: 3 },
    { p: "M-7,0 L7,0 L7,5 L6,15 L-6,15 L-7,5 Z", x: 0, y: 50, z: 27 },
    { p: "M-7,0 L7,0 L7,5 L6,15 L-6,15 L-7,5 Z", x: 0, y: 50, z: 3 }
  ),
  // Legs
  createBone({ id: BodyPartType.UPPER_LEG_L, parentId: BodyPartType.HIPS, name: "Thigh L", defaultAngle: 10, color: "#1f2937", length: 70 },
    { p: "M-13,0 C-20,20 -18,50 -10,70 L10,70 C18,50 20,20 13,0 Z", x: -10, y: 20, z: 6 },
    { p: "M-16,0 C-22,20 -20,50 -12,70 L12,70 C22,50 22,20 16,0 Z", x: 0, y: 20, z: 6 }, // Side: Buff
    { p: "M-16,0 C-20,20 -20,50 -12,70 L12,70 C20,50 20,20 16,0 Z", x: -10, y: 0, z: 6 } // Top: Buff
  ),
  createBone({ id: BodyPartType.LOWER_LEG_L, parentId: BodyPartType.UPPER_LEG_L, name: "Calf L", color: "#fca5a5", length: 60 },
    { p: "M-10,0 C-14,15 -13,45 -7,60 L7,60 C13,45 14,15 10,0 Z", x: 0, y: 70, z: 5 },
    { p: "M-11,0 C-18,20 -14,45 -8,60 L8,60 C11,45 12,15 11,0 Z", x: 0, y: 70, z: 5 }, // Side: Calf
    { p: "M-11,0 C-15,20 -15,45 -8,60 L8,60 C15,45 15,20 11,0 Z", x: 0, y: 70, z: 5 }
  ),
  createBone({ id: BodyPartType.FOOT_L, parentId: BodyPartType.LOWER_LEG_L, name: "Foot L", defaultAngle: 90, color: "#ffffff", length: 20 },
    { p: "M-6,0 L6,0 L6,8 C6,18 2,22 -4,22 L-6,22 Z", x: 0, y: 60, z: 4 },
    { p: "M-6,0 L6,0 L6,8 L16,22 L-6,22 Z", x: 0, y: 60, z: 4 }, 
    { p: "M-7,0 L7,0 L7,25 L-7,25 Z", x: 0, y: 60, z: 4 }
  ),
   createBone({ id: BodyPartType.UPPER_LEG_R, parentId: BodyPartType.HIPS, name: "Thigh R", defaultAngle: -10, color: "#1f2937", length: 70 },
    { p: "M-13,0 C-20,20 -18,50 -10,70 L10,70 C18,50 20,20 13,0 Z", x: 10, y: 20, z: 6 },
    { p: "M-16,0 C-22,20 -20,50 -12,70 L12,70 C22,50 22,20 16,0 Z", x: 0, y: 20, z: 6 },
    { p: "M-16,0 C-20,20 -20,50 -12,70 L12,70 C20,50 20,20 16,0 Z", x: 10, y: 0, z: 6 }
  ),
  createBone({ id: BodyPartType.LOWER_LEG_R, parentId: BodyPartType.UPPER_LEG_R, name: "Calf R", color: "#fca5a5", length: 60 },
    { p: "M-10,0 C-14,15 -13,45 -7,60 L7,60 C13,45 14,15 10,0 Z", x: 0, y: 70, z: 5 },
    { p: "M-11,0 C-18,20 -14,45 -8,60 L8,60 C11,45 12,15 11,0 Z", x: 0, y: 70, z: 5 },
    { p: "M-11,0 C-15,20 -15,45 -8,60 L8,60 C15,45 15,20 11,0 Z", x: 0, y: 70, z: 5 }
  ),
  createBone({ id: BodyPartType.FOOT_R, parentId: BodyPartType.LOWER_LEG_R, name: "Foot R", defaultAngle: 90, color: "#ffffff", length: 20 },
    { p: "M-6,0 L6,0 L6,8 C6,18 2,22 -4,22 L-6,22 Z", x: 0, y: 60, z: 4 },
    { p: "M-6,0 L6,0 L6,8 L16,22 L-6,22 Z", x: 0, y: 60, z: 4 },
    { p: "M-7,0 L7,0 L7,25 L-7,25 Z", x: 0, y: 60, z: 4 }
  ),
];

export const INITIAL_POSE: SkeletonState = SKELETON_DEF.reduce((acc, bone) => {
  acc[bone.id] = { FRONT: bone.defaultAngle, SIDE: bone.defaultAngle, TOP: bone.defaultAngle };
  return acc;
}, {} as SkeletonState);

export const MIRROR_MAPPING: Record<BodyPartType, BodyPartType> = {
    [BodyPartType.UPPER_ARM_L]: BodyPartType.UPPER_ARM_R,
    [BodyPartType.LOWER_ARM_L]: BodyPartType.LOWER_ARM_R,
    [BodyPartType.HAND_L]: BodyPartType.HAND_R,
    [BodyPartType.UPPER_LEG_L]: BodyPartType.UPPER_LEG_R,
    [BodyPartType.LOWER_LEG_L]: BodyPartType.LOWER_LEG_R,
    [BodyPartType.FOOT_L]: BodyPartType.FOOT_R,
    [BodyPartType.UPPER_ARM_R]: BodyPartType.UPPER_ARM_L,
    [BodyPartType.LOWER_ARM_R]: BodyPartType.LOWER_ARM_L,
    [BodyPartType.HAND_R]: BodyPartType.HAND_L,
    [BodyPartType.UPPER_LEG_R]: BodyPartType.UPPER_LEG_L,
    [BodyPartType.LOWER_LEG_R]: BodyPartType.LOWER_LEG_L,
    [BodyPartType.FOOT_R]: BodyPartType.FOOT_L,
} as any;

export const IK_CHAINS: Record<string, { upper: BodyPartType, lower: BodyPartType }> = {
    [BodyPartType.HAND_L]: { upper: BodyPartType.UPPER_ARM_L, lower: BodyPartType.LOWER_ARM_L },
    [BodyPartType.HAND_R]: { upper: BodyPartType.UPPER_ARM_R, lower: BodyPartType.LOWER_ARM_R },
    [BodyPartType.FOOT_L]: { upper: BodyPartType.UPPER_LEG_L, lower: BodyPartType.LOWER_LEG_L },
    [BodyPartType.FOOT_R]: { upper: BodyPartType.UPPER_LEG_R, lower: BodyPartType.LOWER_LEG_R },
};

export const getCablePath = (handleType: 'BAR' | 'V_BAR' | 'ROPE', showLine: boolean, isAngled: boolean = false): string => {
    let handle = "";
    const lineLength = 600;
    
    if (handleType === 'BAR') {
        handle = "M-25,0 L25,0 M0,0 L0,-15";
    } else if (handleType === 'V_BAR') {
        handle = "M-15,10 L0,-10 L15,10";
    } else if (handleType === 'ROPE') {
        handle = "M-8,15 Q0,20 8,15 L0,-10";
    }

    if (!showLine) return handle;

    // Vertical: Up (negative Y)
    // Angled: 45 degrees Up-Right (positive X, negative Y)
    // Note: ScaleY can flip this to Down or Down-Right
    const lineEnd = isAngled ? `L${lineLength * 0.7},-${lineLength * 0.7}` : `L0,-${lineLength}`;

    return `${handle} M0,-10 ${lineEnd}`;
};

export const getSmartPath = (propType: PropType, view: ViewType, variant: string | undefined, sx: number, sy: number): string | null => {
    // Placeholder for future parametric props
    return null;
};

export const SAMPLE_PROPS: GymProp[] = [
  {
    id: 'barbell-1',
    name: 'Barbell (Standard)',
    propType: 'BARBELL',
    views: {
        FRONT: { path: "M-100,0 L100,0 M-80,0 L-80,-10 L-70,-10 L-70,0 M80,0 L80,-10 L70,-10 L70,0 M-95,-15 L-95,15 L-85,15 L-85,-15 Z M85,-15 L85,15 L95,15 L95,-15 Z", viewBox: "0 0 200 50" },
        SIDE: { path: "M-5,-5 L5,-5 L5,5 L-5,5 Z", viewBox: "0 0 20 20" },
        TOP: { path: "M-100,-2 L100,-2 L100,2 L-100,2 Z", viewBox: "0 0 200 10" }
    },
    transforms: {
        FRONT: { x: 200, y: 350, rotation: 0, scaleX: 1, scaleY: 1 },
        SIDE: { x: 200, y: 350, rotation: 0, scaleX: 1, scaleY: 1 },
        TOP: { x: 200, y: 200, rotation: 0, scaleX: 1, scaleY: 1 }
    },
    attachedTo: null,
    snapPoints: [{ id: 'sp-1', name: 'Center', x: 0, y: 0 }, { id: 'sp-2', name: 'Left Grip', x: -60, y: 0 }, { id: 'sp-3', name: 'Right Grip', x: 60, y: 0 }],
    color: "#9ca3af",
    stroke: "black",
    strokeWidth: 1
  },
  {
    id: 'bench-flat',
    name: 'Flat Bench',
    propType: 'BENCH',
    variant: 'default',
    layer: 'back',
    views: {
        FRONT: { path: "M-40,0 L40,0 L40,15 L-40,15 Z M-35,15 L-35,40 M35,15 L35,40", viewBox: "0 0 100 50" },
        SIDE: { path: "M-60,0 L60,0 L60,10 L-60,10 Z M-50,10 L-50,40 M50,10 L50,40", viewBox: "0 0 150 50" },
        TOP: { path: "M-40,-60 L40,-60 L40,60 L-40,60 Z", viewBox: "0 0 100 150" }
    },
    transforms: {
        FRONT: { x: 200, y: 400, rotation: 0, scaleX: 1, scaleY: 1 },
        SIDE: { x: 200, y: 400, rotation: 0, scaleX: 1, scaleY: 1 },
        TOP: { x: 200, y: 300, rotation: 0, scaleX: 1, scaleY: 1 }
    },
    attachedTo: null,
    snapPoints: [],
    color: "#1f2937"
  },
  {
      id: 'cable-rope',
      name: 'Cable (Rope)',
      propType: 'GENERIC',
      cableConfig: {
          isCable: true,
          showLine: true,
          isAngled: false,
          handleType: 'ROPE'
      },
      views: {
          FRONT: { path: getCablePath('ROPE', true), viewBox: "0 0 100 600" },
          SIDE: { path: getCablePath('ROPE', true), viewBox: "0 0 100 600" },
          TOP: { path: getCablePath('ROPE', true), viewBox: "0 0 100 600" }
      },
      transforms: {
        FRONT: { x: 200, y: 150, rotation: 0, scaleX: 1, scaleY: 1 },
        SIDE: { x: 200, y: 150, rotation: 0, scaleX: 1, scaleY: 1 },
        TOP: { x: 200, y: 200, rotation: 0, scaleX: 1, scaleY: 1 }
      },
      attachedTo: null,
      snapPoints: [{ id: 'sp-c1', name: 'Grip', x: 0, y: 20 }],
      color: "#333"
  },
  {
    id: 'dumbbell-1',
    name: 'Dumbbell',
    propType: 'DUMBBELL',
    views: {
        FRONT: { path: "M-15,-5 L15,-5 L15,5 L-15,5 Z M-20,-10 L-15,-10 L-15,10 L-20,10 Z M15,-10 L20,-10 L20,10 L15,10 Z", viewBox: "0 0 50 30" },
        SIDE: { path: "M-8,-8 L8,-8 L8,8 L-8,8 Z", viewBox: "0 0 20 20" },
        TOP: { path: "M-15,-5 L15,-5 L15,5 L-15,5 Z", viewBox: "0 0 50 20" }
    },
    transforms: {
        FRONT: { x: 150, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
        SIDE: { x: 200, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
        TOP: { x: 150, y: 250, rotation: 0, scaleX: 1, scaleY: 1 }
    },
    attachedTo: null,
    snapPoints: [{ id: 'sp-d1', name: 'Handle', x: 0, y: 0 }],
    color: "#6b7280"
  }
];
