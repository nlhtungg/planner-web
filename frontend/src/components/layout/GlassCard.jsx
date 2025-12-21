import React from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * GlassCard - Reusable glassmorphism card component
 * Used for content sections throughout the app
 */
const GlassCard = ({ 
  children, 
  className = '',
  padding = 'p-6',
  rounded = 'rounded-3xl',
  ...props 
}) => {
  const { isDark } = useTheme();

  const glassCardClass = isDark ? 'bg-slate-900/40' : 'bg-white/60';
  const borderClass = isDark ? 'border-white/10' : 'border-white/40';
  const shadowClass = isDark ? 'shadow-[0_18px_55px_rgba(0,0,0,0.55)]' : 'shadow-xl';

  return (
    <div
      className={`${glassCardClass} backdrop-blur-xl border ${borderClass} ${shadowClass} ${rounded} ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
