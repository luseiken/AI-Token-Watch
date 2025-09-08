class AITokenWatch {
  constructor() {
    this.platformDetector = new PlatformDetector();
    this.tokenEstimator = new TokenEstimator(this.platformDetector);
    this.hud = null;
    this.settings = {
      enabled: true,
      includeCode: true,
      warningThreshold: 80,
      minRemainingTokens: 1000,
      maxTokens: 8000, // Will be updated based on platform
      updateInterval: 2000
    };
    this.currentTokens = 0;
    this.updateTimer = null;
    this.lastUrl = window.location.href;
    this.debugMode = this.isWideScreen();
    
    this.init();
  }

  async init() {
    console.log('[AITokenWatch] Starting initialization on:', window.location.href);
    
    const platformInfo = this.platformDetector.getCurrentPlatformConfig();
    console.log('[AITokenWatch] Platform detection result:', platformInfo);
    
    // Create debug HUD for unsupported platforms only
    if (!platformInfo.isSupported) {
      console.log('[AITokenWatch] Creating debug HUD for unsupported platform');
      this.createDebugHUD(platformInfo);
    }
    
    // Check if current platform is supported
    if (!platformInfo.isSupported) {
      console.log('[AITokenWatch] Current platform not supported, showing debug only');
      console.log('[AITokenWatch] Debug info:', this.platformDetector.getDebugInfo());
      return;
    }

    // Update maxTokens based on platform
    this.settings.maxTokens = this.tokenEstimator.getTokenLimit();
    
    await this.loadSettings();
    this.createHUD();
    this.startMonitoring();
    this.setupSPARouteDetection();
    
    console.log(`[AITokenWatch] Successfully initialized for ${this.tokenEstimator.getPlatformName()}`);
  }

  createDebugHUD(platformInfo) {
    if (this.hud) return;

    this.hud = document.createElement('div');
    this.hud.id = 'ai-token-watch-debug';
    this.hud.className = 'ctw-hud ctw-ball';
    
    const isSupported = platformInfo?.isSupported || false;
    const platform = platformInfo?.platform || 'unknown';
    
    this.hud.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 80px;
      height: 80px;
      background: ${isSupported ? 'green' : 'red'};
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483647;
      font-size: 9px;
      cursor: pointer;
      text-align: center;
      line-height: 1.2;
    `;
    
    this.hud.innerHTML = `DEBUG<br>${platform.toUpperCase()}<br>${isSupported ? 'OK' : 'FAIL'}`;
    
    this.hud.addEventListener('click', () => {
      const debugInfo = this.platformDetector.getDebugInfo();
      console.group('[AITokenWatch] Debug Information');
      console.log('Platform Info:', platformInfo);
      console.log('Debug Info:', debugInfo);
      console.log('Current URL:', window.location.href);
      console.log('Hostname:', window.location.hostname);
      console.groupEnd();
      
      const alertMessage = `
Platform: ${platform}
Supported: ${isSupported}
URL: ${window.location.href}
Hostname: ${window.location.hostname}

Check console for detailed debug info.
      `.trim();
      
      alert(alertMessage);
    });
    
    document.body.appendChild(this.hud);
    console.log('[AITokenWatch] Debug HUD created and displayed');
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(this.settings);
      this.settings = { ...this.settings, ...result };
    } catch (error) {
      console.log('Using default settings');
    }
  }

  createHUD() {
    if (this.hud) return;

    this.hud = document.createElement('div');
    this.hud.id = 'ai-token-watch-hud';
    this.hud.className = 'ctw-hud ctw-ball';
    this.isExpanded = false;
    this.isDragging = false;
    
    this.createCircularHUD();
    this.loadHUDPosition();
    document.body.appendChild(this.hud);
    
    this.setupDragEvents();
    this.setupClickEvents();
    this.setupVisibilityChecks();
  }

  createCircularHUD() {
    this.hud.innerHTML = `
      <div class="ctw-ball-display">
        <span class="ctw-ball-tokens">0K</span>
      </div>
      <div class="ctw-expanded-panel" style="display: none;">
        <div class="ctw-panel-header">
          <span class="ctw-panel-title">Token Monitor</span>
          <button class="ctw-close-btn">×</button>
        </div>
        <div class="ctw-panel-body">
          <div class="ctw-token-breakdown">
            <div class="ctw-current-display">
              <span class="ctw-current">0</span> / <span class="ctw-max">8,000</span>
            </div>
            <div class="ctw-progress-bar">
              <div class="ctw-progress"></div>
            </div>
            <div class="ctw-remaining-info">
              剩餘: <span class="ctw-remaining">8,000</span> tokens
            </div>
          </div>
          <div class="ctw-actions">
            <button class="ctw-action-btn ctw-summary-btn">生成交接摘要</button>
          </div>
        </div>
      </div>
    `;
    
    const summaryBtn = this.hud.querySelector('.ctw-summary-btn');
    summaryBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.generateHandoverSummary();
    });
  }

  setupDragEvents() {
    let startX, startY, initialX, initialY;
    let clickTimeout;

    this.hud.addEventListener('mousedown', (e) => {
      if (e.target.closest('.ctw-expanded-panel')) return;
      
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = this.hud.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;
      
      this.isDragging = false;
      this.hud.style.cursor = 'grabbing';
      
      clickTimeout = setTimeout(() => {
        this.isDragging = true;
      }, 150);
    });

    document.addEventListener('mousemove', (e) => {
      if (!startX || !startY) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        clearTimeout(clickTimeout);
        this.isDragging = true;
        
        let newX = initialX + deltaX;
        let newY = initialY + deltaY;
        
        // Keep within viewport bounds
        const hudSize = 40;
        newX = Math.max(10, Math.min(window.innerWidth - hudSize - 10, newX));
        newY = Math.max(10, Math.min(window.innerHeight - hudSize - 10, newY));
        
        this.hud.style.left = `${newX}px`;
        this.hud.style.top = `${newY}px`;
        this.hud.style.right = 'auto';
        this.hud.style.bottom = 'auto';
      }
    });

    document.addEventListener('mouseup', () => {
      if (startX && startY) {
        clearTimeout(clickTimeout);
        this.hud.style.cursor = 'pointer';
        this.saveHUDPosition();
        
        startX = null;
        startY = null;
        initialX = null;
        initialY = null;
        
        setTimeout(() => {
          this.isDragging = false;
        }, 100);
      }
    });
  }

  setupClickEvents() {
    this.hud.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!this.isDragging) {
        this.toggleHUD();
      }
    });
    
    const closeBtn = this.hud.querySelector('.ctw-close-btn');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleHUD();
    });
  }

  toggleHUD() {
    this.isExpanded = !this.isExpanded;
    const expandedPanel = this.hud.querySelector('.ctw-expanded-panel');
    
    if (this.isExpanded) {
      this.hud.classList.add('ctw-expanded');
      expandedPanel.style.display = 'block';
    } else {
      this.hud.classList.remove('ctw-expanded');
      expandedPanel.style.display = 'none';
    }
  }

  loadHUDPosition() {
    try {
      const savedPosition = localStorage.getItem('ctwHudPosition');
      if (savedPosition) {
        const { x, y } = JSON.parse(savedPosition);
        const correctedPosition = this.validateHUDPosition(x, y);
        this.setHUDPosition(correctedPosition.x, correctedPosition.y);
      } else {
        // Ensure default position is safe
        const defaultPosition = this.validateHUDPosition(window.innerWidth - 60, 20);
        this.setHUDPosition(defaultPosition.x, defaultPosition.y);
      }
    } catch (error) {
      console.log('Using default HUD position');
      const safePosition = this.validateHUDPosition(window.innerWidth - 60, 20);
      this.setHUDPosition(safePosition.x, safePosition.y);
    }
  }

  validateHUDPosition(x, y) {
    const hudSize = 40;
    const margin = 10;
    
    // Get current viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Ensure position is within safe bounds
    const safeX = Math.max(margin, Math.min(viewportWidth - hudSize - margin, x));
    const safeY = Math.max(margin, Math.min(viewportHeight - hudSize - margin, y));
    
    // Debug logging for wide screens
    if (window.innerWidth / window.innerHeight > 1.7) {
      console.log(`[CTW Debug] Wide screen detected: ${viewportWidth}x${viewportHeight}, position: ${safeX}, ${safeY}`);
    }
    
    return { x: safeX, y: safeY };
  }

  setHUDPosition(x, y) {
    this.hud.style.left = `${x}px`;
    this.hud.style.top = `${y}px`;
    this.hud.style.right = 'auto';
    this.hud.style.bottom = 'auto';
  }

  ensureHUDVisibility() {
    if (!this.hud) return;
    
    const rect = this.hud.getBoundingClientRect();
    const isVisible = (
      rect.left >= 0 &&
      rect.top >= 0 &&
      rect.right <= window.innerWidth &&
      rect.bottom <= window.innerHeight
    );
    
    if (!isVisible) {
      console.log('[CTW Debug] HUD not visible, correcting position');
      const correctedPosition = this.validateHUDPosition(rect.left, rect.top);
      this.setHUDPosition(correctedPosition.x, correctedPosition.y);
      this.saveHUDPosition();
    }
  }

  saveHUDPosition() {
    const rect = this.hud.getBoundingClientRect();
    const validatedPosition = this.validateHUDPosition(rect.left, rect.top);
    localStorage.setItem('ctwHudPosition', JSON.stringify(validatedPosition));
  }

  isWideScreen() {
    return window.innerWidth / window.innerHeight > 1.7;
  }

  enableDebugMode() {
    this.debugMode = true;
    if (this.hud) {
      this.hud.classList.add('ctw-debug-mode');
    }
    console.log('[CTW Debug] Debug mode enabled');
    this.logHUDDiagnostics();
  }

  disableDebugMode() {
    this.debugMode = false;
    if (this.hud) {
      this.hud.classList.remove('ctw-debug-mode');
    }
    console.log('[CTW Debug] Debug mode disabled');
  }

  logHUDDiagnostics() {
    if (!this.hud) return;
    
    const rect = this.hud.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      aspectRatio: (window.innerWidth / window.innerHeight).toFixed(2)
    };
    
    console.log('[CTW Debug] HUD Diagnostics:', {
      position: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
      viewport: viewport,
      isWideScreen: this.isWideScreen(),
      isVisible: this.isHUDVisible(),
      zIndex: window.getComputedStyle(this.hud).zIndex,
      display: window.getComputedStyle(this.hud).display
    });
  }

  isHUDVisible() {
    if (!this.hud) return false;
    
    const rect = this.hud.getBoundingClientRect();
    return (
      rect.left >= 0 &&
      rect.top >= 0 &&
      rect.right <= window.innerWidth &&
      rect.bottom <= window.innerHeight &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  setupVisibilityChecks() {
    // Check visibility on window resize
    window.addEventListener('resize', () => {
      setTimeout(() => {
        this.ensureHUDVisibility();
        if (this.debugMode) {
          this.logHUDDiagnostics();
        }
      }, 100);
    });

    // Check visibility periodically (useful for dynamic page changes)
    setInterval(() => {
      this.ensureHUDVisibility();
    }, 5000);

    // Initial visibility check
    setTimeout(() => {
      this.ensureHUDVisibility();
      if (this.debugMode) {
        this.enableDebugMode();
        this.logHUDDiagnostics();
      }
    }, 1000);

    // Debug keyboard shortcut (Ctrl+Shift+D)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault();
        if (this.debugMode) {
          this.disableDebugMode();
        } else {
          this.enableDebugMode();
        }
      }
    });
  }

  updateHUD() {
    if (!this.hud || !this.settings.enabled) return;

    const percentage = (this.currentTokens / this.settings.maxTokens) * 100;
    const remaining = this.settings.maxTokens - this.currentTokens;
    
    // Update ball display (simplified format)
    const ballTokens = this.hud.querySelector('.ctw-ball-tokens');
    if (ballTokens) {
      const currentK = Math.round(this.currentTokens / 100) / 10;
      ballTokens.textContent = `${currentK}K`;
    }
    
    // Update expanded panel display
    const currentSpan = this.hud.querySelector('.ctw-current');
    const maxSpan = this.hud.querySelector('.ctw-max');
    const remainingSpan = this.hud.querySelector('.ctw-remaining');
    const progress = this.hud.querySelector('.ctw-progress');
    
    if (currentSpan) currentSpan.textContent = this.currentTokens.toLocaleString();
    if (maxSpan) maxSpan.textContent = this.settings.maxTokens.toLocaleString();
    if (remainingSpan) remainingSpan.textContent = remaining.toLocaleString();
    if (progress) progress.style.width = `${Math.min(percentage, 100)}%`;
    
    // Update visual state - reset classes
    this.hud.className = 'ctw-hud ctw-ball';
    
    if (this.isExpanded) {
      this.hud.classList.add('ctw-expanded');
    }
    
    // Color-coded warning states
    if (percentage >= 95) {
      this.hud.classList.add('ctw-critical');
    } else if (percentage >= this.settings.warningThreshold || remaining <= this.settings.minRemainingTokens) {
      this.hud.classList.add('ctw-warning');
      this.showWarningNotification();
    } else {
      this.hud.classList.add('ctw-normal');
    }
  }

  showWarningNotification() {
    if (this.lastWarningTime && Date.now() - this.lastWarningTime < 300000) {
      return;
    }
    
    this.lastWarningTime = Date.now();
    
    chrome.runtime.sendMessage({
      type: 'TOKEN_WARNING',
      tokens: this.currentTokens,
      maxTokens: this.settings.maxTokens,
      remaining: this.settings.maxTokens - this.currentTokens
    });
  }

  startMonitoring() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    this.updateTokenCount();
    
    this.updateTimer = setInterval(() => {
      this.updateTokenCount();
    }, this.settings.updateInterval);
  }

  updateTokenCount() {
    try {
      this.currentTokens = this.tokenEstimator.estimateFromDOM(this.settings.includeCode);
      this.updateHUD();
    } catch (error) {
      console.error('Token estimation error:', error);
    }
  }

  setupSPARouteDetection() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      aiTokenWatch.handleRouteChange();
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      aiTokenWatch.handleRouteChange();
    };
    
    window.addEventListener('popstate', () => {
      this.handleRouteChange();
    });
    
    const observer = new MutationObserver(() => {
      if (window.location.href !== this.lastUrl) {
        this.handleRouteChange();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  handleRouteChange() {
    const newUrl = window.location.href;
    
    if (newUrl !== this.lastUrl) {
      this.lastUrl = newUrl;
      
      setTimeout(() => {
        this.currentTokens = 0;
        this.updateHUD();
        this.startMonitoring();
      }, 1000);
    }
  }

  showCriticalWarningModal() {
    if (this.lastCriticalWarning && Date.now() - this.lastCriticalWarning < 600000) {
      return;
    }
    
    this.lastCriticalWarning = Date.now();
    
    const modal = this.createWarningModal();
    document.body.appendChild(modal);
    
    setTimeout(() => {
      modal.classList.add('ctw-modal-show');
    }, 100);
  }

  createWarningModal() {
    const modal = document.createElement('div');
    modal.className = 'ctw-warning-modal';
    modal.innerHTML = `
      <div class="ctw-modal-backdrop"></div>
      <div class="ctw-modal-content">
        <div class="ctw-modal-header">
          <h3>⚠️ Token 使用量警告</h3>
        </div>
        <div class="ctw-modal-body">
          <p>目前對話已使用 <strong>${this.currentTokens.toLocaleString()}</strong> tokens</p>
          <p>接近或超過設定上限 <strong>${this.settings.maxTokens.toLocaleString()}</strong> tokens</p>
          <p>是否需要生成對話交接摘要？</p>
        </div>
        <div class="ctw-modal-actions">
          <button class="ctw-btn ctw-btn-secondary" data-action="dismiss">稍後提醒</button>
          <button class="ctw-btn ctw-btn-primary" data-action="generate">生成摘要</button>
        </div>
      </div>
    `;
    
    modal.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      
      if (action === 'dismiss' || e.target.classList.contains('ctw-modal-backdrop')) {
        this.closeModal(modal);
      } else if (action === 'generate') {
        this.generateHandoverSummary();
        this.closeModal(modal);
      }
    });
    
    return modal;
  }

  closeModal(modal) {
    modal.classList.add('ctw-modal-hide');
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 300);
  }

  generateHandoverSummary() {
    const messages = this.extractConversationMessages();
    const summary = this.createSummary(messages);
    const seedPrompt = this.generateSeedPrompt(messages);
    
    this.downloadHandoverFiles(summary, seedPrompt);
  }

  extractConversationMessages() {
    const messages = [];
    const messageElements = document.querySelectorAll('[data-message-author-role]');
    
    for (const element of messageElements) {
      const role = element.getAttribute('data-message-author-role');
      const contentElement = element.querySelector('.markdown, .whitespace-pre-wrap, .prose');
      
      if (contentElement && role) {
        const content = contentElement.innerText || contentElement.textContent || '';
        if (content.trim()) {
          messages.push({
            role: role,
            content: content.trim(),
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    return messages;
  }

  createSummary(messages) {
    const now = new Date();
    const conversationUrl = window.location.href;
    const taskElements = this.extractTaskElements(messages);
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    let summary = `# 專案工作交接報告\n\n`;
    
    // Executive Summary
    summary += `## 執行摘要\n\n`;
    summary += `**交接時間**: ${now.toLocaleString('zh-TW')}\n`;
    summary += `**對話記錄**: [查看完整對話](${conversationUrl})\n`;
    summary += `**討論輪次**: ${messages.length} 條訊息 (${userMessages.length} 個需求, ${assistantMessages.length} 個回應)\n`;
    summary += `**Token 使用**: ${this.currentTokens.toLocaleString()} / ${this.settings.maxTokens.toLocaleString()}\n\n`;
    
    // Project context
    if (taskElements.objectives.length > 0) {
      summary += `**專案背景**: ${this.cleanContent(taskElements.objectives[0])}\n\n`;
    }
    
    // Key decisions made
    summary += `## 關鍵決策記錄\n\n`;
    if (taskElements.decisions.length > 0) {
      taskElements.decisions.forEach((decision, i) => {
        summary += `### 決策 ${i + 1}\n`;
        summary += `${this.cleanContent(decision)}\n\n`;
      });
    } else {
      summary += `目前尚無明確技術決策，仍在需求澄清階段。\n\n`;
    }
    
    // Current status
    summary += `## 當前狀態總結\n\n`;
    summary += `### 已完成項目\n`;
    
    // Extract completed items from assistant responses
    const completedItems = [];
    assistantMessages.forEach(msg => {
      const cleaned = this.cleanContent(msg.content);
      if (cleaned.includes('完成') || cleaned.includes('實現') || cleaned.includes('建立') || 
          cleaned.includes('創建') || cleaned.includes('生成')) {
        const sentences = cleaned.split(/[.。！!]/);
        sentences.forEach(sentence => {
          if ((sentence.includes('完成') || sentence.includes('實現') || 
               sentence.includes('建立') || sentence.includes('創建')) && 
              sentence.trim().length > 15) {
            completedItems.push(sentence.trim().substring(0, 100));
          }
        });
      }
    });
    
    if (completedItems.length > 0) {
      completedItems.slice(0, 3).forEach((item, i) => {
        summary += `- [x] ${item}\n`;
      });
    } else {
      summary += `- 需求收集和討論階段\n`;
    }
    summary += `\n`;
    
    summary += `### 進行中項目\n`;
    if (taskElements.objectives.length > 0) {
      taskElements.objectives.forEach((objective, i) => {
        summary += `- [ ] ${this.cleanContent(objective)}\n`;
      });
    } else {
      summary += `- 無明確進行中項目\n`;
    }
    summary += `\n`;
    
    // Next phase planning
    summary += `## 下階段工作計劃\n\n`;
    summary += `### 優先級排序\n`;
    if (taskElements.objectives.length > 0) {
      summary += `1. **高優先級**: ${this.cleanContent(taskElements.objectives[0]).substring(0, 100)}\n`;
      if (taskElements.objectives[1]) {
        summary += `2. **中優先級**: ${this.cleanContent(taskElements.objectives[1]).substring(0, 100)}\n`;
      }
    }
    
    if (taskElements.questions.length > 0) {
      summary += `3. **需確認**: ${this.cleanContent(taskElements.questions[0]).substring(0, 100)}\n`;
    }
    summary += `\n`;
    
    summary += `### 預期時程\n`;
    summary += `- **短期目標** (1-3天): 完成需求確認和技術方案設計\n`;
    summary += `- **中期目標** (1週內): 實現核心功能和基礎架構\n`;
    summary += `- **長期目標** (2週內): 完整功能交付和測試驗證\n\n`;
    
    // Technical stack
    summary += `## 技術要點\n\n`;
    
    // Extract specific technical terms
    const techStack = new Set();
    const specificTerms = {
      'Chrome Extension': ['chrome extension', 'manifest v3', 'content script', 'background script'],
      'JavaScript': ['javascript', 'js', 'async', 'promise', 'dom'],
      'Token Processing': ['token', '估算', 'tokenestimator', 'estimation'],
      'UI/UX': ['hud', 'popup', 'compact', 'responsive'],
      'Storage': ['chrome storage', 'localstorage', 'settings'],
      'AI Integration': ['chatgpt', 'openai', 'summary', 'handover']
    };
    
    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      Object.keys(specificTerms).forEach(category => {
        if (specificTerms[category].some(term => content.includes(term))) {
          techStack.add(category);
        }
      });
    });
    
    if (techStack.size > 0) {
      summary += `**技術棧**: ${Array.from(techStack).slice(0, 4).join(', ')}\n`;
    }
    
    summary += `**關鍵組件**: TokenEstimator, AITokenWatch, HUD System, PlatformDetector\n`;
    const platformName = this.tokenEstimator.getPlatformName();
    summary += `**相容目標**: ${platformName} SPA, Chrome MV3, 跨對話路由\n\n`;
    
    // Concise handover checklist
    summary += `## 交接確認\n\n`;
    summary += `- [ ] 技術決策已記錄\n`;
    summary += `- [ ] 待辦任務已明確\n`;
    summary += `- [ ] 技術限制已標註\n`;
    summary += `- [ ] 下階段優先級已確定\n`;
    summary += `- [ ] 相關文檔已整理\n\n`;
    
    summary += `---\n*AI Token Watch 自動生成 | 建議搭配 seed-prompt 使用*\n`;
    
    return summary;
  }

  generateSeedPrompt(messages) {
    const taskElements = this.extractTaskElements(messages);
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    let seedPrompt = `# 任務接續指南\n\n`;
    
    // Concise TL;DR (max 2-3 core points)
    seedPrompt += `## TL;DR\n\n`;
    const tldrPoints = [];
    
    if (taskElements.objectives.length > 0) {
      tldrPoints.push(`目標: ${this.cleanContent(taskElements.objectives[0]).substring(0, 60)}`);
    }
    if (taskElements.decisions.length > 0) {
      tldrPoints.push(`技術: ${this.cleanContent(taskElements.decisions[0]).substring(0, 60)}`);
    }
    tldrPoints.push(`狀態: ${messages.length} 輪討論`);
    
    tldrPoints.slice(0, 3).forEach(point => {
      seedPrompt += `- ${point}\n`;
    });
    seedPrompt += `\n`;
    
    // Technical decisions only
    seedPrompt += `## 技術決策\n\n`;
    if (taskElements.decisions.length > 0) {
      taskElements.decisions.forEach((decision, i) => {
        seedPrompt += `${i + 1}. ${this.cleanContent(decision)}\n`;
      });
    } else {
      seedPrompt += `無明確技術決策\n`;
    }
    seedPrompt += `\n`;
    
    // Action-oriented TODOs
    seedPrompt += `## 待辦清單\n\n`;
    if (taskElements.objectives.length > 0) {
      taskElements.objectives.forEach(objective => {
        const cleaned = this.cleanContent(objective);
        // Ensure verb-first format
        if (!this.startsWithActionVerb(cleaned)) {
          seedPrompt += `- [ ] 完成${cleaned}\n`;
        } else {
          seedPrompt += `- [ ] ${cleaned}\n`;
        }
      });
    } else {
      seedPrompt += `- [ ] 確認專案需求\n`;
    }
    seedPrompt += `\n`;
    
    // Critical questions only
    if (taskElements.questions.length > 0) {
      seedPrompt += `## 待釐清\n\n`;
      taskElements.questions.forEach((question, i) => {
        seedPrompt += `${i + 1}. ${this.cleanContent(question)}\n`;
      });
      seedPrompt += `\n`;
    }
    
    // Direct next action
    seedPrompt += `## 下步行動\n\n`;
    if (taskElements.objectives.length > 0) {
      seedPrompt += `**立即執行**: ${this.cleanContent(taskElements.objectives[0]).substring(0, 50)}\n`;
    }
    if (taskElements.questions.length > 0) {
      seedPrompt += `**需澄清**: ${this.cleanContent(taskElements.questions[0]).substring(0, 50)}\n`;
    }
    seedPrompt += `**持續**: 基於技術決策推進實作\n\n`;
    
    // Concise continuation prompt
    seedPrompt += `## 指令\n\n`;
    seedPrompt += `確認理解 → 澄清疑問 → 執行任務 → 驗證結果\n\n`;
    seedPrompt += `---\n*AI Token Watch | 任務導向*\n`;
    
    return seedPrompt;
  }
  
  startsWithActionVerb(text) {
    const actionVerbs = ['開發', '建立', '實作', '建構', '創建', '設計', '優化', '改進', '修正', '新增', '整合', '部署', '測試', '除錯', '完成', '執行'];
    return actionVerbs.some(verb => text.startsWith(verb));
  }
  
  // Content cleaning functions
  cleanContent(text) {
    if (!text) return '';
    
    let cleaned = text;
    
    // Remove sharing text and promotional content
    const sharePatterns = [
      /網友分享.*?與大家分享.*?[\s\S]*?(?=\n\n|\n[^\n]|$)/gi,
      /分享.*?開發.*?擴充.*?[\s\S]*?(?=\n\n|\n[^\n]|$)/gi,
      /今天.*?順利.*?感謝.*?[\s\S]*?(?=\n\n|\n[^\n]|$)/gi,
      /終於.*?完成.*?[\s\S]*?(?=希望|接下來|$)/gi
    ];
    
    sharePatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Remove verbose descriptions and compress to action items
    const verbosePatterns = [
      /\b(超棒|太棒了|超讚|太讚|非常棒|真棒|超好|太好了|很棒|很好|不錯|很不錯|順利|完美)\b/gi,
      /\b(哇|哇塞|wow|厉害|利害|強|超強|超猛|牛|牛逼|太強了|超級|非常)\b/gi,
      /\b(哈哈|呵呵|嘻嘻|呃|嗯嗯|喔|哦|恩|嗯|對吧|是吧|應該|可能|大概|估計)\b/gi,
      /\b(感謝|謝謝|thank you|thanks|thx|終於|真的|確實|果然)\s*[！!]*\s*/gi,
      /[!]{2,}/g, // Multiple exclamation marks
      /[?]{2,}/g, // Multiple question marks
      /\b(我想|我覺得|我認為|個人覺得|個人認為|基本上|總的來說|整體來說)\b/gi
    ];
    
    verbosePatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Remove meta-level discussion
    const metaPatterns = [
      /這個.*?(功能|專案|系統).*?很.*?/gi,
      /看起來.*?(不錯|很好|很棒)/gi,
      /應該.*?會.*?(很好|不錯|有用)/gi
    ];
    
    metaPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Compress verbose phrases to concise actions
    const compressionMap = {
      '需要建立一個': '建立',
      '想要實作': '實作',
      '希望可以': '需要',
      '能否幫助': '協助',
      '請協助我': '協助',
      '我需要': '需要',
      '可以幫我': '協助',
      '幫我完成': '完成',
      '協助完成': '完成'
    };
    
    Object.keys(compressionMap).forEach(verbose => {
      const concise = compressionMap[verbose];
      cleaned = cleaned.replace(new RegExp(verbose, 'gi'), concise);
    });
    
    // Clean up extra spaces and normalize
    cleaned = cleaned
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '')
      .replace(/\n\s*\n/g, '\n')
      .replace(/^[\s,，。.]*/, '') // Remove leading punctuation
      .replace(/[\s,，。.]*$/, ''); // Remove trailing punctuation
    
    return cleaned;
  }
  
  extractTaskElements(messages) {
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    // Extract verb-oriented objectives
    const objectives = [];
    const actionVerbs = ['開發', '建立', '實作', '建構', '創建', '設計', '優化', '改進', '修正', '新增', '整合', '部署', '測試', '除錯'];
    
    userMessages.forEach(msg => {
      const cleaned = this.cleanContent(msg.content);
      const sentences = cleaned.split(/[.。！!？?\n]/);
      
      sentences.forEach(sentence => {
        const trimmed = sentence.trim();
        if (trimmed.length > 10) {
          // Look for action verbs at start or after key phrases
          const actionMatch = actionVerbs.find(verb => 
            trimmed.startsWith(verb) || 
            trimmed.includes(`要${verb}`) || 
            trimmed.includes(`需要${verb}`) || 
            trimmed.includes(`請${verb}`) ||
            trimmed.includes(`協助${verb}`)
          );
          
          if (actionMatch) {
            // Convert to standardized action format
            let actionItem = trimmed;
            if (!trimmed.startsWith(actionMatch)) {
              // Extract the action part
              const actionIndex = trimmed.indexOf(actionMatch);
              if (actionIndex > -1) {
                actionItem = actionMatch + trimmed.substring(actionIndex + actionMatch.length);
              }
            }
            objectives.push(actionItem.substring(0, 80));
          }
        }
      });
    });
    
    // Extract technical decisions (filter general advice)
    const decisions = [];
    const technicalIndicators = ['使用', '選擇', '採用', '配置', '設定', '架構', '模式', '方案', '策略', 'API', '框架', '函式庫', '資料庫', '演算法'];
    
    assistantMessages.forEach(msg => {
      const cleaned = this.cleanContent(msg.content);
      const sentences = cleaned.split(/[.。！!]/);
      
      sentences.forEach(sentence => {
        const trimmed = sentence.trim();
        if (trimmed.length > 25) {
          const hasTechnicalContent = technicalIndicators.some(indicator => 
            trimmed.includes(indicator)
          );
          
          const hasDecisionLanguage = (
            trimmed.includes('建議') || trimmed.includes('推薦') || 
            trimmed.includes('應該') || trimmed.includes('最好') ||
            trimmed.includes('選擇') || trimmed.includes('使用')
          );
          
          // Filter out generic advice
          const isGenericAdvice = (
            trimmed.includes('注意') || trimmed.includes('確保') ||
            trimmed.includes('記得') || trimmed.includes('別忘了') ||
            trimmed.includes('要小心') || trimmed.includes('需要考慮')
          );
          
          if (hasTechnicalContent && hasDecisionLanguage && !isGenericAdvice) {
            decisions.push(trimmed.substring(0, 100));
          }
        }
      });
    });
    
    // Extract project-level questions (remove meta-discussion)
    const questions = [];
    const projectKeywords = ['架構', '實作', '功能', '設計', '技術', '方案', '整合', '部署', '測試', '效能'];
    
    userMessages.slice(-3).forEach(msg => {
      const cleaned = this.cleanContent(msg.content);
      const questionParts = cleaned.split(/[.。！!]/);
      
      questionParts.forEach(part => {
        const trimmed = part.trim();
        if (trimmed.length > 15 && 
            (trimmed.includes('?') || trimmed.includes('？') || 
             trimmed.includes('如何') || trimmed.includes('怎麼') ||
             trimmed.includes('什麼') || trimmed.includes('哪個'))) {
          
          // Check if it's project-related
          const isProjectRelated = projectKeywords.some(keyword => 
            trimmed.includes(keyword)
          );
          
          // Filter out meta-level discussions
          const isMetaDiscussion = (
            trimmed.includes('覺得') || trimmed.includes('想法') ||
            trimmed.includes('意見') || trimmed.includes('看法') ||
            trimmed.includes('評價') || trimmed.includes('感想')
          );
          
          if (isProjectRelated && !isMetaDiscussion) {
            questions.push(trimmed.substring(0, 70));
          }
        }
      });
    });
    
    return {
      objectives: [...new Set(objectives)].slice(0, 3), // Remove duplicates
      decisions: [...new Set(decisions)].slice(0, 3),
      questions: [...new Set(questions)].slice(0, 2)
    };
  }
  
  extractKeyTopics(userMessages) {
    const topics = [];
    userMessages.slice(0, 3).forEach(msg => {
      const cleaned = this.cleanContent(msg.content);
      const firstSentence = cleaned.split(/[.\n]/)[0].trim();
      if (firstSentence && firstSentence.length > 10) {
        topics.push(firstSentence.substring(0, 80) + (firstSentence.length > 80 ? '...' : ''));
      }
    });
    return topics.length > 0 ? topics : ['討論主題待確認'];
  }

  downloadHandoverFiles(summary, seedPrompt) {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
    
    this.downloadTextFile(`handover-summary-${timestamp}.md`, summary);
    this.downloadTextFile(`seed-prompt-${timestamp}.md`, seedPrompt);
    
    this.showMessage('交接檔案已生成並下載', 'success');
  }

  downloadTextFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  showMessage(text, type) {
    const message = document.createElement('div');
    message.className = `ctw-toast ctw-toast-${type}`;
    message.textContent = text;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
      message.classList.add('ctw-toast-show');
    }, 100);
    
    setTimeout(() => {
      message.classList.remove('ctw-toast-show');
      setTimeout(() => {
        if (message.parentNode) {
          message.parentNode.removeChild(message);
        }
      }, 300);
    }, 3000);
  }

  destroy() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    if (this.hud) {
      this.hud.remove();
      this.hud = null;
    }
    
    const modal = document.querySelector('.ctw-warning-modal');
    if (modal) {
      modal.remove();
    }
  }
}

let aiTokenWatch = null;

function initializeExtension() {
  if (aiTokenWatch) {
    aiTokenWatch.destroy();
  }
  
  // Initialize on all supported platforms
  aiTokenWatch = new AITokenWatch();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SETTINGS_UPDATED') {
    if (aiTokenWatch) {
      aiTokenWatch.settings = { ...aiTokenWatch.settings, ...message.settings };
      aiTokenWatch.updateHUD();
    }
  }
});

window.addEventListener('beforeunload', () => {
  if (aiTokenWatch) {
    aiTokenWatch.destroy();
  }
});