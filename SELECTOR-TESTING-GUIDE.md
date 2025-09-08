# Selector Testing Guide

## Quick Testing Steps

### For Claude.ai:
1. Open https://claude.ai and start a conversation
2. Open Developer Tools (F12) → Console tab
3. Paste this code to test selectors:

```javascript
// Test current selectors
const primarySelector = '[data-testid*="message"], [data-testid*="conversation-turn"], .conversation-turn, [role="article"]';
const contentSelector = '[data-testid*="message-content"], .font-claude-message, .font-user-message, .prose, .markdown, .whitespace-pre-wrap, .text-base, .leading-relaxed';

console.log('=== Claude Selector Test ===');
const primaryElements = document.querySelectorAll(primarySelector);
console.log(`Primary selector found: ${primaryElements.length} elements`);

primaryElements.forEach((el, i) => {
  console.log(`Element ${i+1}:`, el.tagName, el.className);
  const content = el.querySelector(contentSelector) || el;
  console.log(`  Content: ${(content.innerText || '').substring(0, 100)}...`);
});

// Alternative discovery
console.log('\n=== DOM Discovery ===');
const testIdElements = document.querySelectorAll('[data-testid]');
const messageTestIds = Array.from(testIdElements)
  .map(el => el.getAttribute('data-testid'))
  .filter(id => id && (id.includes('message') || id.includes('conversation') || id.includes('turn')))
  .slice(0, 10);
console.log('Message-related testids:', [...new Set(messageTestIds)]);

const roleElements = document.querySelectorAll('[role="article"], [role="group"]');
console.log(`Role elements found: ${roleElements.length}`);
roleElements.forEach((el, i) => {
  if (i < 3) console.log(`  Role element ${i+1}:`, el.tagName, el.className);
});
```

### For Grok (x.com/i/grok):
1. Open https://x.com/i/grok and start a conversation  
2. Open Developer Tools (F12) → Console tab
3. Paste this code:

```javascript
// Test current selectors
const primarySelector = '[data-testid*="cellInnerDiv"], [data-testid*="conversation"], [data-testid*="grok"], .r-1habvwh, .r-16y2uox';
const contentSelector = '[data-testid="tweetText"], .css-901oao, [dir="auto"], .r-37j5jr, .r-16dba41, .r-bnwqim, .r-1q142lx';

console.log('=== Grok Selector Test ===');
const primaryElements = document.querySelectorAll(primarySelector);
console.log(`Primary selector found: ${primaryElements.length} elements`);

primaryElements.forEach((el, i) => {
  if (i < 5) { // Limit output for Twitter's busy DOM
    console.log(`Element ${i+1}:`, el.tagName, el.className);
    const content = el.querySelector(contentSelector) || el;
    console.log(`  Content: ${(content.innerText || '').substring(0, 100)}...`);
  }
});

// Grok-specific discovery
console.log('\n=== Grok Discovery ===');
const grokElements = document.querySelectorAll('[data-testid*="grok"], [aria-label*="grok" i], [aria-label*="Grok" i]');
console.log(`Grok-specific elements: ${grokElements.length}`);

const conversationElements = document.querySelectorAll('[data-testid*="conversation"], [data-testid*="cellInnerDiv"]');
console.log(`Conversation elements: ${conversationElements.length}`);
```

## What to Look For

### Claude.ai Success Indicators:
- Should find 4+ elements (2+ messages in typical conversation)
- Content should contain actual message text, not navigation/UI text  
- Each element should have meaningful content (>10 characters)

### Grok Success Indicators:  
- Should find conversation messages, not just tweets
- Content should be Grok responses and user queries
- Should distinguish between regular X content and Grok conversation

## Debugging Steps

1. **Run the test scripts above** - This will show you what the current selectors find
2. **Check console logs** - Look for TokenEstimator messages when the extension runs
3. **Inspect elements manually** - Right-click on actual chat messages and inspect their structure

### Manual Inspection Checklist:
- [ ] What `data-testid` values do message containers have?
- [ ] What CSS classes are on message containers?
- [ ] Where is the actual text content located in the DOM hierarchy?
- [ ] How do user messages differ from assistant messages?

## Common Issues & Solutions

### Issue: "Found 0 messages"
**Solution:** The primary selector isn't matching message containers
- Check if data-testid values have changed
- Look for new CSS class patterns
- Try the fallback selectors manually

### Issue: "Found X messages but token count seems wrong"  
**Solution:** Content selector isn't finding the right text
- Check if text is in nested elements
- Look for new text container classes
- Verify the content selector targets actual message text

### Issue: Role detection failing
**Solution:** Role determination logic needs updating
- Check how user vs assistant messages are differentiated
- Look for new attributes or class patterns
- Update the `determineMessageRole` function

## Report Template

When reporting findings, please include:

```
Platform: Claude.ai / Grok
URL: [full URL]
Current Behavior: Found X messages, token count Y
Expected Behavior: Should find Z messages

Working Selectors Found:
- Primary: [selector that works]  
- Content: [selector that finds text]

Sample DOM Structure:
[paste relevant HTML structure]

Suggested Configuration:
[new selector configuration]
```

## Test Results Validation

Good results should show:
- **Claude:** 2+ messages per conversation exchange, content includes actual chat text
- **Grok:** Conversation messages distinct from regular tweets, includes both user queries and Grok responses
- **Token counts:** Reasonable estimates (not 0, not obviously wrong)

## Next Steps After Testing

1. Update platformDetector.js with working selectors
2. Test the extension reload (chrome://extensions/)  
3. Verify functionality on both platforms
4. Check edge cases (very long conversations, code blocks, etc.)