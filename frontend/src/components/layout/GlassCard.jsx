import React from 'react';
// import { useTheme } from '../../context/ThemeContext'; // No longer needed - uses CSS utilities

/**
 * GlassCard - Reusable glassmorphism card component
 * Used for content sections throughout the app
 * Now uses CSS utility classes for automatic dark mode support
 */
const GlassCard = ({ 
  children, 
  className = '',
  padding = 'p-6',
  rounded = 'rounded-3xl',
  ...props 
}) => {
  // OLD: manual theme classes - replaced with CSS utilities
  // const { isDark } = useTheme();
  // const glassCardClass = isDark ? 'bg-slate-900/40' : 'bg-white/60';
  // const borderClass = isDark ? 'border-white/10' : 'border-white/40';
  // const shadowClass = isDark ? 'shadow-[0_18px_55px_rgba(0,0,0,0.55)]' : 'shadow-xl';

  return (
    <div
      className={`glass-card backdrop-blur-xl border ${rounded} ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
