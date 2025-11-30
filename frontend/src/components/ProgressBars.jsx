// ProgressBars.jsx - Jira-like dual bars for estimate vs logged time
import React from 'react';
import { percentOf, formatHours } from '../utils/taskUtils';

const ProgressBars = ({ estimatedHours = 0, loggedHours = 0, manualProgress = 0, autoProgress = 0 }) => {
  const loggedPct = percentOf(loggedHours, estimatedHours);
  const overLogged = estimatedHours > 0 && loggedHours > estimatedHours;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="text-gray-700">
          Logged: <span className="font-medium">{formatHours(loggedHours)}</span> / Estimate: <span className="font-medium">{formatHours(estimatedHours)}</span>{' '}
          <span className="ml-2 text-gray-500">({autoProgress}% time-based)</span>
        </div>
        {overLogged && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">&gt;100%</span>
        )}
      </div>
      {/* Track */}
      <div className="w-full h-3 bg-gray-200 rounded-md overflow-hidden" aria-label="Estimate track">
        {/* Logged fill */}
        <div
          data-testid="logged-fill"
          className="h-3 bg-blue-600"
          style={{ width: `${loggedPct}%` }}
          aria-valuenow={loggedPct}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>
      <div className="text-xs text-gray-500">
        Manual override: <span className="font-medium">{manualProgress}%</span>
        {manualProgress !== autoProgress && (
          <span className="ml-2 italic">(diff {Math.abs((manualProgress||0) - (autoProgress||0))}%)</span>
        )}
      </div>
    </div>
  );
};

export default ProgressBars;
