class PlatformDetector {
  constructor() {
    this.platforms = {
      CHATGPT: 'chatgpt',
      CLAUDE: 'claude', 
      GEMINI: 'gemini',
      GROK: 'grok',
      UNKNOWN: 'unknown'
    };

    this.platformConfigs = {
      [this.platforms.CHATGPT]: {
        domains: ['chat.openai.com', 'chatgpt.com'],
        enabled: true,
        selectors: {
          primary: '[data-message-author-role]',
          fallback: ['.group\\/conversation-turn', '[data-testid*="conversation"]'],
          content: '.markdown, .whitespace-pre-wrap, .prose',
          userRole: 'user',
          assistantRole: 'assistant'
        },
        tokenLimit: 8000,
        name: 'ChatGPT'
      },

      [this.platforms.CLAUDE]: {
        domains: ['claude.ai'],
        // Temporarily disabled due to unstable DOM; keep config for future use
        enabled: false,
        selectors: {
          primary: 'div[data-is-streaming="true"], div[data-is-streaming="false"], div[data-testid="conversation-turn"], div[class*="font-user-message"], div[class*="font-claude-message"], [role="article"][data-testid]',
          fallback: ['div[class*="font-user"], div[class*="font-claude"], div[data-testid*="user"], div[data-testid*="assistant"], div[data-testid*="human"], .prose', 'div[class*="group"] > div[class*="relative"]', 'div[class*="flex"] > div[class*="max-w"]'],
          content: '.prose, .whitespace-pre-wrap, div[class*="font-"], p, span, pre, code, div[class*="text-"], div[dir="auto"], div[class*="whitespace-"]',
          userRole: 'human',
          assistantRole: 'assistant'
        },
        tokenLimit: 200000,
        name: 'Claude'
      },

      [this.platforms.GEMINI]: {
        domains: ['gemini.google.com', 'bard.google.com'],
        enabled: true,
        selectors: {
          primary: '[data-testid*="message"], .conversation-turn, .response-container, .query-input',
          fallback: ['[class*="message-container"]', '[role="presentation"]', '[class*="conversation"]', '[class*="response"]'],
          content: '.markdown, .message-content, .formatted-text, .model-response-text, [data-testid*="text"]',
          userRole: 'user',
          assistantRole: 'model'
        },
        tokenLimit: 30000,
        name: 'Gemini'
      },

      [this.platforms.GROK]: {
        domains: ['grok.com', 'x.com', 'twitter.com'],
        urlPatterns: ['/i/grok', 'grok.com'],
        enabled: true,
        selectors: {
          primary: '.not-prose, [data-testid*="cellInnerDiv"], [data-testid*="conversation"], [data-testid*="grok"], .r-1habvwh, .r-16y2uox',
          fallback: ['[role="article"]', '[data-testid="tweet"]', '.css-1dbjc4n > div', '[class*="r-"]', 'div[dir="auto"]'],
          content: '.not-prose, [data-testid="tweetText"], .css-901oao, [dir="auto"], .r-37j5jr, .r-16dba41, .r-bnwqim, .r-1q142lx',
          userRole: 'user', 
          assistantRole: 'assistant'
        },
        tokenLimit: 25000,
        name: 'Grok'
      }
    };
  }

  detectCurrentPlatform() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    const fullUrl = window.location.href;

    console.log(`[PlatformDetector] Detecting platform for: ${fullUrl}`);

    // Domain-based detection with more flexible matching
    for (const [platform, config] of Object.entries(this.platformConfigs)) {
      if (config.domains?.some(domain => hostname.includes(domain) || domain.includes(hostname))) {
        console.log(`[PlatformDetector] Domain match found for ${platform}: ${hostname}`);
        
        // Additional URL pattern check for platforms like Grok
        if (config.urlPatterns) {
          const patternMatch = config.urlPatterns.some(pattern => 
            pathname.includes(pattern) || fullUrl.includes(pattern) || hostname.includes(pattern)
          );
          if (patternMatch) {
            console.log(`[PlatformDetector] URL pattern match for ${platform}`);
            return platform;
          }
          console.log(`[PlatformDetector] Domain matched but URL pattern failed for ${platform}`);
        } else {
          console.log(`[PlatformDetector] Platform detected: ${platform}`);
          return platform;
        }
      }
    }

    console.log(`[PlatformDetector] No domain match found, trying DOM detection`);
    // Fallback: DOM-based detection
    return this.detectByDOM();
  }

  detectByDOM() {
    console.log(`[PlatformDetector] Starting DOM-based detection`);
    
    // Try to identify platform by unique DOM elements
    for (const [platform, config] of Object.entries(this.platformConfigs)) {
      const primaryElement = document.querySelector(config.selectors.primary);
      console.log(`[PlatformDetector] Checking ${platform} primary selector: ${config.selectors.primary} - ${primaryElement ? 'Found' : 'Not found'}`);
      
      if (primaryElement) {
        console.log(`[PlatformDetector] DOM match found for ${platform}`);
        return platform;
      }
      
      // Try fallback selectors
      if (config.selectors.fallback) {
        for (const fallbackSelector of config.selectors.fallback) {
          const fallbackElement = document.querySelector(fallbackSelector);
          if (fallbackElement) {
            console.log(`[PlatformDetector] Fallback DOM match found for ${platform} with selector: ${fallbackSelector}`);
            return platform;
          }
        }
      }
    }

    console.log(`[PlatformDetector] No DOM match found, returning UNKNOWN`);
    return this.platforms.UNKNOWN;
  }

  getCurrentPlatformConfig() {
    const platform = this.detectCurrentPlatform();
    const config = this.platformConfigs[platform] || null;
    const isEnabled = config ? config.enabled !== false : false;
    return {
      platform,
      config,
      isSupported: platform !== this.platforms.UNKNOWN && isEnabled,
      isEnabled
    };
  }

  getPlatformName() {
    const platformInfo = this.getCurrentPlatformConfig();
    return platformInfo.config?.name || 'Unknown Platform';
  }

  getPlatformTokenLimit() {
    const platformInfo = this.getCurrentPlatformConfig();
    return platformInfo.config?.tokenLimit || 8000;
  }

  // Check if platform supports the extension
  isCurrentPlatformSupported() {
    return this.getCurrentPlatformConfig().isSupported;
  }

  // Get all supported domains for manifest
  getAllSupportedDomains() {
    const domains = [];
    for (const config of Object.values(this.platformConfigs)) {
      if (config.domains) {
        domains.push(...config.domains.map(domain => `https://${domain}/*`));
      }
    }
    return [...new Set(domains)]; // Remove duplicates
  }

  // Debug info for development
  getDebugInfo() {
    const platform = this.detectCurrentPlatform();
    return {
      platform,
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      url: window.location.href,
      config: this.platformConfigs[platform] || null,
      domainMatch: this.checkDomainMatch(),
      elementsFound: this.findPlatformElements()
    };
  }

  checkDomainMatch() {
    const hostname = window.location.hostname;
    const matches = {};
    for (const [platform, config] of Object.entries(this.platformConfigs)) {
      matches[platform] = config.domains?.some(domain => hostname.includes(domain)) || false;
    }
    return matches;
  }

  findPlatformElements() {
    const found = {};
    for (const [platform, config] of Object.entries(this.platformConfigs)) {
      found[platform] = {
        primary: !!document.querySelector(config.selectors.primary),
        fallbackFound: config.selectors.fallback?.some(sel => !!document.querySelector(sel)) || false,
        contentFound: !!document.querySelector(config.selectors.content)
      };
    }
    return found;
  }
}

// Global export
if (typeof window !== 'undefined') {
  window.PlatformDetector = PlatformDetector;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PlatformDetector;
}
