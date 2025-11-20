import { BodyPartType, SkeletonState, GymProp, Keyframe, PropTransform } from "./types";
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

// Get global coordinates of a point inside a prop (taking into account scale, rotation, translation)
export const transformPoint = (x: number, y: number, prop: GymProp): Point => {
    // 1. Scale
    const sx = x * prop.scaleX;
    const sy = y * prop.scaleY;
    // 2. Rotate
    const rad = toRadians(prop.rotation);
    const rx = sx * Math.cos(rad) - sy * Math.sin(rad);
    const ry = sx * Math.sin(rad) + sy * Math.cos(rad);
    // 3. Translate
    return {
        x: prop.translateX + rx,
        y: prop.translateY + ry
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
    let bendSign = 1;
    
    // We need opposite bend directions for Legs vs Arms to look natural.
    // Legs: Bend Outwards (Knees apart in squat)
    // Arms: Bend "Down/Back" usually.
    const isLeg = upperId.includes("LEG");

    if (upperId.includes("_L")) {
        // Screen Left Limb
        // Arms: -1 (Elbow points Left/Down)
        // Legs: 1  (Knee points Left/Out)
        bendSign = isLeg ? 1 : -1;
    } 
    if (upperId.includes("_R")) {
        // Screen Right Limb
        // Arms: 1  (Elbow points Right/Down)
        // Legs: -1 (Knee points Right/Out)
        bendSign = isLeg ? -1 : 1;
    }

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

// --- Prop & Animation Helpers ---

// Synchronize dumbbells to hand position/rotation (Natural motion)
export const syncDumbbells = (
    currentProps: GymProp[], 
    pose: SkeletonState, 
    currentAttachments: Record<string, { propId: string, snapPointId: string, rotationOffset: number }>
) => {
    let updatedProps = [...currentProps];
    let changed = false;

    Object.entries(currentAttachments).forEach(([handId, info]) => {
        const propIndex = updatedProps.findIndex(p => p.id === info.propId);
        if (propIndex === -1) return;
        
        const prop = updatedProps[propIndex];
        // Heuristic: If it's a dumbbell, it follows the hand (Hand is Master)
        if (prop.name.toLowerCase().includes('dumbbell')) {
            const handGlobal = getGlobalTransform(handId as BodyPartType, pose);
            const snapPoint = prop.snapPoints.find(sp => sp.id === info.snapPointId) || { x: 0, y: 0 };

            // 1. Sync Rotation (User Request: "keep the same angle")
            // Use the stored offset to maintain relative grip rotation
            const offset = info.rotationOffset || 0;
            const newRot = handGlobal.angle - offset;
            
            // 2. Sync Position (Prop Center = Hand Global - Rotated Snap Offset)
            const rad = toRadians(newRot);
            const sx = snapPoint.x * prop.scaleX;
            const sy = snapPoint.y * prop.scaleY;
            
            // Calculate rotated offset of the snap point relative to prop center
            const rx = sx * Math.cos(rad) - sy * Math.sin(rad);
            const ry = sx * Math.sin(rad) + sy * Math.cos(rad);

            const newX = handGlobal.x - rx;
            const newY = handGlobal.y - ry;

            if (
                Math.abs(prop.translateX - newX) > 0.1 || 
                Math.abs(prop.translateY - newY) > 0.1 || 
                Math.abs(prop.rotation - newRot) > 0.1
            ) {
                updatedProps[propIndex] = {
                    ...prop,
                    translateX: newX,
                    translateY: newY,
                    rotation: newRot
                };
                changed = true;
            }
        }
    });

    return changed ? updatedProps : currentProps;
};

export const exportAnimation = (keyframes: Keyframe[], props: GymProp[]) => {
    let css = '';
    const totalDuration = keyframes.reduce((sum, k) => sum + k.duration, 0);
    
    // 1. BONE ANIMATIONS
    SKELETON_DEF.forEach(bone => {
        const animName = `anim-bone-${bone.id}`;
        css += `\n@keyframes ${animName} {`;
        
        let accumulatedTime = 0;
        keyframes.forEach((kf) => {
            const percentage = (accumulatedTime / totalDuration) * 100;
            const angle = kf.pose[bone.id] || 0;
            
            // Explicitly animate transform for smooth interpolation
            css += `\n  ${percentage.toFixed(2)}% { transform: translate(${bone.originX}px, ${bone.originY}px) rotate(${angle}deg); }`;
            
            accumulatedTime += kf.duration;
        });

        // Close the loop
        const startAngle = keyframes[0].pose[bone.id] || 0;
        css += `\n  100% { transform: translate(${bone.originX}px, ${bone.originY}px) rotate(${startAngle}deg); }`;
        css += `\n}`;

        css += `\n#bone-${bone.id} { animation: ${animName} ${totalDuration}ms linear infinite; }`;
    });

    // 2. PROP ANIMATIONS
    props.forEach(prop => {
         const animName = `anim-prop-${prop.id}`;
         css += `\n@keyframes ${animName} {`;
         
         let accumulatedTime = 0;
         keyframes.forEach(kf => {
             const percentage = (accumulatedTime / totalDuration) * 100;
             const tr = kf.propTransforms[prop.id] || { 
                 translateX: prop.translateX, 
                 translateY: prop.translateY, 
                 rotation: prop.rotation, 
                 scaleX: prop.scaleX, 
                 scaleY: prop.scaleY 
             };
             css += `\n  ${percentage.toFixed(2)}% { transform: translate(${tr.translateX}px, ${tr.translateY}px) rotate(${tr.rotation}deg) scale(${tr.scaleX}, ${tr.scaleY}); }`;
             accumulatedTime += kf.duration;
         });
         
         // Loop back
         const startTr = keyframes[0].propTransforms[prop.id] || { 
             translateX: prop.translateX, 
             translateY: prop.translateY, 
             rotation: prop.rotation, 
             scaleX: prop.scaleX, 
             scaleY: prop.scaleY 
         };
         css += `\n  100% { transform: translate(${startTr.translateX}px, ${startTr.translateY}px) rotate(${startTr.rotation}deg) scale(${startTr.scaleX}, ${startTr.scaleY}); }`;
         css += `\n}`;
         
         // Use ID selector with prefix matched in Canvas.tsx
         css += `\n#prop-${prop.id} { animation: ${animName} ${totalDuration}ms linear infinite; }`;
    });

    const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" style="background:#f3f4f6">
  <style>
    ${css}
  </style>
  ${document.getElementById('export-target')?.innerHTML}
</svg>
    `;
    
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gym-animation.svg';
    a.click();
};