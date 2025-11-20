export enum BodyPartType {
  ROOT = 'ROOT',
  HIPS = 'HIPS',
  HEAD = 'HEAD',
  NECK = 'NECK',
  TORSO = 'TORSO',
  UPPER_ARM_L = 'UPPER_ARM_L',
  LOWER_ARM_L = 'LOWER_ARM_L',
  HAND_L = 'HAND_L',
  UPPER_ARM_R = 'UPPER_ARM_R',
  LOWER_ARM_R = 'LOWER_ARM_R',
  HAND_R = 'HAND_R',
  UPPER_LEG_L = 'UPPER_LEG_L',
  LOWER_LEG_L = 'LOWER_LEG_L',
  FOOT_L = 'FOOT_L',
  UPPER_LEG_R = 'UPPER_LEG_R',
  LOWER_LEG_R = 'LOWER_LEG_R',
  FOOT_R = 'FOOT_R',
}

export interface Bone {
  id: BodyPartType;
  parentId: BodyPartType | null;
  name: string;
  length: number;
  width: number;
  jointRadius?: number; // Radius for the joint circle at the pivot
  color: string;
  defaultAngle: number; // Degrees relative to parent
  originX: number; // Pivot X relative to parent
  originY: number; // Pivot Y relative to parent
  zIndex: number;
  shapePath?: string; // Custom SVG path for the body part
}

// A map of Bone ID to its current rotation angle
export type SkeletonState = Record<BodyPartType, number>;

export interface PropTransform {
  translateX: number;
  translateY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface Keyframe {
  id: string;
  duration: number; // Time to reach this frame (ms)
  pose: SkeletonState;
  propTransforms: Record<string, PropTransform>;
}

export interface SnapPoint {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface GymProp {
  id: string;
  name: string;
  path: string;
  viewBox: string;
  scaleX: number;
  scaleY: number;
  translateX: number;
  translateY: number;
  rotation: number; // Degrees
  attachedTo: BodyPartType | null; // Deprecated/Legacy, using App state for multi-hand
  snapPoints: SnapPoint[];
  color: string;
  stroke?: string;
  strokeWidth?: number;
  layer?: 'front' | 'back';
}

export type ViewMode = 'FRONT' | 'BACK';