import React, { useState, useRef, useEffect } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';

const PRESET_REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'haha', emoji: '😂', label: 'Haha' },
  { type: 'wow', emoji: '😮', label: 'Wow' },
  { type: 'sad', emoji: '😢', label: 'Sad' },
  { type: 'angry', emoji: '😡', label: 'Angry' }
];

const CUSTOM_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😊', '😇', '🙂',
  '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋',
  '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
  '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
  '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
  '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
  '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾',
  '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿',
  '😾', '👏', '🙌', '👐', '🤲', '🤝', '👍', '👎', '👊', '✊',
  '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈',
  '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐', '🖖', '👋', '🤙',
  '💪', '🦾', '🖕', '✍️', '🙏', '🦶', '🦵', '🦿', '💄', '💋',
  '👄', '🦷', '👅', '👂', '🦻', '👃', '👣', '👁', '👀', '🧠',
  '🫀', '🫁', '🦴', '🦷', '💀', '👤', '👥', '🫂', '🗣', '👶'
];

const ReactionPicker = ({ onReact, currentReaction, position = 'top' }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowPicker(false);
        setShowCustom(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPicker]);

  const handleReaction = (reactionType, emoji) => {
    onReact(reactionType, emoji);
    setShowPicker(false);
    setShowCustom(false);
  };

  const positionClasses = position === 'top' 
    ? 'bottom-full mb-2' 
    : 'top-full mt-2';

  return (
    <div className="relative inline-block" ref={pickerRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
          currentReaction
            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        {currentReaction ? (
          <>
            <span className="text-base">{currentReaction.emoji}</span>
            <span>React</span>
          </>
        ) : (
          <span>React</span>
        )}
      </button>

      {/* Reaction Picker Popup */}
      {showPicker && (
        <div className={`absolute ${positionClasses} left-0 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-2`}>
          {!showCustom ? (
            <div className="flex items-center space-x-1">
              {PRESET_REACTIONS.map((reaction) => (
                <button
                  key={reaction.type}
                  onClick={() => handleReaction(reaction.type, reaction.emoji)}
                  className={`p-2 rounded-lg hover:bg-gray-100 transition-all transform hover:scale-125 ${
                    currentReaction?.emoji === reaction.emoji ? 'bg-blue-100' : ''
                  }`}
                  title={reaction.label}
                >
                  <span className="text-2xl">{reaction.emoji}</span>
                </button>
              ))}
              <button
                onClick={() => setShowCustom(true)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-all border border-gray-300"
                title="More reactions"
              >
                <PlusIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          ) : (
            <div className="w-80">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Choose a reaction</h3>
                <button
                  onClick={() => setShowCustom(false)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  ← Back
                </button>
              </div>
              <div className="grid grid-cols-10 gap-1 max-h-64 overflow-y-auto">
                {CUSTOM_EMOJIS.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => handleReaction('custom', emoji)}
                    className={`p-2 rounded hover:bg-gray-100 transition-all transform hover:scale-125 ${
                      currentReaction?.emoji === emoji ? 'bg-blue-100' : ''
                    }`}
                  >
                    <span className="text-xl">{emoji}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReactionPicker;
