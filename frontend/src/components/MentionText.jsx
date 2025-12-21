import React from 'react';

/**
 * Component that renders text with @mentions highlighted
 * @param {string} content - The text content to render
 * @param {Array} mentions - Array of user IDs that were mentioned
 * @param {boolean} mentionsEveryone - Whether @everyone was mentioned
 * @param {Array} members - Array of workspace members for name lookup
 */
const MentionText = ({ content, mentions = [], mentionsEveryone = false, members = [], className = '' }) => {
  // Create a map of user IDs to user objects for quick lookup
  const memberMap = React.useMemo(() => {
    const map = new Map();
    members.filter(member => member).forEach(member => {
      map.set(member._id, member);
    });
    return map;
  }, [members]);

  // Parse the content and replace @mentions with styled spans
  const renderContent = () => {
    if (!content) return null;

    // Regular expression to match @mentions (including multi-word names like "Tung Nguyen")
    const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionText = match[1];
      const beforeText = content.substring(lastIndex, match.index);
      
      // Add text before the mention
      if (beforeText) {
        parts.push(beforeText);
      }

      // Check if this is @everyone
      if (mentionText.toLowerCase() === 'everyone' && mentionsEveryone) {
        parts.push(
          <span 
            key={`mention-${match.index}`}
            className="text-blue-600 font-medium bg-blue-50 px-1 rounded"
          >
            @{mentionText}
          </span>
        );
      } else {
        // Find the mentioned user
        const mentionedUser = members.find(m => {
          const fullName = `${m.firstName} ${m.lastName}`.toLowerCase().trim();
          const email = m.email.split('@')[0].toLowerCase();
          return fullName === mentionText.toLowerCase() || email === mentionText.toLowerCase();
        });

        // Check if this user is in the mentions array
        if (mentionedUser && mentions.includes(mentionedUser._id)) {
          parts.push(
            <span 
              key={`mention-${match.index}`}
              className="text-blue-600 font-medium bg-blue-50 px-1 rounded cursor-pointer hover:bg-blue-100"
              title={`${mentionedUser.firstName} ${mentionedUser.lastName} (${mentionedUser.email})`}
            >
              @{mentionText}
            </span>
          );
        } else {
          // Not a valid mention, render as plain text
          parts.push(`@${mentionText}`);
        }
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  return (
    <p className={className}>
      {renderContent()}
    </p>
  );
};

export default MentionText;
