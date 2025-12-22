import React from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * GlassPageContainer - Main page wrapper with gradient background
 * Provides the glassmorphism canvas for all app pages
 */
const GlassPageContainer = ({ children, className = '' }) => {
  const { isDark } = useTheme();

  const bgClass = isDark
    ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
    : 'bg-gradient-to-br from-slate-50 via-rose-50 to-emerald-50';

  return (
    <div className="min-h-[100dvh] h-[100dvh] overflow-hidden relative">
      {/* Gradient Background Canvas */}
      <div
        className={`absolute inset-0 ${bgClass}`}
        style={
          isDark
            ? undefined
            : {
              backgroundImage: `radial-gradient(circle at 20% 50%, rgba(220, 38, 38, 0.3) 0%, transparent 50%),
               radial-gradient(circle at 80% 20%, rgba(34, 197, 94, 0.3) 0%, transparent 50%),
               radial-gradient(circle at 60% 80%, rgba(251, 191, 36, 0.2) 0%, transparent 50%)`,
              filter: 'blur(80px)',
            }
        }
      />

      {/* Content */}
      <div className={`relative z-10 h-full flex flex-col ${className}`}>
        {children}
      </div>
    </div>
  );
};

export default GlassPageContainer;
