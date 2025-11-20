import { BodyPartType, SkeletonState } from "./types";
import { SKELETON_DEF } from "./constants";

// --- Geometry Helpers ---

export const toRadians = (deg: number) => (deg * Math.PI) / 180;
export const toDegrees = (rad: number) => (rad * 180) / Math.PI;

export interface Point {
    x: number;
    y: number;
}

export interface Transform {
    x: number;
    y: number;
    angle: number; // global angle in degrees
}

// Get the definition of a bone by ID
export const getBoneDef = (id: BodyPartType) => SKELETON_DEF.find(b => b.id === id);

// Normalize angle to -180 to 180
export const normalizeAngle = (angle: number) => {
    let a = angle;
    while (a > 180) a -= 360;
    while (a <= -180) a += 360;
    return a;
};

// Calculate global position and rotation of a bone's origin (Pivot)
export const getGlobalTransform = (boneId: BodyPartType | null, pose: SkeletonState): Transform => {
    if (!boneId) return { x: 0, y: 0, angle: 0 };

    const bone = getBoneDef(boneId);
    if (!bone) return { x: 0, y: 0, angle: 0 };

    const parentTransform = getGlobalTransform(bone.parentId, pose);

    const radP = toRadians(parentTransform.angle);
    
    // The bone's origin is relative to the parent's coordinate system
    // Rotate the local origin offset by the parent's global angle
    const rotatedX = bone.originX * Math.cos(radP) - bone.originY * Math.sin(radP);
    const rotatedY = bone.originX * Math.sin(radP) + bone.originY * Math.cos(radP);

    return {
        x: parentTransform.x + rotatedX,
        y: parentTransform.y + rotatedY,
        angle: parentTransform.angle + (pose[boneId] || 0)
    };
};

// --- Inverse Kinematics (2-Bone) ---

export const solveTwoBoneIK = (
    upperId: BodyPartType,
    lowerId: BodyPartType,
    target: Point,
    pose: SkeletonState
): Partial<SkeletonState> | null => {
    const upperBone = getBoneDef(upperId);
    const lowerBone = getBoneDef(lowerId);
    if (!upperBone || !lowerBone) return null;

    // 1. Calculate Global Start Position (Shoulder/Hip)
    const parentTransform = getGlobalTransform(upperBone.parentId, pose);
    
    // Upper Bone Origin in Global Space
    const radP = toRadians(parentTransform.angle);
    const startX = parentTransform.x + (upperBone.originX * Math.cos(radP) - upperBone.originY * Math.sin(radP));
    const startY = parentTransform.y + (upperBone.originX * Math.sin(radP) + upperBone.originY * Math.cos(radP));

    // 2. Inverse Kinematics Geometry
    const l1 = upperBone.length;
    const l2 = lowerBone.length;
    
    // Vector from Start to Target
    let dx = target.x - startX;
    let dy = target.y - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Clamp distance to reach limit (prevent NaN)
    // We use 99.9% of max length to avoid straight-line singularity instability
    const maxDist = (l1 + l2) * 0.999; 
    const scale = dist > maxDist ? maxDist / dist : 1;
    
    const tx = startX + dx * scale;
    const ty = startY + dy * scale;
    
    // Recalculate diffs with clamped target
    const cdx = tx - startX;
    const cdy = ty - startY;
    const cDist = Math.sqrt(cdx * cdx + cdy * cdy);

    // Law of Cosines for the Triangle
    // cos(alpha) = (l1^2 + dist^2 - l2^2) / (2 * l1 * dist)
    const cosAlpha = (l1 * l1 + cDist * cDist - l2 * l2) / (2 * l1 * cDist);
    const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));

    // Base angle of the vector to target (Math space: +X is 0, +Y is 90)
    const theta = Math.atan2(cdy, cdx);

    // Bend Direction Logic
    // We determine bend based on which side of the body the limb is on.
    // In SVG Screen coords (+Y Down):
    // Left Arm: Generally bends "Left" (negative angle offset relative to target vector)
    // Right Arm: Generally bends "Right" (positive angle offset)
    let bendSign = 1;
    
    if (upperId.includes("_L")) bendSign = -1; 
    if (upperId.includes("_R")) bendSign = 1;

    // Calculate Global Angles (Math Space: Counter-Clockwise)
    const upperGlobalMath = theta + (bendSign * alpha);
    
    // Calculate Elbow Position to find Lower Arm angle
    const elbowX = startX + l1 * Math.cos(upperGlobalMath);
    const elbowY = startY + l1 * Math.sin(upperGlobalMath);
    
    const lowerGlobalMath = Math.atan2(ty - elbowY, tx - elbowX);

    // 3. Convert to Local SVG Angles
    // Important: Bones are drawn pointing Down (+Y).
    // Math Angle 90deg = (0, 1) = Down = SVG Rotation 0.
    // So: SVG_Rotation = Math_Degrees - 90.
    
    const parentGlobalSvg = parentTransform.angle;
    
    const upperGlobalSvg = toDegrees(upperGlobalMath) - 90;
    const upperLocal = normalizeAngle(upperGlobalSvg - parentGlobalSvg);

    // For Lower bone, its parent is Upper.
    // Lower Local = Lower Global - Upper Global
    const lowerGlobalSvg = toDegrees(lowerGlobalMath) - 90;
    const lowerLocal = normalizeAngle(lowerGlobalSvg - upperGlobalSvg);

    return {
        [upperId]: upperLocal,
        [lowerId]: lowerLocal
    };
};