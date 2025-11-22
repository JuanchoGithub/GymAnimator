
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

export type ViewType = 'FRONT' | 'SIDE' | 'TOP';
export type LayoutMode = 'SINGLE' | 'SIDE_BY_SIDE' | 'TOP_BOTTOM' | 'THREE_SPLIT';
export type PlaybackMode = 'LOOP' | 'PING_PONG';

export interface ViewDefinition {
    path: string;
    originX: number;
    originY: number;
    zIndex: number;
}

export interface Bone {
  id: BodyPartType;
  parentId: BodyPartType | null;
  name: string;
  length: number;
  width: number;
  jointRadius?: number; 
  color: string;
  defaultAngle: number; 
  originX: number;
  originY: number;
  views: Record<ViewType, ViewDefinition>; // Defines shape/origin for each view
}

// A map of Bone ID to its rotation angle per view
export type SkeletonState = Record<BodyPartType, Record<ViewType, number>>;

export interface PropViewTransform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface Keyframe {
  id: string;
  duration: number; 
  pose: SkeletonState;
  // Prop ID -> View -> Transform
  propTransforms: Record<string, Record<ViewType, PropViewTransform>>;
}

export interface SnapPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  perView?: Partial<Record<ViewType, { x: number; y: number; visible?: boolean }>>;
}

export interface PropViewDefinition {
    path: string;
    viewBox: string;
}

export interface GymProp {
  id: string;
  name: string;
  views: Record<ViewType, PropViewDefinition>;
  
  // Independent transforms per view
  transforms: Record<ViewType, PropViewTransform>;
  
  attachedTo: BodyPartType | null; 
  snapPoints: SnapPoint[];
  color: string;
  stroke?: string;
  strokeWidth?: number;
  layer?: 'front' | 'back';
  
  // Special configuration for specific props
  cableConfig?: {
    isCable: boolean;
    showLine: boolean;
    handleType: 'BAR' | 'V_BAR' | 'ROPE';
  };
}

export interface Appearance {
    shirtColor: string;
    pantsColor: string;
    shoesColor: string;
    skinColor: string;
    hairColor: string;
    backgroundColor: string;
}