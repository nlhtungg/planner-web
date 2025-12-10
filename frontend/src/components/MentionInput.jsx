import React, { useState, useRef, useEffect } from 'react';

const MentionInput = ({ 
  value, 
  onChange, 
  placeholder, 
  members = [], 
  maxLength = 5000,
  rows = 4,
  className = '',
  disabled = false,
  onMentionsChange
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const [mentions, setMentions] = useState([]);
  const [mentionsEveryone, setMentionsEveryone] = useState(false);
  const textareaRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    // Notify parent of mentions changes
    if (onMentionsChange) {
      onMentionsChange(mentions, mentionsEveryone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentions, mentionsEveryone]);

  const detectMention = (text, cursorPos) => {
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) {
      return null;
    }

    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
    
    // Check if there's a space before @, or it's at the start
    const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
    if (charBeforeAt !== ' ' && charBeforeAt !== '\n') {
      return null;
    }

    // Check if there's no space in the text after @
    if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
      return null;
    }

    return {
      start: lastAtIndex,
      searchText: textAfterAt.toLowerCase()
    };
  };

  const filterSuggestions = (searchText) => {
    if (searchText === '') {
      // Show @everyone and all members
      return [
        { id: 'everyone', firstName: 'everyone', lastName: '', isEveryone: true },
        ...members.map(m => ({ ...m.user, isEveryone: false }))
      ];
    }

    const filtered = [];
    
    // Check if @everyone matches
    if ('everyone'.startsWith(searchText)) {
      filtered.push({ id: 'everyone', firstName: 'everyone', lastName: '', isEveryone: true });
    }

    // Filter members
    const matchingMembers = members
      .map(m => ({ ...m.user, isEveryone: false }))
      .filter(user => {
        const firstName = user.firstName?.toLowerCase() || '';
        const lastName = user.lastName?.toLowerCase() || '';
        const fullName = `${firstName} ${lastName}`.trim();
        const email = user.email?.toLowerCase() || '';
        
        return (
          firstName.includes(searchText) ||
          lastName.includes(searchText) ||
          fullName.includes(searchText) ||
          email.includes(searchText)
        );
      });

    return [...filtered, ...matchingMembers];
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);

    const mention = detectMention(newValue, cursorPos);
    
    if (mention) {
      const filtered = filterSuggestions(mention.searchText);
      setSuggestions(filtered);
      setMentionStart(mention.start);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
      setMentionStart(-1);
    }

    // Track mentions in the text
    updateMentionsFromText(newValue);
  };

  const updateMentionsFromText = (text) => {
    const mentionedUsers = [];
    let hasEveryone = false;

    // Extract @mentions
    const mentionPattern = /@(\w+(?:\s+\w+)*)/g;
    let match;

    while ((match = mentionPattern.exec(text)) !== null) {
      const mentionText = match[1].toLowerCase();
      
      if (mentionText === 'everyone') {
        hasEveryone = true;
        continue;
      }

      // Find matching user
      const matchedMember = members.find(member => {
        const user = member.user;
        const firstName = user.firstName?.toLowerCase() || '';
        const lastName = user.lastName?.toLowerCase() || '';
        const fullName = `${firstName} ${lastName}`.trim();
        const email = user.email?.toLowerCase() || '';
        
        return (
          firstName === mentionText ||
          lastName === mentionText ||
          fullName === mentionText ||
          email === mentionText
        );
      });

      if (matchedMember && !mentionedUsers.includes(matchedMember.user._id)) {
        mentionedUsers.push(matchedMember.user._id);
      }
    }

    setMentions(mentionedUsers);
    setMentionsEveryone(hasEveryone);
  };

  const insertMention = (user) => {
    if (!textareaRef.current || mentionStart === -1) return;

    const cursorPos = textareaRef.current.selectionStart;
    const textBefore = value.substring(0, mentionStart);
    const textAfter = value.substring(cursorPos);
    
    const mentionText = user.isEveryone ? '@everyone' : `@${user.firstName} ${user.lastName}`.trim();
    const newValue = textBefore + mentionText + ' ' + textAfter;
    
    onChange(newValue);
    
    // Update cursor position
    const newCursorPos = mentionStart + mentionText.length + 1;
    setTimeout(() => {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);

    setShowSuggestions(false);
    setMentionStart(-1);

    // Update mentions
    if (user.isEveryone) {
      setMentionsEveryone(true);
    } else {
      setMentions(prev => {
        if (!prev.includes(user._id)) {
          return [...prev, user._id];
        }
        return prev;
      });
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
        if (showSuggestions && suggestions.length > 0) {
          e.preventDefault();
          insertMention(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setMentionStart(-1);
        break;
      default:
        break;
    }
  };

  const getSuggestionPosition = () => {
    if (!textareaRef.current || mentionStart === -1) {
      return { top: 0, left: 0 };
    }

    // Simple positioning - show below textarea
    const rect = textareaRef.current.getBoundingClientRect();
    return {
      top: rect.height,
      left: 0
    };
  };

  const position = getSuggestionPosition();

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        className={className}
        disabled={disabled}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full max-w-sm bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          style={{ top: position.top }}
        >
          {suggestions.map((user, index) => (
            <button
              key={user.isEveryone ? 'everyone' : user._id}
              onClick={() => insertMention(user)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-100 transition-colors ${
                index === selectedIndex ? 'bg-gray-100' : ''
              }`}
            >
              {user.isEveryone ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">@</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">@everyone</div>
                    <div className="text-xs text-gray-500">Mention all members</div>
                  </div>
                </>
              ) : (
                <>
                  {user.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={`${user.firstName} ${user.lastName}`} 
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-semibold">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-gray-900">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </div>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionInput;
