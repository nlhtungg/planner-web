import React, { useState } from 'react';

const ReactionBar = ({ reactions, userReaction, onShowDetails }) => {
  if (!reactions || reactions.length === 0) {
    return null;
  }

  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);
  
  // Group reactions and show top 3
  const topReactions = reactions.slice(0, 3);

  return (
    <button
      onClick={onShowDetails}
      className="flex items-center space-x-1 px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
    >
      <div className="flex -space-x-1">
        {topReactions.map((reaction, index) => (
          <span
            key={index}
            className="inline-block w-5 h-5 rounded-full bg-white flex items-center justify-center text-xs border border-gray-200"
            style={{ zIndex: topReactions.length - index }}
          >
            {reaction._id}
          </span>
        ))}
      </div>
      <span className="text-gray-700 font-medium">{totalReactions}</span>
    </button>
  );
};

export default ReactionBar;
