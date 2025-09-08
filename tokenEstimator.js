class TokenEstimator {
  constructor(platformDetector = null) {
    this.averageTokenPerChar = 0.25;
    this.bufferFactor = 1.15;
    this.platformDetector = platformDetector || (typeof window !== 'undefined' && window.PlatformDetector ? new window.PlatformDetector() : null);
    this.currentPlatformConfig = null;
    this.initializePlatform();
  }

  initializePlatform() {
    if (this.platformDetector) {
      const platformInfo = this.platformDetector.getCurrentPlatformConfig();
      this.currentPlatformConfig = platformInfo.config;
      
      if (platformInfo.isSupported) {
        console.log(`[TokenEstimator] Initialized for platform: ${platformInfo.config.name}`);
      } else {
        console.warn('[TokenEstimator] Current platform not supported, using fallback mode');
      }
    }
  }

  estimateTokens(text, includeCode = true) {
    if (!text || typeof text !== 'string') {
      return 0;
    }

    let processedText = text;
    
    if (!includeCode) {
      processedText = this.removeCodeBlocks(text);
    }

    const charCount = processedText.length;
    const wordCount = processedText.trim().split(/\s+/).length;
    
    let baseEstimate;
    if (wordCount > 0) {
      baseEstimate = wordCount * 1.3;
    } else {
      baseEstimate = charCount * this.averageTokenPerChar;
    }

    const estimate = Math.ceil(baseEstimate * this.bufferFactor);
    
    return Math.max(estimate, 1);
  }

  removeCodeBlocks(text) {
    return text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`\n]*`/g, '')
      .replace(/<pre[\s\S]*?<\/pre>/gi, '')
      .replace(/<code[\s\S]*?<\/code>/gi, '')
      .replace(/^\s*```[\s\S]*?```\s*$/gm, '')
      .replace(/^\s{4,}.*$/gm, '')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  estimateConversationTokens(messages, includeCode = true) {
    if (!Array.isArray(messages)) {
      return 0;
    }

    let totalTokens = 0;
    
    for (const message of messages) {
      if (message.role && message.content) {
        totalTokens += this.estimateTokens(message.content, includeCode);
        totalTokens += 4;
      }
    }

    totalTokens += 3;
    
    return totalTokens;
  }

  estimateFromDOM(includeCode = true) {
    const messages = [];
    
    // Lazy init or recover from early init when platform was UNKNOWN
    if (!this.currentPlatformConfig) {
      console.warn('[TokenEstimator] No platform configuration available, attempting to initialize now');
      this.initializePlatform();
      if (!this.currentPlatformConfig) {
        console.warn('[TokenEstimator] Still no platform configuration, returning 0 tokens');
        return 0;
      }
    }

    console.log(`[TokenEstimator] Analyzing DOM for ${this.currentPlatformConfig.name}`);
    console.log(`[TokenEstimator] Primary selector: ${this.currentPlatformConfig.selectors.primary}`);

    // Try primary selector first
    const primaryElements = document.querySelectorAll(this.currentPlatformConfig.selectors.primary);
    console.log(`[TokenEstimator] Found ${primaryElements.length} elements with primary selector`);
    
    for (const element of primaryElements) {
      const message = this.extractMessageFromElement(element);
      if (message) {
        messages.push(message);
        console.log(`[TokenEstimator] Extracted message: ${message.role} - ${message.content.substring(0, 100)}...`);
      } else {
        console.log(`[TokenEstimator] Failed to extract message from element:`, element.tagName, element.className);
      }
    }

    // Try fallback selectors if no messages found
    if (messages.length === 0 && this.currentPlatformConfig.selectors.fallback) {
      console.log(`[TokenEstimator] No messages found with primary selector, trying fallbacks`);
      
      for (const fallbackSelector of this.currentPlatformConfig.selectors.fallback) {
        const fallbackElements = document.querySelectorAll(fallbackSelector);
        console.log(`[TokenEstimator] Trying fallback "${fallbackSelector}": ${fallbackElements.length} elements`);
        
        for (const element of fallbackElements) {
          const message = this.extractMessageFromElement(element);
          if (message) {
            messages.push(message);
            console.log(`[TokenEstimator] Extracted fallback message: ${message.role} - ${message.content.substring(0, 50)}...`);
          }
        }
        if (messages.length > 0) {
          console.log(`[TokenEstimator] Found ${messages.length} messages with fallback selector: ${fallbackSelector}`);
          break; // Stop after finding messages with first working fallback
        }
      }
    }

    console.log(`[TokenEstimator] Final result: Found ${messages.length} messages on ${this.currentPlatformConfig.name}`);
    if (messages.length > 0) {
      console.log('[TokenEstimator] Message roles:', messages.map(m => m.role));
      console.log('[TokenEstimator] Message lengths:', messages.map(m => m.content.length));
    }
    
    return this.estimateConversationTokens(messages, includeCode);
  }

  extractMessageFromElement(element) {
    if (!element || !this.currentPlatformConfig) return null;

    // Pre-filter: Skip obvious UI elements (Claude-specific)
    if (this.currentPlatformConfig.name === 'Claude') {
      const className = element.className || '';
      const content = element.textContent || '';
      
      // Skip elements that are clearly UI components
      if (className.includes('group-hover') || 
          className.includes('transition') || 
          className.includes('button') ||
          className.includes('cursor-') ||
          content.length < 10 ||
          content.match(/^(Copy|Regenerate|Share|Edit|Delete|\s*$)/)) {
        console.log(`[TokenEstimator] Skipping UI element: ${className}`);
        return null;
      }
    }

    // Try to determine role based on platform-specific logic
    let role = this.determineMessageRole(element);
    console.log(`[TokenEstimator] Role determined: ${role} for element:`, element.className);
    
    // Extract content using multiple strategies
    let content = '';
    
    // Strategy 1: Try platform-specific content selectors
    const contentElements = element.querySelectorAll(this.currentPlatformConfig.selectors.content);
    if (contentElements.length > 0) {
      content = Array.from(contentElements)
        .map(el => el.innerText || el.textContent || '')
        .filter(text => text.trim().length > 0) // Filter empty content
        .join(' ')
        .trim();
      console.log(`[TokenEstimator] Content strategy 1 (selectors): found ${contentElements.length} elements, content length: ${content.length}`);
    }
    
    // Strategy 2: If no content found, try the element itself
    if (!content) {
      content = element.innerText || element.textContent || '';
      console.log(`[TokenEstimator] Content strategy 2 (element itself): content length: ${content.length}`);
    }
    
    // Strategy 3: For nested structures, try common text containers
    if (!content || content.length < 10) {
      const textContainers = element.querySelectorAll('p, div, span, [dir="auto"], pre, code');
      const texts = Array.from(textContainers)
        .map(el => el.innerText || el.textContent || '')
        .filter(text => text.trim().length > 0);
      
      if (texts.length > 0) {
        content = texts.join(' ').trim();
        console.log(`[TokenEstimator] Content strategy 3 (nested containers): found ${texts.length} containers, content length: ${content.length}`);
      }
    }
    
    // Strategy 4: Try more aggressive text extraction for Claude
    if ((!content || content.length < 20) && this.currentPlatformConfig.name === 'Claude') {
      // For Claude, try to get all text content more aggressively
      const allTextNodes = [];
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            // Skip empty text nodes and exclude button/navigation text
            const nodeText = node.nodeValue.trim();
            const parentElement = node.parentElement;
            const isButtonText = parentElement && (
              parentElement.tagName === 'BUTTON' || 
              parentElement.classList.contains('button') ||
              parentElement.getAttribute('role') === 'button'
            );
            
            return (nodeText.length > 0 && !isButtonText) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          }
        }
      );
      
      let node;
      while (node = walker.nextNode()) {
        allTextNodes.push(node.nodeValue.trim());
      }
      
      if (allTextNodes.length > 0) {
        content = allTextNodes.join(' ').trim();
        console.log(`[TokenEstimator] Content strategy 4 (text walker): found ${allTextNodes.length} text nodes, content length: ${content.length}`);
      }
    }
    
    // Strategy 5: Claude-specific fallback - look for any div with substantial text content
    if ((!content || content.length < 10) && this.currentPlatformConfig.name === 'Claude') {
      const allDivs = element.querySelectorAll('div');
      for (const div of allDivs) {
        const divText = div.innerText || div.textContent || '';
        if (divText.trim().length > 20 && !divText.includes('Copy') && !divText.includes('Regenerate')) {
          content = divText.trim();
          console.log(`[TokenEstimator] Content strategy 5 (Claude fallback): found content in nested div, length: ${content.length}`);
          break;
        }
      }
    }
    
    console.log(`[TokenEstimator] Final content extraction - Role: ${role}, Content length: ${content.length}, First 100 chars: ${content.substring(0, 100)}`);

    // Relaxed validation: if role is unknown but content is substantial, infer a safe default
    let finalRole = role;
    if ((!finalRole || finalRole === 'unknown') && content && content.trim().length > 10) {
      finalRole = this.inferDefaultRoleForCounting(element, content) || this.currentPlatformConfig.assistantRole || 'assistant';
      console.log(`[TokenEstimator] Role was unknown; inferred default role for counting: ${finalRole}`);
    }

    // Validate content quality and accept with inferred role
    if (content && content.trim().length > 10 && finalRole) {
      const result = { role: finalRole, content: content.trim() };
      console.log(`[TokenEstimator] Returning message with role: ${result.role}`);
      return result;
    }

    console.log(`[TokenEstimator] Content validation failed - content length: ${content.length}, role: ${role}`);
    return null;
  }

  determineMessageRole(element) {
    const config = this.currentPlatformConfig;
    if (!config) {
      console.log(`[TokenEstimator] No platform config available for role determination`);
      return 'unknown';
    }
    
    console.log(`[TokenEstimator] Determining role for element:`, element.tagName, element.className, element.getAttribute('data-testid'));
    
    // Platform-specific role detection
    const detectedPlatform = this.platformDetector?.detectCurrentPlatform();
    console.log(`[TokenEstimator] Detected platform for role determination: ${detectedPlatform}`);
    switch (detectedPlatform) {
      case 'chatgpt':
        return element.getAttribute('data-message-author-role') || 'unknown';
      
      case 'claude':
        // Strategy 1: Check data-is-streaming attribute (modern Claude.ai)
        const isStreaming = element.getAttribute('data-is-streaming');
        if (isStreaming === 'true' || isStreaming === 'false') {
          // Elements with data-is-streaming are assistant responses
          console.log(`[TokenEstimator] Detected assistant role from data-is-streaming: ${isStreaming}`);
          return config.assistantRole;
        }
        
        // Strategy 2: Check data-testid attributes more specifically
        const testId = element.getAttribute('data-testid') || '';
        console.log(`[TokenEstimator] Checking data-testid: ${testId}`);
        if (testId === 'conversation-turn') {
          // Look for nested elements or content patterns to determine role
          const textContent = element.textContent || '';
          // Check for common human question patterns vs AI response patterns
          if (textContent.match(/^(如何|什麼|為什麼|請|可以|能否|幫我|我想|我需要)/)) {
            console.log(`[TokenEstimator] Detected user role from conversation-turn content pattern`);
            return config.userRole;
          }
          // Default for conversation-turn is often assistant
          console.log(`[TokenEstimator] Detected assistant role from conversation-turn default`);
          return config.assistantRole;
        }
        if (testId.includes('user') || testId.includes('human')) {
          console.log(`[TokenEstimator] Detected user role from data-testid: ${testId}`);
          return config.userRole;
        }
        if (testId.includes('assistant') || testId.includes('claude') || testId.includes('model')) {
          console.log(`[TokenEstimator] Detected assistant role from data-testid: ${testId}`);
          return config.assistantRole;
        }
        
        // Strategy 3: Check class names for font patterns and user-message class (most reliable for Claude)
        const className = element.className || '';
        console.log(`[TokenEstimator] Checking className: ${className}`);
        
        if (className.includes('font-user') || className.includes('font-user-message') || 
            className.includes('user-message') || element.closest('[class*="font-user"]')) {
          console.log(`[TokenEstimator] Detected user role from font class`);
          return config.userRole;
        }
        if (className.includes('font-claude') || className.includes('font-claude-message') || 
            className.includes('font-claude-response') || element.closest('[class*="font-claude"]')) {
          console.log(`[TokenEstimator] Detected assistant role from font class`);
          return config.assistantRole;
        }
        
        // Strategy 4: Check for role="article" with data-testid (Claude often uses this pattern)
        const roleAttr = element.getAttribute('role') || '';
        if (roleAttr === 'article' && testId) {
          // Article elements with data-testid are often assistant messages
          console.log(`[TokenEstimator] Detected assistant role from article with testid`);
          return config.assistantRole;
        }
        
        // Strategy 5: Position and layout-based detection
        if (className.includes('justify-end') || className.includes('ml-auto') || 
            element.closest('[class*="justify-end"]') || element.closest('[class*="ml-auto"]')) {
          console.log(`[TokenEstimator] Detected user role from position`);
          return config.userRole;
        }
        
        // Strategy 6: Parent and ancestor checks (look up the DOM tree)
        let currentElement = element;
        for (let i = 0; i < 3; i++) { // Check up to 3 levels up
          if (!currentElement || !currentElement.parentElement) break;
          currentElement = currentElement.parentElement;
          
          const parentClass = currentElement.className || '';
          const parentTestId = currentElement.getAttribute('data-testid') || '';
          
          if (parentClass.includes('font-user') || parentTestId.includes('user') || parentTestId.includes('human')) {
            console.log(`[TokenEstimator] Detected user role from ancestor`);
            return config.userRole;
          }
          if (parentClass.includes('font-claude') || parentTestId.includes('assistant') || parentTestId.includes('claude')) {
            console.log(`[TokenEstimator] Detected assistant role from ancestor`);
            return config.assistantRole;
          }
        }
        
        // Strategy 7: Content-based heuristic with improved patterns
        const text = element.innerText || element.textContent || '';
        if (text && text.trim().length > 10) {
          console.log(`[TokenEstimator] Analyzing text content for role hints (length: ${text.length})`);
          
          // User message indicators (questions, requests)
          const userPatterns = ['?', '？', '如何', '什麼', '為什麼', '幫我', '請', '可以', '能否', '我想', '我需要'];
          const hasUserPatterns = userPatterns.some(pattern => text.includes(pattern));
          
          // Assistant message indicators (responses, explanations)
          const assistantPatterns = ['I can', 'I\'ll', 'Let me', 'Based on', 'Here\'s', 'I understand', 'I\'d be happy', '我可以', '讓我', '根據', '基於'];
          const hasAssistantPatterns = assistantPatterns.some(pattern => text.includes(pattern));
          
          // Short messages with questions are likely user
          if (hasUserPatterns && text.length < 500) {
            console.log(`[TokenEstimator] Detected user role from content patterns`);
            return config.userRole;
          }
          
          // Long messages or those with assistant patterns are likely assistant
          if (hasAssistantPatterns || text.length > 800) {
            console.log(`[TokenEstimator] Detected assistant role from content patterns`);
            return config.assistantRole;
          }
        }
        
        // Strategy 8: Fallback with improved alternating logic
        const allMessages = document.querySelectorAll(this.currentPlatformConfig.selectors.primary);
        const currentIndex = Array.from(allMessages).indexOf(element);
        
        // Filter out elements that don't have substantial content to get better alternation
        const substantialMessages = Array.from(allMessages).filter(el => {
          const content = el.textContent || '';
          return content.trim().length > 20; // Only count elements with substantial content
        });
        const substantialIndex = substantialMessages.indexOf(element);
        
        if (substantialIndex >= 0) {
          // Assuming conversation starts with user message
          const fallbackRole = substantialIndex % 2 === 0 ? config.userRole : config.assistantRole;
          console.log(`[TokenEstimator] Using improved fallback role: ${fallbackRole} (substantial index: ${substantialIndex}/${substantialMessages.length})`);
          return fallbackRole;
        } else {
          // If not in substantial messages, use original index
          const fallbackRole = currentIndex % 2 === 0 ? config.userRole : config.assistantRole;
          console.log(`[TokenEstimator] Using basic fallback role: ${fallbackRole} (index: ${currentIndex})`);
          return fallbackRole;
        }
        
      case 'gemini':
        // Gemini may use different attributes or class patterns
        if (element.classList.contains('user-message') || element.getAttribute('data-testid')?.includes('user')) {
          return config.userRole;
        }
        if (element.classList.contains('model-message') || element.getAttribute('data-testid')?.includes('model')) {
          return config.assistantRole;
        }
        // Heuristic: Gemini often wraps model output in response-container
        const gClass = (element.className || '').toString();
        if (gClass.includes('response-container')) {
          return config.assistantRole;
        }
        // Heuristic: user input/prompt containers
        if (gClass.includes('query-input') || gClass.includes('prompt') || gClass.includes('user-query')) {
          return config.userRole;
        }
        break;
        
      case 'grok':
        // Grok detection logic - supports grok.com and X.com
        const grokTestId = element.getAttribute('data-testid') || '';
        const grokClass = (element.className || '').toString();

        // New: grok.com rich text blocks often have not-prose class
        if (grokClass.includes('not-prose') || element.closest('.not-prose')) {
          return config.assistantRole;
        }

        // Look for X/Twitter specific patterns
        if (grokTestId.includes('tweet') || grokTestId.includes('cellInnerDiv')) {
          const hasGrokIndicator = element.querySelector('[data-testid*="grok"]') ||
                                  element.textContent?.includes('@grok') ||
                                  element.closest('[aria-label*="Grok"]');
          return hasGrokIndicator ? config.assistantRole : config.userRole;
        }
        
        // Fallback checks
        if (grokTestId.includes('user') || element.closest('[data-testid*="user"]')) {
          return config.userRole;
        }
        if (grokTestId.includes('grok') || element.closest('[data-testid*="grok"]')) {
          return config.assistantRole;
        }

        // Alternation fallback for substantial messages on Grok pages
        try {
          const allMessages = document.querySelectorAll(this.currentPlatformConfig.selectors.primary);
          const substantial = Array.from(allMessages).filter(el => (el.textContent || '').trim().length > 20);
          const idx = substantial.indexOf(element);
          if (idx >= 0) {
            return idx % 2 === 0 ? config.userRole : config.assistantRole;
          }
        } catch (e) {
          // ignore
        }
        break;
    }
    
    return 'unknown';
  }

  // When role is unknown but content is substantial, infer a safe default role for counting tokens
  inferDefaultRoleForCounting(element, content) {
    if (!this.currentPlatformConfig) return null;
    const platformName = (this.currentPlatformConfig.name || '').toLowerCase();

    if (platformName.includes('gemini')) {
      const cls = (element.className || '').toString();
      if (cls.includes('response-container') || element.querySelector('.model-response-text, .formatted-text')) {
        return this.currentPlatformConfig.assistantRole;
      }
    }

    if (platformName.includes('grok')) {
      const cls = (element.className || '').toString();
      if (cls.includes('not-prose') || element.closest('.not-prose')) {
        return this.currentPlatformConfig.assistantRole;
      }
    }

    // Default to assistantRole as counting does not depend on role kind
    return this.currentPlatformConfig.assistantRole || 'assistant';
  }

  // Get platform-specific token limit
  getTokenLimit() {
    return this.currentPlatformConfig?.tokenLimit || 8000;
  }

  // Get platform name for display
  getPlatformName() {
    return this.currentPlatformConfig?.name || 'Unknown Platform';
  }
}

if (typeof window !== 'undefined') {
  window.TokenEstimator = TokenEstimator;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TokenEstimator;
}
