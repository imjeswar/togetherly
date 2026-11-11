import React from 'react';
import { motion } from 'framer-motion';

interface CandleFlameProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  streakCount?: number;
  showCandleBody?: boolean;
}

export const CandleFlame: React.FC<CandleFlameProps> = ({
  size = 'md',
  streakCount,
  showCandleBody = true,
}) => {
  const dimensions = {
    sm: { width: 32, height: 48, flameWidth: 16, flameHeight: 24 },
    md: { width: 48, height: 72, flameWidth: 24, flameHeight: 36 },
    lg: { width: 72, height: 108, flameWidth: 36, flameHeight: 54 },
    xl: { width: 100, height: 140, flameWidth: 50, flameHeight: 70 },
  }[size];

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Outer Glow Halo */}
      <motion.div
        animate={{
          scale: [1, 1.15, 0.98, 1.1, 1],
          opacity: [0.4, 0.65, 0.45, 0.6, 0.4],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute rounded-full blur-xl pointer-events-none"
        style={{
          width: dimensions.flameWidth * 3.5,
          height: dimensions.flameHeight * 3.5,
          background: 'radial-gradient(circle, rgba(232, 160, 168, 0.5) 0%, rgba(217, 183, 126, 0.35) 50%, transparent 75%)',
          top: -dimensions.flameHeight * 0.4,
        }}
      />

      {/* Flame SVG */}
      <motion.div
        animate={{
          rotate: [-1.5, 2, -1, 1.5, -1.5],
          scaleY: [1, 1.08, 0.96, 1.05, 1],
          scaleX: [1, 0.96, 1.03, 0.98, 1],
        }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative z-10 candle-flame"
        style={{
          width: dimensions.flameWidth,
          height: dimensions.flameHeight,
        }}
      >
        <svg
          viewBox="0 0 100 150"
          className="w-full h-full overflow-visible drop-shadow-[0_0_12px_rgba(217,183,126,0.8)]"
        >
          <defs>
            <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#C77983" />
              <stop offset="25%" stopColor="#E8A0A8" />
              <stop offset="60%" stopColor="#D9B77E" />
              <stop offset="90%" stopColor="#FFF8F5" />
            </linearGradient>
            <radialGradient id="innerGlow" cx="50%" cy="80%" r="50%">
              <stop offset="0%" stopColor="#FFF8F5" />
              <stop offset="50%" stopColor="#D9B77E" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* Outer flame droplet */}
          <path
            d="M 50 5 C 60 40, 95 80, 75 125 C 65 145, 35 145, 25 125 C 5 80, 40 40, 50 5 Z"
            fill="url(#flameGrad)"
          />

          {/* Inner core white hot droplet */}
          <path
            d="M 50 50 C 56 75, 75 95, 65 120 C 58 132, 42 132, 35 120 C 25 95, 44 75, 50 50 Z"
            fill="url(#innerGlow)"
          />
        </svg>
      </motion.div>

      {/* Candle Body (optional) */}
      {showCandleBody && (
        <div className="relative flex flex-col items-center -mt-1 z-0">
          {/* Wick */}
          <div className="w-[3px] h-3 bg-neutral-900 rounded-t-sm" />
          {/* Candle wax cylinder */}
          <div
            className="rounded-t-lg bg-gradient-to-b from-[#2B2333] via-[#211B27] to-[#17131C] border border-white/10 shadow-inner"
            style={{
              width: dimensions.width,
              height: dimensions.height * 0.55,
            }}
          >
            {/* Candle wax rim highlight */}
            <div className="w-full h-1.5 bg-gradient-to-r from-transparent via-[#E8A0A8]/30 to-transparent rounded-t-lg" />
          </div>
        </div>
      )}

      {/* Streak badge */}
      {streakCount !== undefined && (
        <div className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-togetherly-card border border-togetherly-gold/30 shadow-sm">
          <span className="text-togetherly-gold text-xs font-semibold tracking-wider uppercase">
            {streakCount} {streakCount === 1 ? 'day spark' : 'day streak'}
          </span>
        </div>
      )}
    </div>
  );
};
