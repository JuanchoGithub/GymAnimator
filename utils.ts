import { BodyPartType, SkeletonState, GymProp, Keyframe, PropTransform } from "./types";
import { SKELETON_DEF, IK_CHAINS } from "./constants";

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
export const transformPoint = (x: number, y: number, prop: GymProp | PropTransform): Point => {
    // Handle both full GymProp and light PropTransform (which might be missing translateX etc if not careful, but here we expect full data)
    // We assume the input object has the transform properties.
    const p = prop as any;
    
    // 1. Scale
    const sx = x * (p.scaleX ?? 1);
    const sy = y * (p.scaleY ?? 1);
    // 2. Rotate
    const rad = toRadians(p.rotation ?? 0);
    const rx = sx * Math.cos(rad) - sy * Math.sin(rad);
    const ry = sx * Math.sin(rad) + sy * Math.cos(rad);
    // 3. Translate
    return {
        x: (p.translateX ?? 0) + rx,
        y: (p.translateY ?? 0) + ry
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

export const exportAnimation = (
    keyframes: Keyframe[], 
    props: GymProp[],
    attachments: Record<string, { propId: string, snapPointId: string, rotationOffset: number }>,
    mode: 'accurate' | 'interpolated' = 'accurate'
) => {
    let css = '';
    const totalDuration = keyframes.reduce((sum, k) => sum + k.duration, 0);
    
    const bakedFrames: { time: number; pose: SkeletonState; props: Record<string, PropTransform> }[] = [];

    if (mode === 'accurate') {
        // --- MODE: ACCURATE (Baking) ---
        // We step through the timeline at a high sample rate, interpolate everything, 
        // solve IK, and store the result. This creates heavy but perfect animations.
        
        const SAMPLE_RATE = 30; // ms (approx 33fps)
        let currentTime = 0;
        
        while (currentTime <= totalDuration) {
            // 1. Find active keyframes
            let accumulated = 0;
            let activeIndex = 0;
            for(let i=0; i<keyframes.length; i++) {
                if (currentTime < accumulated + keyframes[i].duration) {
                    activeIndex = i;
                    break;
                }
                accumulated += keyframes[i].duration;
                if (i === keyframes.length - 1 && currentTime >= accumulated) {
                    activeIndex = i;
                    // FIX: accumulated is now end time because of loop increment. 
                    // Reset it to start time for this last frame calculation.
                    accumulated -= keyframes[i].duration; 
                }
            }

            const currentKeyframe = keyframes[activeIndex];
            const nextKeyframe = keyframes[(activeIndex + 1) % keyframes.length];
            const timeInFrame = currentTime - accumulated;
            const progress = Math.min(1, Math.max(0, timeInFrame / currentKeyframe.duration));

            // 2. Interpolate Props
            const interpolatedProps: Record<string, PropTransform> = {};
            props.forEach(p => {
                const startTr = currentKeyframe.propTransforms[p.id] || { 
                    translateX: p.translateX, translateY: p.translateY, rotation: p.rotation, scaleX: p.scaleX, scaleY: p.scaleY 
                };
                const endTr = nextKeyframe.propTransforms[p.id] || startTr;

                interpolatedProps[p.id] = {
                    translateX: startTr.translateX + (endTr.translateX - startTr.translateX) * progress,
                    translateY: startTr.translateY + (endTr.translateY - startTr.translateY) * progress,
                    rotation: startTr.rotation + (endTr.rotation - startTr.rotation) * progress,
                    scaleX: startTr.scaleX + (endTr.scaleX - startTr.scaleX) * progress,
                    scaleY: startTr.scaleY + (endTr.scaleY - startTr.scaleY) * progress,
                };
            });

            // 3. Interpolate Pose (Linear)
            const interpolatedPose: SkeletonState = {} as SkeletonState;
            Object.keys(currentKeyframe.pose).forEach((key) => {
                const k = key as BodyPartType;
                const startAngle = currentKeyframe.pose[k];
                const endAngle = nextKeyframe.pose[k];
                interpolatedPose[k] = startAngle + (endAngle - startAngle) * progress;
            });

            // 4. Apply IK Constraints
            Object.entries(attachments).forEach(([boneId, info]) => {
                const pTransform = interpolatedProps[info.propId];
                const originalProp = props.find(p => p.id === info.propId);
                
                if (originalProp && pTransform) {
                    const tempProp = { ...originalProp, ...pTransform };
                    const snapPoint = tempProp.snapPoints.find(sp => sp.id === info.snapPointId);
                    
                    if (snapPoint) {
                        const targetGlobal = transformPoint(snapPoint.x, snapPoint.y, tempProp);
                        const chain = IK_CHAINS[boneId];
                        if (chain) {
                            const ikResult = solveTwoBoneIK(chain.upper, chain.lower, targetGlobal, interpolatedPose);
                            if (ikResult) Object.assign(interpolatedPose, ikResult);
                        }
                        const handBoneDef = getBoneDef(boneId as BodyPartType);
                        if(handBoneDef && handBoneDef.parentId) {
                              const parentGlobal = getGlobalTransform(handBoneDef.parentId, interpolatedPose);
                              const offset = info.rotationOffset || 0;
                              const targetHandGlobal = tempProp.rotation + offset; 
                              const targetHandLocal = normalizeAngle(targetHandGlobal - parentGlobal.angle);
                              interpolatedPose[boneId as BodyPartType] = targetHandLocal;
                        }
                    }
                }
            });

            bakedFrames.push({
                time: currentTime,
                pose: interpolatedPose,
                props: interpolatedProps
            });

            if (currentTime >= totalDuration) break;
            currentTime += SAMPLE_RATE;
            if (currentTime > totalDuration && currentTime - SAMPLE_RATE < totalDuration) {
                currentTime = totalDuration;
            }
        }

    } else {
        // --- MODE: INTERPOLATED (Optimization) ---
        // We only create a keyframe for each user-defined keyframe.
        // This relies on the browser's linear interpolation.
        // File size is much smaller, but IK arcs (e.g. hands following a barbell in a curve)
        // might drift slightly between keyframes.
        
        let accumulated = 0;
        keyframes.forEach(kf => {
             // Construct prop transforms for this keyframe
             const currentProps: Record<string, PropTransform> = {};
             props.forEach(p => {
                 currentProps[p.id] = kf.propTransforms[p.id] || {
                      translateX: p.translateX,
                      translateY: p.translateY,
                      rotation: p.rotation,
                      scaleX: p.scaleX,
                      scaleY: p.scaleY
                 };
             });
             
             bakedFrames.push({
                 time: accumulated,
                 pose: kf.pose,
                 props: currentProps
             });
             accumulated += kf.duration;
        });

        // Add Loop frame (First frame data at end time)
        const firstFrameProps: Record<string, PropTransform> = {};
        props.forEach(p => {
             firstFrameProps[p.id] = keyframes[0].propTransforms[p.id] || {
                  translateX: p.translateX,
                  translateY: p.translateY,
                  rotation: p.rotation,
                  scaleX: p.scaleX,
                  scaleY: p.scaleY
             };
        });
        bakedFrames.push({
             time: totalDuration,
             pose: keyframes[0].pose,
             props: firstFrameProps
        });
    }

    // --- GENERATE CSS FROM FRAMES ---
    
    // 1. BONE ANIMATIONS
    SKELETON_DEF.forEach(bone => {
        const animName = `anim-bone-${bone.id}`;
        css += `\n@keyframes ${animName} {`;
        
        bakedFrames.forEach((frame) => {
            const percentage = (frame.time / totalDuration) * 100;
            const angle = frame.pose[bone.id] || 0;
            css += `\n  ${percentage.toFixed(2)}% { transform: translate(${bone.originX}px, ${bone.originY}px) rotate(${angle.toFixed(2)}deg); }`;
        });

        css += `\n}`;
        css += `\n#bone-${bone.id} { animation: ${animName} ${totalDuration}ms linear infinite; }`;
    });

    // 2. PROP ANIMATIONS
    props.forEach(prop => {
         const animName = `anim-prop-${prop.id}`;
         css += `\n@keyframes ${animName} {`;
         
         bakedFrames.forEach(frame => {
             const percentage = (frame.time / totalDuration) * 100;
             const tr = frame.props[prop.id];
             if (tr) {
                 css += `\n  ${percentage.toFixed(2)}% { transform: translate(${tr.translateX.toFixed(1)}px, ${tr.translateY.toFixed(1)}px) rotate(${tr.rotation.toFixed(1)}deg) scale(${tr.scaleX.toFixed(2)}, ${tr.scaleY.toFixed(2)}); }`;
             }
         });
         
         css += `\n}`;
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
    a.download = `gym-animation-${mode}.svg`;
    a.click();
};