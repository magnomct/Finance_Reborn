import React, { useEffect, useRef, useState } from 'react';
import {
  calculateCounterStep,
  easeOutCubic,
  formatCounterCurrency,
  formatCounterNumber,
  getCounterDirection,
} from '../utils/animatedCounter';

interface AnimatedCurrencyCounterProps {
  value: number;
  duration?: number; // milliseconds
  isPercent?: boolean;
  percentDecimals?: number;
  className?: string;
  showDirectionBadge?: boolean;
  badgeSize?: 'xs' | 'sm';
  badgeClassName?: string;
}

export const AnimatedCurrencyCounter: React.FC<AnimatedCurrencyCounterProps> = ({
  value,
  duration = 650,
  isPercent = false,
  percentDecimals = 0,
  className = '',
  showDirectionBadge = false,
  badgeSize = 'xs',
  badgeClassName = '',
}) => {
  // Current displayed interpolated value
  const [displayValue, setDisplayValue] = useState<number>(value);
  // Direction state for transient indicator ('up' | 'down' | 'same')
  const [direction, setDirection] = useState<'up' | 'down' | 'same'>('same');
  const [isAnimating, setIsAnimating] = useState(false);

  // References to track animation lifecycle
  const prevTargetRef = useRef<number>(value);
  const currentDisplayRef = useRef<number>(value);
  const animationFrameRef = useRef<number | null>(null);
  const timeoutBadgeRef = useRef<number | null>(null);

  useEffect(() => {
    currentDisplayRef.current = displayValue;
  }, [displayValue]);

  useEffect(() => {
    const prevTarget = prevTargetRef.current;
    if (Math.abs(value - prevTarget) < 0.005) {
      return;
    }

    const dir = getCounterDirection(prevTarget, value);
    setDirection(dir);
    setIsAnimating(true);
    prevTargetRef.current = value;

    // Clear any previous direction badge auto-hide
    if (timeoutBadgeRef.current) {
      window.clearTimeout(timeoutBadgeRef.current);
      timeoutBadgeRef.current = null;
    }

    // Cancel existing active animation frame if any
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const startVal = currentDisplayRef.current;
    const endVal = value;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const nextStep = calculateCounterStep(startVal, endVal, progress, easeOutCubic);

      setDisplayValue(nextStep);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endVal);
        setIsAnimating(false);
        animationFrameRef.current = null;

        // Keep direction badge visible for an extra 1.2s then fade back to same
        timeoutBadgeRef.current = window.setTimeout(() => {
          setDirection('same');
        }, 1200);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timeoutBadgeRef.current) {
        window.clearTimeout(timeoutBadgeRef.current);
      }
    };
  }, [value, duration]);

  const formattedText = isPercent
    ? `${formatCounterNumber(displayValue, percentDecimals)}%`
    : formatCounterCurrency(displayValue);

  return (
    <span className={`inline-flex items-center gap-1.5 transition-colors duration-200 ${className}`}>
      <span
        className={`tabular-nums ${
          isAnimating
            ? direction === 'up'
              ? 'text-emerald-400 font-semibold drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]'
              : direction === 'down'
              ? 'text-amber-400 font-semibold drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]'
              : ''
            : ''
        }`}
      >
        {formattedText}
      </span>

      {showDirectionBadge && direction !== 'same' && (
        <span
          className={`inline-flex items-center justify-center font-bold rounded px-1 py-0.2 animate-pulse ${
            badgeSize === 'xs' ? 'text-[10px] h-4' : 'text-xs h-5'
          } ${
            direction === 'up'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          } ${badgeClassName}`}
          title={direction === 'up' ? 'Saldo aumentando' : 'Saldo diminuindo'}
        >
          {direction === 'up' ? '▲' : '▼'}
        </span>
      )}
    </span>
  );
};
