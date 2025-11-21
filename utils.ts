
import { BodyPartType, SkeletonState, GymProp, Keyframe, PropViewTransform, ViewType, LayoutMode } from "./types";
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

// Calculate global position and rotation of a bone's origin (Pivot) for a specific view
export const getGlobalTransform = (boneId: BodyPartType | null, pose: SkeletonState, view: ViewType): Transform => {
    if (!boneId) return { x: 0, y: 0, angle: 0 };

    const bone = getBoneDef(boneId);
    if (!bone) return { x: 0, y: 0, angle: 0 };

    const parentTransform = getGlobalTransform(bone.parentId, pose, view);
    const viewDef = bone.views[view];
    
    if (!viewDef) return parentTransform;

    const radP = toRadians(parentTransform.angle);
    
    // The bone's origin is relative to the parent's coordinate system (which has been rotated)
    // We need to rotate the LOCAL origin offset by the PARENT'S global angle
    const rotatedX = viewDef.originX * Math.cos(radP) - viewDef.originY * Math.sin(radP);
    const rotatedY = viewDef.originX * Math.sin(radP) + viewDef.originY * Math.cos(radP);

    return {
        x: parentTransform.x + rotatedX,
        y: parentTransform.y + rotatedY,
        angle: parentTransform.angle + (pose[boneId]?.[view] || 0)
    };
};

// Get global coordinates of a point inside a prop (taking into account scale, rotation, translation)
export const transformPoint = (x: number, y: number, transform: PropViewTransform): Point => {
    // 1. Scale
    const sx = x * (transform.scaleX ?? 1);
    const sy = y * (transform.scaleY ?? 1);
    // 2. Rotate
    const rad = toRadians(transform.rotation ?? 0);
    const rx = sx * Math.cos(rad) - sy * Math.sin(rad);
    const ry = sx * Math.sin(rad) + sy * Math.cos(rad);
    // 3. Translate
    return {
        x: (transform.x ?? 0) + rx,
        y: (transform.y ?? 0) + ry
    };
};

// --- Inverse Kinematics (2-Bone) ---

export const solveTwoBoneIK = (
    upperId: BodyPartType,
    lowerId: BodyPartType,
    target: Point,
    pose: SkeletonState,
    view: ViewType
): Record<string, number> | null => {
    const upperBone = getBoneDef(upperId);
    const lowerBone = getBoneDef(lowerId);
    if (!upperBone || !lowerBone) return null;

    // 1. Calculate Global Start Position (Shoulder/Hip)
    const parentTransform = getGlobalTransform(upperBone.parentId, pose, view);
    
    // Upper Bone Origin in Global Space
    const viewDef = upperBone.views[view];
    const radP = toRadians(parentTransform.angle);
    const startX = parentTransform.x + (viewDef.originX * Math.cos(radP) - viewDef.originY * Math.sin(radP));
    const startY = parentTransform.y + (viewDef.originX * Math.sin(radP) + viewDef.originY * Math.cos(radP));

    // 2. Inverse Kinematics Geometry
    const l1 = upperBone.length;
    const l2 = lowerBone.length;
    
    // Vector from Start to Target
    let dx = target.x - startX;
    let dy = target.y - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Clamp distance to reach limit (prevent NaN)
    const maxDist = (l1 + l2) * 0.999; 
    const scale = dist > maxDist ? maxDist / dist : 1;
    
    const tx = startX + dx * scale;
    const ty = startY + dy * scale;
    
    // Recalculate diffs with clamped target
    const cdx = tx - startX;
    const cdy = ty - startY;
    const cDist = Math.sqrt(cdx * cdx + cdy * cdy);

    // Law of Cosines for the Triangle
    const cosAlpha = (l1 * l1 + cDist * cDist - l2 * l2) / (2 * l1 * cDist);
    const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));

    // Base angle of the vector to target
    const theta = Math.atan2(cdy, cdx);

    // Bend Direction Logic
    let bendSign = 1;
    const isLeg = upperId.includes("LEG");

    if (upperId.includes("_L")) {
        bendSign = isLeg ? 1 : -1;
    } 
    if (upperId.includes("_R")) {
        bendSign = isLeg ? -1 : 1;
    }

    // Calculate Global Angles
    const upperGlobalMath = theta + (bendSign * alpha);
    
    // Calculate Elbow Position
    const elbowX = startX + l1 * Math.cos(upperGlobalMath);
    const elbowY = startY + l1 * Math.sin(upperGlobalMath);
    
    const lowerGlobalMath = Math.atan2(ty - elbowY, tx - elbowX);

    // 3. Convert to Local SVG Angles
    const parentGlobalSvg = parentTransform.angle;
    const upperGlobalSvg = toDegrees(upperGlobalMath) - 90;
    const upperLocal = normalizeAngle(upperGlobalSvg - parentGlobalSvg);

    const lowerGlobalSvg = toDegrees(lowerGlobalMath) - 90;
    const lowerLocal = normalizeAngle(lowerGlobalSvg - upperGlobalSvg);

    // Returns local angles for the current view
    return {
        [upperId]: upperLocal,
        [lowerId]: lowerLocal
    };
};

// --- Prop & Animation Helpers ---

export const syncDumbbells = (
    currentProps: GymProp[], 
    pose: SkeletonState, 
    currentAttachments: Record<string, { propId: string, snapPointId: string, rotationOffset: number }>
) => {
    // Sync happens per view, but since this function is called often, we iterate all views
    // to ensure consistency if multiple views are visible or being edited.
    let updatedProps = [...currentProps];
    let changed = false;
    const VIEWS: ViewType[] = ['FRONT', 'SIDE', 'TOP'];

    VIEWS.forEach(view => {
        Object.entries(currentAttachments).forEach(([handId, info]) => {
            const propIndex = updatedProps.findIndex(p => p.id === info.propId);
            if (propIndex === -1) return;
            
            const prop = updatedProps[propIndex];
            const transform = prop.transforms[view];

            if (prop.name.toLowerCase().includes('dumbbell')) {
                const handGlobal = getGlobalTransform(handId as BodyPartType, pose, view);
                const snapPoint = prop.snapPoints.find(sp => sp.id === info.snapPointId) || { x: 0, y: 0 };

                // 1. Sync Rotation
                const offset = info.rotationOffset || 0;
                const newRot = handGlobal.angle - offset;
                
                // 2. Sync Position
                const rad = toRadians(newRot);
                const sx = snapPoint.x * transform.scaleX;
                const sy = snapPoint.y * transform.scaleY;
                
                const rx = sx * Math.cos(rad) - sy * Math.sin(rad);
                const ry = sx * Math.sin(rad) + sy * Math.cos(rad);

                const newX = handGlobal.x - rx;
                const newY = handGlobal.y - ry;

                if (
                    Math.abs(transform.x - newX) > 0.1 || 
                    Math.abs(transform.y - newY) > 0.1 || 
                    Math.abs(transform.rotation - newRot) > 0.1
                ) {
                    updatedProps[propIndex] = {
                        ...updatedProps[propIndex],
                        transforms: {
                            ...updatedProps[propIndex].transforms,
                            [view]: {
                                ...transform,
                                x: newX,
                                y: newY,
                                rotation: newRot
                            }
                        }
                    };
                    changed = true;
                }
            }
        });
    });

    return changed ? updatedProps : currentProps;
};

export const exportAnimation = (
    keyframes: Keyframe[], 
    props: GymProp[],
    attachments: Record<string, { propId: string, snapPointId: string, rotationOffset: number }>,
    mode: 'accurate' | 'interpolated' = 'accurate',
    layoutMode: LayoutMode,
    activeView: ViewType
) => {
    // 1. Determine Views to Export based on Layout
    let viewsToExport: { view: ViewType, x: number, y: number }[] = [];
    let width = 400;
    let height = 500;

    switch(layoutMode) {
        case 'SINGLE':
            viewsToExport = [{ view: activeView, x: 0, y: 0 }];
            break;
        case 'SIDE_BY_SIDE':
            width = 800;
            viewsToExport = [
                { view: 'FRONT', x: 0, y: 0 },
                { view: 'SIDE', x: 400, y: 0 }
            ];
            break;
        case 'TOP_BOTTOM':
            height = 1000;
            viewsToExport = [
                { view: 'FRONT', x: 0, y: 0 },
                { view: 'TOP', x: 0, y: 500 }
            ];
            break;
        case 'THREE_SPLIT':
            width = 800;
            height = 1000;
            viewsToExport = [
                { view: 'FRONT', x: 0, y: 0 },
                { view: 'SIDE', x: 400, y: 0 },
                { view: 'TOP', x: 400, y: 500 }
            ];
            break;
    }

    // 2. Scrape SVG content for those views
    let svgContentInner = '';
    const serializer = new XMLSerializer();

    viewsToExport.forEach(v => {
        const el = document.getElementById(`viewport-${v.view}`);
        const svg = el?.querySelector('svg');
        if (svg) {
            // Extract inner contents (bones, props)
            // We wrap them in a group to position them according to the layout
            svgContentInner += `<g transform="translate(${v.x}, ${v.y})">\n`;
            // Add a background rect for clarity
            svgContentInner += `<rect width="400" height="500" fill="#f3f4f6" stroke="#e5e7eb" stroke-width="2"/>\n`;
            
            // Use XMLSerializer to ensure valid XML (fixes tag mismatch errors like <circle>)
            Array.from(svg.children).forEach(child => {
                let str = serializer.serializeToString(child);
                
                // Clean up selection highlights from export
                str = str.replace(/stroke="#facc15"/g, 'stroke="none"');
                
                // Remove pulsing selection circles (hiding them)
                // Regex matches class attributes containing 'animate-pulse' and replaces the whole attribute with display="none"
                str = str.replace(/class="[^"]*animate-pulse[^"]*"/g, 'display="none"'); 
                
                // Remove namespace clutter if repeated (optional, but nice for readability)
                str = str.replace(/ xmlns="http:\/\/www.w3.org\/2000\/svg"/g, '');

                svgContentInner += str + '\n';
            });

            svgContentInner += `</g>\n`;
        }
    });

    // 3. Generate Animation CSS
    const totalDuration = keyframes.reduce((sum, k) => sum + k.duration, 0);
    const bakedFrames: { time: number; pose: SkeletonState; props: Record<string, Record<ViewType, PropViewTransform>> }[] = [];
    const SAMPLE_RATE = 30; 
    
    if (mode === 'accurate') {
        let currentTime = 0;
        while (currentTime <= totalDuration) {
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
                    accumulated -= keyframes[i].duration; 
                }
            }
            const currentKeyframe = keyframes[activeIndex];
            const nextKeyframe = keyframes[(activeIndex + 1) % keyframes.length];
            const timeInFrame = currentTime - accumulated;
            const progress = Math.min(1, Math.max(0, timeInFrame / currentKeyframe.duration));

            // Interpolate Props
            const interpolatedProps: any = {};
            props.forEach(p => {
                interpolatedProps[p.id] = {};
                ['FRONT', 'SIDE', 'TOP'].forEach((v: any) => {
                     const startTr = currentKeyframe.propTransforms[p.id]?.[v] || p.transforms[v];
                     const endTr = nextKeyframe.propTransforms[p.id]?.[v] || startTr;
                     interpolatedProps[p.id][v] = {
                        x: startTr.x + (endTr.x - startTr.x) * progress,
                        y: startTr.y + (endTr.y - startTr.y) * progress,
                        rotation: startTr.rotation + (endTr.rotation - startTr.rotation) * progress,
                        scaleX: startTr.scaleX + (endTr.scaleX - startTr.scaleX) * progress,
                        scaleY: startTr.scaleY + (endTr.scaleY - startTr.scaleY) * progress,
                     };
                });
            });

            // Interpolate Pose
            const interpolatedPose: any = {};
            Object.keys(currentKeyframe.pose).forEach((key) => {
                const k = key as BodyPartType;
                interpolatedPose[k] = {};
                ['FRONT', 'SIDE', 'TOP'].forEach((v: any) => {
                     const startAngle = currentKeyframe.pose[k][v];
                     const endAngle = nextKeyframe.pose[k][v];
                     interpolatedPose[k][v] = startAngle + (endAngle - startAngle) * progress;
                });
            });

            // Apply IK
            ['FRONT', 'SIDE', 'TOP'].forEach((view: any) => {
                 Object.entries(attachments).forEach(([boneId, info]) => {
                    const pTransform = interpolatedProps[info.propId][view];
                    const originalProp = props.find(p => p.id === info.propId);
                    if (originalProp && pTransform) {
                        const snapPoint = originalProp.snapPoints.find(sp => sp.id === info.snapPointId);
                        if (snapPoint) {
                            const targetGlobal = transformPoint(snapPoint.x, snapPoint.y, pTransform);
                            const chain = IK_CHAINS[boneId];
                            if (chain) {
                                const ikResult = solveTwoBoneIK(chain.upper, chain.lower, targetGlobal, interpolatedPose, view);
                                if (ikResult) {
                                    interpolatedPose[chain.upper][view] = ikResult[chain.upper];
                                    interpolatedPose[chain.lower][view] = ikResult[chain.lower];
                                }
                            }
                            const handBoneDef = getBoneDef(boneId as BodyPartType);
                            if(handBoneDef && handBoneDef.parentId) {
                                const parentGlobal = getGlobalTransform(handBoneDef.parentId, interpolatedPose, view);
                                const offset = info.rotationOffset || 0;
                                const targetHandGlobal = pTransform.rotation + offset; 
                                const targetHandLocal = normalizeAngle(targetHandGlobal - parentGlobal.angle);
                                interpolatedPose[boneId as BodyPartType][view] = targetHandLocal;
                            }
                        }
                    }
                });
            });

            bakedFrames.push({ time: currentTime, pose: interpolatedPose, props: interpolatedProps });
            if (currentTime >= totalDuration) break;
            currentTime += SAMPLE_RATE;
             if (currentTime > totalDuration && currentTime - SAMPLE_RATE < totalDuration) currentTime = totalDuration;
        }
    } else {
         let accumulated = 0;
         keyframes.forEach(kf => {
              const currentProps: any = {};
              props.forEach(p => currentProps[p.id] = kf.propTransforms[p.id]);
              bakedFrames.push({ time: accumulated, pose: kf.pose, props: currentProps });
              accumulated += kf.duration;
         });
         const firstFrameProps: any = {};
         props.forEach(p => firstFrameProps[p.id] = keyframes[0].propTransforms[p.id]);
         bakedFrames.push({ time: totalDuration, pose: keyframes[0].pose, props: firstFrameProps });
    }

    // 4. Generate CSS
    let css = '';
    viewsToExport.forEach(vObj => {
        const view = vObj.view;
        SKELETON_DEF.forEach(bone => {
            const animName = `anim-bone-${bone.id}-${view}`;
            css += `\n@keyframes ${animName} {`;
            bakedFrames.forEach((frame) => {
                const percentage = (frame.time / totalDuration) * 100;
                const angle = frame.pose[bone.id][view] || 0;
                const viewDef = bone.views[view];
                if (viewDef) {
                     css += `\n  ${percentage.toFixed(2)}% { transform: translate(${viewDef.originX}px, ${viewDef.originY}px) rotate(${angle.toFixed(2)}deg); }`;
                }
            });
            css += `\n}`;
            css += `\n#bone-${bone.id}-${view} { animation: ${animName} ${totalDuration}ms linear infinite; transform-origin: 0px 0px; }`;
        });

        props.forEach(prop => {
             const animName = `anim-prop-${prop.id}-${view}`;
             css += `\n@keyframes ${animName} {`;
             bakedFrames.forEach(frame => {
                 const percentage = (frame.time / totalDuration) * 100;
                 const tr = frame.props[prop.id][view];
                 if (tr) {
                     css += `\n  ${percentage.toFixed(2)}% { transform: translate(${tr.x.toFixed(1)}px, ${tr.y.toFixed(1)}px) rotate(${tr.rotation.toFixed(1)}deg) scale(${tr.scaleX.toFixed(2)}, ${tr.scaleY.toFixed(2)}); }`;
                 }
             });
             css += `\n}`;
             css += `\n#prop-${prop.id}-${view} { animation: ${animName} ${totalDuration}ms linear infinite; transform-origin: 0px 0px; }`;
        });
    });

    const svgOutput = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="background:#222">
  <style>
    ${css}
  </style>
  ${svgContentInner}
</svg>
    `;
    
    const blob = new Blob([svgOutput], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gym-animation-${layoutMode.toLowerCase()}.svg`;
    a.click();
};
