import React, { ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'subtle' | 'accent' | 'interactive';
  glow?: 'none' | 'rose' | 'gold';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  variant = 'default',
  glow = 'none',
  ...motionProps
}) => {
  const variantStyles = {
    default: 'glass-panel rounded-2xl shadow-glass',
    subtle: 'glass-panel-subtle rounded-xl',
    accent: 'glass-panel-accent rounded-2xl shadow-glow-rose/20',
    interactive:
      'glass-panel rounded-2xl cursor-pointer hover:border-togetherly-rose/30 hover:bg-togetherly-cardHover/80 transition-all duration-300 shadow-glass',
  }[variant];

  const glowStyles = {
    none: '',
    rose: 'shadow-glow-rose border-togetherly-rose/30',
    gold: 'shadow-glow-gold border-togetherly-gold/30',
  }[glow];

  return (
    <motion.div
      className={twMerge(clsx(variantStyles, glowStyles, className))}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
};

