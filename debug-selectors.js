// Debug script to test selectors on Claude.ai and Grok.com
// Run this in browser console on the target sites

function debugSelectors() {
  console.log('=== DOM Debug Script ===');
  console.log('URL:', window.location.href);
  console.log('Hostname:', window.location.hostname);
  
  // Claude selectors to test
  const claudeSelectors = {
    primary: '[data-testid*="message"], .font-user-message, .font-claude-message, [role="group"]',
    content: '.font-claude-message, .font-user-message, [data-testid="message-content"], .prose, .whitespace-pre-wrap',
    fallback: ['[class*="message"]', '.conversation [role="group"]', '.flex.flex-col', '[class*="font-"]']
  };

  // Grok selectors to test
  const grokSelectors = {
    primary: '[data-testid*="grok"], [data-testid*="message"], .message, .chat-message',
    content: '[data-testid="tweetText"], .css-901oao, [dir="auto"], .message-content, .text-content',
    fallback: ['[role="article"]', '.css-1dbjc4n', '[class*="message"]', '[class*="chat"]']
  };

  // Determine platform
  const isGrok = window.location.hostname.includes('grok.com') || 
                window.location.hostname.includes('x.com') && 
                window.location.pathname.includes('grok');
  
  const selectors = isGrok ? grokSelectors : claudeSelectors;
  const platform = isGrok ? 'Grok' : 'Claude';
  
  console.log(`\n=== Testing ${platform} Selectors ===`);
  
  // Test primary selector
  console.log(`\nTesting primary: ${selectors.primary}`);
  const primaryElements = document.querySelectorAll(selectors.primary);
  console.log(`Found ${primaryElements.length} elements`);
  
  if (primaryElements.length > 0) {
    console.log('First 3 primary elements:');
    Array.from(primaryElements).slice(0, 3).forEach((el, i) => {
      console.log(`  ${i+1}. Tag: ${el.tagName}, Classes: ${el.className}, Data-testid: ${el.getAttribute('data-testid')}`);
      console.log(`     Text preview: ${el.innerText?.substring(0, 100)}...`);
    });
  }
  
  // Test content selectors
  console.log(`\nTesting content: ${selectors.content}`);
  const contentElements = document.querySelectorAll(selectors.content);
  console.log(`Found ${contentElements.length} content elements`);
  
  if (contentElements.length > 0) {
    console.log('First 3 content elements:');
    Array.from(contentElements).slice(0, 3).forEach((el, i) => {
      console.log(`  ${i+1}. Tag: ${el.tagName}, Classes: ${el.className}`);
      console.log(`     Text: ${el.innerText?.substring(0, 150)}...`);
    });
  }
  
  // Test fallback selectors
  console.log(`\nTesting fallback selectors:`);
  selectors.fallback.forEach((fallback, index) => {
    const fallbackElements = document.querySelectorAll(fallback);
    console.log(`  ${index+1}. ${fallback}: ${fallbackElements.length} elements`);
  });
  
  // Find common patterns
  console.log(`\n=== DOM Analysis ===`);
  
  // Look for data-testid patterns
  const dataTestIdElements = document.querySelectorAll('[data-testid]');
  const testIds = Array.from(dataTestIdElements).map(el => el.getAttribute('data-testid'));
  const uniqueTestIds = [...new Set(testIds)];
  console.log(`Found ${uniqueTestIds.length} unique data-testid values:`);
  uniqueTestIds.slice(0, 20).forEach(id => console.log(`  - ${id}`));
  
  // Look for role patterns
  const roleElements = document.querySelectorAll('[role]');
  const roles = Array.from(roleElements).map(el => el.getAttribute('role'));
  const uniqueRoles = [...new Set(roles)];
  console.log(`\nFound ${uniqueRoles.length} unique role values:`);
  uniqueRoles.forEach(role => console.log(`  - ${role}`));
  
  // Look for common class patterns that might indicate messages
  const allElements = document.querySelectorAll('*');
  const messageClasses = new Set();
  
  Array.from(allElements).forEach(el => {
    const classes = el.className;
    if (typeof classes === 'string' && classes) {
      classes.split(' ').forEach(cls => {
        if (cls.toLowerCase().includes('message') || 
            cls.toLowerCase().includes('chat') ||
            cls.toLowerCase().includes('conversation') ||
            cls.toLowerCase().includes('turn') ||
            cls.toLowerCase().includes('user') ||
            cls.toLowerCase().includes('assistant') ||
            cls.toLowerCase().includes('claude') ||
            cls.toLowerCase().includes('grok')) {
          messageClasses.add(cls);
        }
      });
    }
  });
  
  console.log(`\nFound ${messageClasses.size} message-related class names:`);
  Array.from(messageClasses).slice(0, 30).forEach(cls => console.log(`  - ${cls}`));
  
  return {
    platform,
    primaryCount: primaryElements.length,
    contentCount: contentElements.length,
    testIds: uniqueTestIds,
    roles: uniqueRoles,
    messageClasses: Array.from(messageClasses)
  };
}

// Auto-run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', debugSelectors);
} else {
  debugSelectors();
}

// Export for manual use
window.debugSelectors = debugSelectors;