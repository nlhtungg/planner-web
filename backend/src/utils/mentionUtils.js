// Utility function to extract mentions from text content
const extractMentions = (content, workspaceMembers) => {
  const mentionPattern = /@(\w+(?:\s+\w+)*)/g;
  const mentions = [];
  const mentionsEveryone = content.includes('@everyone');
  
  let match;
  while ((match = mentionPattern.exec(content)) !== null) {
    const mentionText = match[1].toLowerCase();
    
    // Skip @everyone as it's handled separately
    if (mentionText === 'everyone') {
      continue;
    }
    
    // Find matching user by firstName, lastName, or full name
    const matchedUser = workspaceMembers.find(member => {
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
    
    if (matchedUser && !mentions.includes(matchedUser.user._id.toString())) {
      mentions.push(matchedUser.user._id);
    }
  }
  
  return {
    mentions,
    mentionsEveryone
  };
};

module.exports = {
  extractMentions
};
