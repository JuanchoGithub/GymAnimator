
import { BodyPartType, SkeletonState, GymProp, Keyframe, PropViewTransform, ViewType, LayoutMode, SnapPoint, MuscleGroup } from "./types";
import { SKELETON_DEF, IK_CHAINS, MUSCLE_OVERLAYS } from "./constants";

// --- Geometry Helpers ---

export const toRadians = (deg: number) => (deg * Math.PI) / 180;
export const toDegrees = (rad: number) => (rad * 180) / Math.PI;
const fmt = (n: number) => Number(n.toFixed(1));

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

export const getSnapPointDef = (sp: SnapPoint, view: ViewType) => {
    const override = sp.perView?.[view];
    if (override) {
        return { x: override.x, y: override.y, visible: override.visible !== false };
    }
    return { x: sp.x, y: sp.y, visible: true };
};

// Export dummy for type resolution in case of circular deps, but prefer using constants import
export const getSmartPath = (propType: any, view: any, variant: any, sx: any, sy: any) => null;

export const synchronizePropViews = (prop: GymProp, changedView: ViewType, newTransform: PropViewTransform): GymProp => {
    const updated = { 
        ...prop, 
        transforms: { 
            ...prop.transforms, 
            [changedView]: newTransform 
        } 
    };

    // Rules:
    // 1. Y position for Front and Side views are same.
    // 2. X position for Front and Top views are same.
    // 3. Y position for Top view is same as X position for Side view.

    if (changedView === 'FRONT') {
        updated.transforms.SIDE.y = newTransform.y; // Rule 1
        updated.transforms.TOP.x = newTransform.x;  // Rule 2
    } else if (changedView === 'SIDE') {
        updated.transforms.FRONT.y = newTransform.y; // Rule 1
        updated.transforms.TOP.y = newTransform.x;   // Rule 3
    } else if (changedView === 'TOP') {
        updated.transforms.FRONT.x = newTransform.x; // Rule 2
        updated.transforms.SIDE.x = newTransform.y;  // Rule 3
    }

    return updated;
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

    if (view === 'SIDE') {
        // In side view, bend direction should be consistent (anatomical) regardless of L/R side.
        // Matches Right side behavior: Arm(1), Leg(-1)
        bendSign = isLeg ? -1 : 1;
    } else {
        // Front/Top view: Mirror behavior
        if (upperId.includes("_L")) {
            bendSign = isLeg ? 1 : -1;
        } 
        if (upperId.includes("_R")) {
            bendSign = isLeg ? -1 : 1;
        }
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
                const snapPoint = prop.snapPoints.find(sp => sp.id === info.snapPointId);
                const spPos = snapPoint ? getSnapPointDef(snapPoint, view) : {x: 0, y: 0};

                // 1. Sync Rotation
                const offset = info.rotationOffset || 0;
                const newRot = handGlobal.angle - offset;
                
                // 2. Sync Position
                const rad = toRadians(newRot);
                const sx = spPos.x * transform.scaleX;
                const sy = spPos.y * transform.scaleY;
                
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

export const exportAnimation = async (
    keyframes: Keyframe[], 
    props: GymProp[],
    attachments: Record<string, { propId: string, snapPointId: string, rotationOffset: number }>,
    mode: 'accurate' | 'interpolated' | 'adaptive' = 'accurate',
    layoutMode: LayoutMode,
    activeView: ViewType,
    slotViews: ViewType[] = ['FRONT', 'SIDE', 'TOP'],
    action: 'download' | 'clipboard' = 'download',
    backgroundColor: string = '#f3f4f6',
    filename: string = 'gym-animation'
) => {
    // 1. Determine Views to Export based on Layout
    let viewsToExport: { view: ViewType, x: number, y: number, w: number, h: number, ox: number, oy: number, scale: number }[] = [];
    let width = 400;
    let height = 500;

    switch(layoutMode) {
        case 'SINGLE':
            viewsToExport = [{ view: activeView, x: 0, y: 0, w: 400, h: 500, ox: 0, oy: 0, scale: 1 }];
            break;
        case 'SIDE_BY_SIDE':
            width = 800;
            viewsToExport = [
                { view: slotViews[0], x: 0, y: 0, w: 400, h: 500, ox: 0, oy: 0, scale: 1 },
                { view: slotViews[1], x: 400, y: 0, w: 400, h: 500, ox: 0, oy: 0, scale: 1 }
            ];
            break;
        case 'TOP_BOTTOM':
            height = 1000;
            viewsToExport = [
                { view: slotViews[0], x: 0, y: 0, w: 400, h: 500, ox: 0, oy: 0, scale: 1 },
                { view: slotViews[2], x: 0, y: 500, w: 400, h: 500, ox: 0, oy: 0, scale: 1 }
            ];
            break;
        case 'THREE_SPLIT':
            width = 800;
            height = 500;
            viewsToExport = [
                { view: slotViews[0], x: 0, y: 0, w: 400, h: 500, ox: 0, oy: 0, scale: 1 },
                { view: slotViews[1], x: 400, y: 0, w: 400, h: 250, ox: 100, oy: 0, scale: 0.5 },
                { view: slotViews[2], x: 400, y: 250, w: 400, h: 250, ox: 100, oy: 0, scale: 0.5 }
            ];
            break;
    }

    // 2. Scrape SVG content for those views
    let svgContentInner = '';
    const serializer = new XMLSerializer();

    viewsToExport.forEach(v => {
        const el = document.getElementById(`viewport-${v.view}`);
        const svgOriginal = el?.querySelector('svg');
        if (svgOriginal) {
            const svg = svgOriginal.cloneNode(true) as SVGSVGElement;

            // Robust DOM Cleanup for Export
            const allElements = svg.querySelectorAll('*');
            allElements.forEach((node: Element) => {
                const cls = node.getAttribute('class') || '';

                // Remove selection artifacts and existing muscle pulses (we re-inject them for full animation support)
                if (cls.includes('animate-pulse')) {
                    node.remove();
                    return;
                }
                // Remove specific UI elements by attribute pattern
                // Selection Circle Handle (r=4)
                if (node.tagName === 'circle' && node.getAttribute('r') === '4') {
                    node.remove();
                    return;
                }
                // Prop selection highlight path (stroke yellow, fill none)
                if (node.tagName === 'path' && node.getAttribute('stroke') === '#facc15' && node.getAttribute('fill') === 'none') {
                    node.remove();
                    return;
                }
                // Reset Bone selection stroke
                if (node.getAttribute('stroke') === '#facc15') {
                    node.removeAttribute('stroke');
                    node.removeAttribute('stroke-width');
                }

                // Remove attributes not needed for rendering
                node.removeAttribute('class');
                node.removeAttribute('style');
                node.removeAttribute('cursor');
                node.removeAttribute('pointer-events');
                node.removeAttribute('onmousedown');
                node.removeAttribute('onmousemove');
                node.removeAttribute('onmouseup');
            });

            // Inject Muscle Paths (Invisible by default, animated via CSS)
            SKELETON_DEF.forEach(bone => {
                const boneGroup = svg.querySelector(`#bone-${bone.id}-${v.view}`);
                if (boneGroup) {
                    Object.entries(MUSCLE_OVERLAYS).forEach(([muscle, boneMap]) => {
                        const m = muscle as MuscleGroup;
                        // Type safe access to overlay definition
                        const overlays = boneMap as Partial<Record<BodyPartType, Partial<Record<ViewType, string>>>>;
                        const overlayPath = overlays[bone.id]?.[v.view];
                        
                        if (overlayPath) {
                             // Create a group to handle the On/Off timeline animation
                             const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
                             group.setAttribute("id", `muscle-group-${m}-${bone.id}-${v.view}`);
                             group.setAttribute("opacity", "0"); // Default to hidden

                             // Create the path inside the group to handle the continuous pulse
                             const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                             path.setAttribute("d", overlayPath);
                             path.setAttribute("fill", "#ef4444");
                             path.setAttribute("class", "muscle-pulse");
                             
                             group.appendChild(path);
                             boneGroup.appendChild(group);
                        }
                    });
                }
            });
            
            svgContentInner += `<g transform="translate(${v.x + v.ox}, ${v.y + v.oy}) scale(${v.scale})">\n`;
            
            Array.from(svg.children).forEach(child => {
                let str = serializer.serializeToString(child);
                str = str.replace(/ xmlns="http:\/\/www.w3.org\/2000\/svg"/g, '');
                svgContentInner += str + '\n';
            });

            svgContentInner += `</g>\n`;
        }
    });

    // 3. Generate Animation CSS
    const totalDuration = keyframes.reduce((sum, k) => sum + k.duration, 0);
    const bakedFrames: { 
        time: number; 
        pose: SkeletonState; 
        props: Record<string, Record<ViewType, PropViewTransform>>;
        activeMuscles: MuscleGroup[];
    }[] = [];
    
    const SAMPLE_RATE = 50; 
    
    // Accurate AND Adaptive modes both start by baking samples
    if (mode === 'accurate' || mode === 'adaptive') {
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
                            const spPos = getSnapPointDef(snapPoint, view);
                            const targetGlobal = transformPoint(spPos.x, spPos.y, pTransform);
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

            bakedFrames.push({ 
                time: currentTime, 
                pose: interpolatedPose, 
                props: interpolatedProps,
                activeMuscles: currentKeyframe.activeMuscles || []
            });
            if (currentTime >= totalDuration) break;
            currentTime += SAMPLE_RATE;
             if (currentTime > totalDuration && currentTime - SAMPLE_RATE < totalDuration) currentTime = totalDuration;
        }
    } else {
         // Interpolated Mode: Only Keyframes
         let accumulated = 0;
         keyframes.forEach(kf => {
              const currentProps: any = {};
              props.forEach(p => currentProps[p.id] = kf.propTransforms[p.id]);
              bakedFrames.push({ 
                  time: accumulated, 
                  pose: kf.pose, 
                  props: currentProps,
                  activeMuscles: kf.activeMuscles || []
                });
              accumulated += kf.duration;
         });
         const firstFrameProps: any = {};
         props.forEach(p => firstFrameProps[p.id] = keyframes[0].propTransforms[p.id]);
         bakedFrames.push({ 
             time: totalDuration, 
             pose: keyframes[0].pose, 
             props: firstFrameProps,
             activeMuscles: keyframes[0].activeMuscles || []
        });
    }

    // 4. Generate CSS
    let css = `
    @keyframes pulse-red {
      0%, 100% { fill: #ef4444; opacity: 1; }
      50% { fill: #991b1b; opacity: 0.8; }
    }
    .muscle-pulse {
      animation: pulse-red 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }`;
    
    // Helper to check if frame B can be skipped (is linear between A and C)
    const isLinear = (tA: number, valA: number, tB: number, valB: number, tC: number, valC: number) => {
        const ratio = (tB - tA) / (tC - tA);
        const expected = valA + (valC - valA) * ratio;
        return Math.abs(valB - expected) < 0.05; // Tolerance
    };
    
    const isTransformLinear = (tA: number, tfA: any, tB: number, tfB: any, tC: number, tfC: any) => {
        return isLinear(tA, tfA.x, tB, tfB.x, tC, tfC.x) &&
               isLinear(tA, tfA.y, tB, tfB.y, tC, tfC.y) &&
               isLinear(tA, tfA.angle || tfA.rotation, tB, tfB.angle || tfB.rotation, tC, tfC.angle || tfC.rotation) &&
               (tfA.scaleX === undefined || (isLinear(tA, tfA.scaleX, tB, tfB.scaleX, tC, tfC.scaleX))) &&
               (tfA.scaleY === undefined || (isLinear(tA, tfA.scaleY, tB, tfB.scaleY, tC, tfC.scaleY)));
    };

    viewsToExport.forEach(vObj => {
        const view = vObj.view;
        
        // -- BONE ANIMATION --
        SKELETON_DEF.forEach(bone => {
            const animName = `anim-bone-${bone.id}-${view}`;
            let keyframesCss = '';
            
            let keptFrames = [bakedFrames[0]];
            
            if (mode === 'adaptive') {
                for (let i = 1; i < bakedFrames.length - 1; i++) {
                    const prev = keptFrames[keptFrames.length - 1];
                    const curr = bakedFrames[i];
                    const next = bakedFrames[i+1];
                    
                    const tPrev = getGlobalTransform(bone.id, prev.pose, view);
                    const tCurr = getGlobalTransform(bone.id, curr.pose, view);
                    const tNext = getGlobalTransform(bone.id, next.pose, view);

                    if (!isTransformLinear(prev.time, tPrev, curr.time, tCurr, next.time, tNext)) {
                        keptFrames.push(curr);
                    }
                }
                keptFrames.push(bakedFrames[bakedFrames.length - 1]);
            } else {
                keptFrames = bakedFrames;
            }

            keptFrames.forEach((frame, index) => {
                const percentage = (frame.time / totalDuration) * 100;
                const globalT = getGlobalTransform(bone.id, frame.pose, view);
                const tx = fmt(globalT.x);
                const ty = fmt(globalT.y);
                const rot = fmt(globalT.angle);
                const currentTransform = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
                
                keyframesCss += `\n  ${fmt(percentage)}% { transform: ${currentTransform}; }`;
            });

            if (keyframesCss) {
                css += `\n@keyframes ${animName} {${keyframesCss}\n}`;
                css += `\n#bone-${bone.id}-${view} { animation: ${animName} ${totalDuration}ms linear infinite; transform-origin: 0px 0px; }`;
            }
        });
        
        // -- MUSCLE ACTIVATION ANIMATION --
        Object.keys(MUSCLE_OVERLAYS).forEach(mKey => {
            const m = mKey as MuscleGroup;
            const boneMap = MUSCLE_OVERLAYS[m] as Partial<Record<BodyPartType, Partial<Record<ViewType, string>>>>;
            if(!boneMap) return;
            
            Object.keys(boneMap).forEach(bKey => {
                 const boneId = bKey as BodyPartType;
                 const viewOverlay = boneMap[boneId]?.[view];
                 
                 if(viewOverlay) {
                     const animName = `anim-muscle-${m}-${boneId}-${view}`;
                     let keyframesCss = '';
                     
                     // For muscles, we rely on baked frames to capture the discrete active state
                     bakedFrames.forEach(frame => {
                         const percentage = (frame.time / totalDuration) * 100;
                         const isActive = frame.activeMuscles.includes(m);
                         const opacity = isActive ? 1 : 0; // Full opacity when active, pulse handles fluctuation
                         keyframesCss += `\n  ${fmt(percentage)}% { opacity: ${opacity}; }`;
                     });

                     if (keyframesCss) {
                         css += `\n@keyframes ${animName} {${keyframesCss}\n}`;
                         // Target the GROUP for On/Off visibility
                         css += `\n#muscle-group-${m}-${boneId}-${view} { animation: ${animName} ${totalDuration}ms linear infinite; }`;
                     }
                 }
            });
        });

        // -- PROP ANIMATION --
        props.forEach(prop => {
             const animName = `anim-prop-${prop.id}-${view}`;
             let keyframesCss = '';
             
             let keptFrames = [bakedFrames[0]];
             
             if (mode === 'adaptive') {
                for (let i = 1; i < bakedFrames.length - 1; i++) {
                    const prev = keptFrames[keptFrames.length - 1];
                    const curr = bakedFrames[i];
                    const next = bakedFrames[i+1];
                    
                    const tPrev = prev.props[prop.id][view];
                    const tCurr = curr.props[prop.id][view];
                    const tNext = next.props[prop.id][view];

                    if (tPrev && tCurr && tNext) {
                        if (!isTransformLinear(prev.time, tPrev, curr.time, tCurr, next.time, tNext)) {
                            keptFrames.push(curr);
                        }
                    }
                }
                keptFrames.push(bakedFrames[bakedFrames.length - 1]);
             } else {
                 keptFrames = bakedFrames;
             }

             keptFrames.forEach((frame, index) => {
                 const percentage = (frame.time / totalDuration) * 100;
                 const tr = frame.props[prop.id][view];
                 if (tr) {
                     const tx = fmt(tr.x);
                     const ty = fmt(tr.y);
                     const rot = fmt(tr.rotation);
                     const sx = fmt(tr.scaleX);
                     const sy = fmt(tr.scaleY);
                     const currentTransform = `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${sx}, ${sy})`;
                     keyframesCss += `\n  ${fmt(percentage)}% { transform: ${currentTransform}; }`;
                 }
             });
             
             if (keyframesCss) {
                css += `\n@keyframes ${animName} {${keyframesCss}\n}`;
                css += `\n#prop-${prop.id}-${view} { animation: ${animName} ${totalDuration}ms linear infinite; transform-origin: 0px 0px; }`;
             }
        });
    });

    const svgOutput = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <style>
    ${css}
  </style>
  ${backgroundColor !== 'transparent' ? `<rect width="100%" height="100%" fill="${backgroundColor}"/>` : ''}
  ${svgContentInner}
</svg>
    `;

    if (action === 'clipboard') {
        try {
            await navigator.clipboard.writeText(svgOutput);
        } catch (err) {
            console.error("Failed to copy SVG to clipboard", err);
            throw err;
        }
    } else {
        const blob = new Blob([svgOutput], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Sanitize filename
        const safeName = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'animation';
        a.download = `${safeName}.svg`;
        a.click();
    }
};
