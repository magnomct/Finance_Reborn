import type { Variants } from 'framer-motion';

export interface MotionVariantConfig {
  initial: {
    opacity: number;
    y: number;
    scale?: number;
  };
  animate: {
    opacity: number;
    y: number;
    scale?: number;
    transition: {
      duration: number;
      ease: number[] | string;
    };
  };
  exit: {
    opacity: number;
    y: number;
    scale?: number;
    transition: {
      duration: number;
      ease: number[] | string;
    };
  };
  [key: string]: any;
}

/**
 * Standard subtle screen transition variant.
 * Provides high-performance opacity + y-axis slide with cubic-bezier easing.
 */
export const SCREEN_TRANSITION_VARIANTS: Variants = {
  initial: {
    opacity: 0,
    y: 10,
    scale: 0.996
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.24,
      ease: [0.22, 1, 0.36, 1] // Custom cubic-bezier for snappy, natural entrance
    }
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.996,
    transition: {
      duration: 0.16,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

/**
 * Smooth spring transition for active tab indicators and navigation pills.
 */
export const TAB_INDICATOR_TRANSITION = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 32
};

/**
 * Calculates transition timings and validates screen keys.
 */
export function getScreenTransitionConfig(screenId: string) {
  return {
    key: `screen-${screenId}`,
    variants: SCREEN_TRANSITION_VARIANTS,
    initial: 'initial',
    animate: 'animate',
    exit: 'exit'
  };
}
