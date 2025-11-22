
import { BodyPartType, Bone, SkeletonState, GymProp, ViewType, PropType } from './types';

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
    // Removed the second shape (cranium cap) which looked like a bandana
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
  createBone({ id: BodyPartType.FOOT_R, parentId: BodyPartType.LOWER_LEG_R, name: "Foot R", defaultAngle: -90, color: "#ffffff", length: 20 },
    { p: "M-6,0 L6,0 L6,8 C6,18 2,22 -4,22 L-6,22 Z", x: 0, y: 60, z: 4 },
    { p: "M-6,0 L6,0 L6,8 L16,22 L-6,22 Z", x: 0, y: 60, z: 4 }, 
    { p: "M-7,0 L7,0 L7,25 L-7,25 Z", x: 0, y: 60, z: 4 }
  ),
];

export const INITIAL_POSE: SkeletonState = SKELETON_DEF.reduce((acc, bone) => {
  // Initialize separate rotations for each view.
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
        snapPoints: [], color: '#6b7280', propType: 'GENERIC', variant: 'default',
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

const hiddenInSide = { SIDE: { x: 0, y: 0, visible: false } };

// Helper for cable paths
export const getCablePath = (type: 'BAR' | 'V_BAR' | 'ROPE', hasLine: boolean) => {
    const line = hasLine ? "M0,0 L0,-1000" : "";
    switch(type) {
        case 'BAR': 
            return `${line} M-40,0 L40,0 L40,4 L-40,4 Z`;
        case 'V_BAR':
            return `${line} M0,0 L-25,25 L-22,28 L0,6 L22,28 L25,25 L0,0 Z`;
        case 'ROPE':
            return `${line} M-2,0 L-2,10 C-2,15 -15,30 -15,40 L-10,40 C-10,30 2,15 2,10 L2,0 Z M2,0 L2,10 C2,15 15,30 15,40 L10,40 C10,30 -2,15 -2,10 L-2,0 Z`;
    }
    return '';
}

// --- SMART PROP GENERATORS ---

export const getSmartPath = (
    propType: PropType, 
    view: ViewType, 
    variant: string | undefined,
    scaleX: number, 
    scaleY: number
): string | null => {
    if (propType === 'BARBELL') {
        // ScaleX -> Length of bar (plates move out)
        // ScaleY -> Size of plates (radius) and bar thickness
        const baseLen = 180; 
        const len = baseLen * scaleX;
        const basePlateX = 140;
        const plateX = basePlateX * scaleX; // Plates move out based on X scale
        const plateRadius = 35 * scaleY;
        const barThick = 6 * scaleY; 
        const plateThick = 15; // Constant thickness, does not scale with X

        if (view === 'SIDE') {
            // Just circles
            return `M-${plateRadius},0 A${plateRadius},${plateRadius} 0 1,0 ${plateRadius},0 A${plateRadius},${plateRadius} 0 1,0 -${plateRadius},0 Z M-${barThick/1.5},0 A${barThick/1.5},${barThick/1.5} 0 1,0 ${barThick/1.5},0 A${barThick/1.5},${barThick/1.5} 0 1,0 -${barThick/1.5},0 Z`;
        }

        // Front/Top
        const bar = `M-${len},-${barThick/2} L${len},-${barThick/2} L${len},${barThick/2} L-${len},${barThick/2} Z`;
        
        // Left Plates
        const pL1 = `M-${plateX},-${plateRadius} L-${plateX-plateThick},-${plateRadius} L-${plateX-plateThick},${plateRadius} L-${plateX},${plateRadius} Z`;
        const pL2 = `M-${plateX-plateThick-2},-${plateRadius} L-${plateX-plateThick-12},-${plateRadius} L-${plateX-plateThick-12},${plateRadius} L-${plateX-plateThick-2},${plateRadius} Z`;
        
        // Right Plates
        const pR1 = `M${plateX},-${plateRadius} L${plateX+plateThick},-${plateRadius} L${plateX+plateThick},${plateRadius} L${plateX},${plateRadius} Z`;
        const pR2 = `M${plateX+plateThick+2},-${plateRadius} L${plateX+plateThick+12},-${plateRadius} L${plateX+plateThick+12},${plateRadius} L${plateX+plateThick+2},${plateRadius} Z`;
        
        return `${bar} ${pL1} ${pL2} ${pR1} ${pR2}`;
    }

    if (propType === 'DUMBBELL') {
         const baseLen = 30;
         const len = baseLen * scaleX;
         const r = 12 * scaleY;
         const h = 6 * scaleY;
         const w = 15; // plate width constant

         if (view === 'SIDE') {
             return `M-${r},0 A${r},${r} 0 1,0 ${r},0 A${r},${r} 0 1,0 -${r},0 Z`;
         }

         return `
            M-${len},-${h/2} L${len},-${h/2} L${len},${h/2} L-${len},${h/2} Z
            M-${len},-${r} L-${len-w},-${r} L-${len-w},${r} L-${len},${r} Z
            M${len},-${r} L${len+w},-${r} L${len+w},${r} L${len},${r} Z
         `;
    }

    if (propType === 'BENCH') {
        const seatT = 10;
        const legW = 6;
        
        // Base dimensions
        const baseW = 30; // Half Width
        const baseL = 90; // Half Length
        const baseH = 40; // Height
        
        if (view === 'FRONT') {
            if (variant === 'alternate') {
                // Top-down look in front view
                // ScaleX -> Width
                // ScaleY -> Length (Visual Height)
                const w = baseW * scaleX;
                const l = baseL * scaleY;
                return `M-${w},-${l} L${w},-${l} L${w},${l} L-${w},${l} Z`;
            } else {
                // Standard Front
                // ScaleX -> Width
                // ScaleY -> Leg Height
                const w = baseW * scaleX;
                const h = baseH * scaleY;
                // Legs shouldn't stretch in width relative to seat unless extremely wide,
                // but typically legs are inset by constant amount from edge.
                const legX = Math.max(5, w - 5); 
                return `
                    M-${w},-${seatT} L${w},-${seatT} L${w},0 L-${w},0 Z
                    M-${legX},0 L-${legX},${h} L-${legX-legW},${h} L-${legX-legW},0 Z
                    M${legX},0 L${legX},${h} L${legX+legW},${h} L${legX+legW},0 Z
                `;
            }
        }
        
        if (view === 'SIDE') {
            // ScaleX -> Length (Visual Width)
            // ScaleY -> Leg Height
            const l = baseL * scaleX;
            const h = baseH * scaleY;
            const legX = l - 15;
            
            return `
                M-${l},-${seatT} L${l},-${seatT} L${l},0 L-${l},0 Z
                M-${legX},0 L-${legX},${h} L-${legX-legW},${h} L-${legX-legW},0 Z
                M${legX},0 L${legX},${h} L${legX+legW},${h} L${legX+legW},0 Z
            `;
        }
        
        if (view === 'TOP') {
            // ScaleX -> Width
            // ScaleY -> Length
            const w = baseW * scaleX;
            const l = baseL * scaleY;
             return `M-${w},-${l} L${w},-${l} L${w},${l} L-${w},${l} Z`;
        }
    }

    return null;
};


export const SAMPLE_PROPS = [
  createProp(
    {
        name: 'Barbell', 
        propType: 'BARBELL',
        views: { FRONT: { viewBox: "-190 -40 380 80" }, TOP: { viewBox: "-190 -40 380 80" } } as any,
        snapPoints: [
            { id: 'center', name: 'Center', x: 0, y: 0 }, 
            { id: 'close_l', name: 'Close L', x: -30, y: 0, perView: hiddenInSide }, 
            { id: 'close_r', name: 'Close R', x: 30, y: 0, perView: hiddenInSide },
            { id: 'medium_l', name: 'Medium L', x: -60, y: 0, perView: hiddenInSide }, 
            { id: 'medium_r', name: 'Medium R', x: 60, y: 0, perView: hiddenInSide },
            { id: 'wide_l', name: 'Wide L', x: -100, y: 0, perView: hiddenInSide }, 
            { id: 'wide_r', name: 'Wide R', x: 100, y: 0, perView: hiddenInSide },
            { id: 'outside_l', name: 'Outside L', x: -145, y: 0, perView: hiddenInSide }, 
            { id: 'outside_r', name: 'Outside R', x: 145, y: 0, perView: hiddenInSide }
        ]
    },
    'M-180,-4 L180,-4 L180,4 L-180,4 Z M-140,-35 L-130,-35 L-130,35 L-140,35 Z M-152,-35 L-142,-35 L-142,35 L-152,35 Z M130,-35 L140,-35 L140,35 L130,35 Z M142,-35 L152,-35 L152,35 L142,35 Z',
    'M-35,0 A35,35 0 1,0 35,0 A35,35 0 1,0 -35,0 Z M-4,0 A4,4 0 1,0 4,0 A4,4 0 1,0 -4,0 Z', 
    'M-180,-4 L180,-4 L180,4 L-180,4 Z M-140,-35 L-130,-35 L-130,35 L-140,35 Z M-152,-35 L-142,-35 L-142,35 L-152,35 Z M130,-35 L140,-35 L140,35 L130,35 Z M142,-35 L152,-35 L152,35 L142,35 Z'
  ),
  createProp(
      {
          name: 'W Barbell',
          propType: 'GENERIC', // W Bar has complex shape, keep generic scaling
          views: { FRONT: { viewBox: "-150 -40 300 80" }, TOP: { viewBox: "-150 -40 300 80" } } as any,
          snapPoints: [
              { id: 'center', name: 'Center', x: 0, y: 0 },
              { id: 'inner_l', name: 'Inner L', x: -20, y: 5 },
              { id: 'inner_r', name: 'Inner R', x: 20, y: 5 },
              { id: 'outer_l', name: 'Outer L', x: -50, y: -5 },
              { id: 'outer_r', name: 'Outer R', x: 50, y: -5 }
          ]
      },
      // Front: W Shape
      'M-140,-4 L-100,-4 L-80,-4 L-50,-10 L-20,4 L0,0 L20,4 L50,-10 L80,-4 L100,-4 L140,-4 L140,4 L100,4 L80,4 L50,-2 L20,12 L0,8 L-20,12 L-50,-2 L-80,4 L-100,4 L-140,4 Z M-100,-35 L-90,-35 L-90,35 L-100,35 Z M100,-35 L90,-35 L90,35 L100,35 Z',
      'M-35,0 A35,35 0 1,0 35,0 A35,35 0 1,0 -35,0 Z M-4,0 A4,4 0 1,0 4,0 A4,4 0 1,0 -4,0 Z',
      'M-140,-4 L-100,-4 L-80,-4 L-50,-10 L-20,4 L0,0 L20,4 L50,-10 L80,-4 L100,-4 L140,-4 L140,4 L100,4 L80,4 L50,-2 L20,12 L0,8 L-20,12 L-50,-2 L-80,4 L-100,4 L-140,4 Z'
  ),
  createProp(
      {
        name: 'Dumbbell',
        propType: 'DUMBBELL',
        views: { FRONT: { viewBox: "-35 -15 70 30" }, TOP: { viewBox: "-35 -15 70 30" } } as any,
        snapPoints: [
            { id: 'center', name: 'Handle', x: 0, y: 0 },
            { id: 'disc_l', name: 'Disc L', x: -22, y: 0, perView: hiddenInSide },
            { id: 'disc_r', name: 'Disc R', x: 22, y: 0, perView: hiddenInSide }
        ]
      },
      'M-30,-3 L30,-3 L30,3 L-30,3 Z M-30,-12 L-15,-12 L-15,12 L-30,12 Z M15,-12 L30,-12 L30,12 L15,12 Z',
      'M-12,0 A12,12 0 1,0 12,0 A12,12 0 1,0 -12,0 Z', 
      'M-30,-3 L30,-3 L30,3 L-30,3 Z M-30,-12 L-15,-12 L-15,12 L-30,12 Z M15,-12 L30,-12 L30,12 L15,12 Z'
  ),
  createProp(
      {
        name: 'Bench (Flat)',
        propType: 'BENCH',
        color: "#374151", stroke: "#9ca3af", strokeWidth: 2, layer: 'back',
        views: { FRONT: { viewBox: "-30 -100 60 200" } } as any,
        snapPoints: [{ id: 'head', name: 'Head', x: 0, y: -80 }, { id: 'center', name: 'Center', x: 0, y: 0 }]
      },
      'M-90,-20 L90,-20 L90,-10 L-90,-10 Z M-80,-10 L-80,20 M80,-10 L80,20', 
      'M-20,-20 L20,-20 L20,-10 L-20,-10 Z M-15,-10 L-15,20 M15,-10 L15,20', 
      'M-90,-20 L90,-20 L90,20 L-90,20 Z' 
  ),
  createProp(
      {
        name: 'Bench (45°)',
        propType: 'GENERIC', // Complex geometry
        color: "#374151", stroke: "#9ca3af", strokeWidth: 2, layer: 'back',
        views: { SIDE: { viewBox: "-50 -50 100 100" } } as any,
        snapPoints: [{ id: 'seat', name: 'Seat', x: 20, y: 10 }]
      },
      'M-30,20 L30,20 L30,30 L-30,30 Z M-25,10 L25,10 L20,-40 L-20,-40 Z', // Front (approx)
      'M-30,20 L10,20 L-20,-30 L-30,-20 Z M-30,20 L-30,40 M10,20 L10,40', // Side: Angled back
      'M-20,-40 L20,-40 L30,20 L-30,20 Z' // Top
  ),
  createProp(
      {
        name: 'Bench (90°)',
        propType: 'GENERIC', // Complex geometry
        color: "#374151", stroke: "#9ca3af", strokeWidth: 2, layer: 'back',
        snapPoints: [{ id: 'seat', name: 'Seat', x: 0, y: 10 }]
      },
      'M-30,10 L30,10 L30,20 L-30,20 Z M-25,10 L25,10 L25,-50 L-25,-50 Z', // Front
      'M-20,10 L20,10 L20,20 L-20,20 Z M-20,10 L-20,-50 L-10,-50 L-10,10 Z', // Side: Vertical back
      'M-30,10 L30,10 L30,20 L-30,20 Z' // Top
  ),
  // Cables
  createProp(
      {
          name: 'Cable (Straight)',
          propType: 'GENERIC',
          color: "#1f2937",
          snapPoints: [{id: 'handle', name: 'Handle', x: 0, y: 0}],
          cableConfig: { isCable: true, showLine: true, handleType: 'BAR' }
      },
      getCablePath('BAR', true), getCablePath('BAR', true), getCablePath('BAR', true)
  ),
  createProp(
      {
          name: 'Cable (V-Bar)',
          propType: 'GENERIC',
          color: "#1f2937",
          snapPoints: [{id: 'handle', name: 'Handle', x: 0, y: 25}],
          cableConfig: { isCable: true, showLine: true, handleType: 'V_BAR' }
      },
      getCablePath('V_BAR', true), getCablePath('V_BAR', true), getCablePath('V_BAR', true)
  ),
  createProp(
      {
          name: 'Cable (Rope)',
          propType: 'GENERIC',
          color: "#d4d4d4", // Rope color
          stroke: "#1f2937", // Dark stroke
          strokeWidth: 1,
          snapPoints: [{id: 'handle_l', name: 'Handle L', x: -10, y: 40}, {id: 'handle_r', name: 'Handle R', x: 10, y: 40}],
          cableConfig: { isCable: true, showLine: true, handleType: 'ROPE' }
      },
      getCablePath('ROPE', true), getCablePath('ROPE', true), getCablePath('ROPE', true)
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