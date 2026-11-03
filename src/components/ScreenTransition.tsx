import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SCREEN_TRANSITION_VARIANTS } from '../utils/motionTransitions';

interface ScreenTransitionProps {
  screenKey: string;
  children: ReactNode;
  className?: string;
}

export const ScreenTransition: React.FC<ScreenTransitionProps> = ({
  screenKey,
  children,
  className = 'w-full'
}) => {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={screenKey}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={SCREEN_TRANSITION_VARIANTS}
        className={className}
        data-testid={`screen-transition-${screenKey}`}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
