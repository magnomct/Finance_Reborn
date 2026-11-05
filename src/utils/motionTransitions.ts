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

/**
 * Slide-up entrance animation (fade-in com slide ascendente) for transaction list items.
 * Starts slightly shifted downwards (y: 16) and fades in while moving up to natural position (y: 0).
 */
export const TRANSACTION_ITEM_VARIANTS: Variants = {
  initial: {
    opacity: 0,
    y: 16,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.16,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

/**
 * Returns staggered entrance transition parameters for individual transaction items,
 * preventing long list delay saturation with a smooth cap.
 */
export function getTransactionItemTransition(
  index: number,
  stepDelay: number = 0.025,
  maxDelay: number = 0.22
) {
  const calculatedDelay = Math.min(index * stepDelay, maxDelay);
  return {
    duration: 0.28,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    delay: calculatedDelay,
  };
}

