class PopupController {
  constructor() {
    this.defaultSettings = {
      enabled: true,
      includeCode: true,
      warningThreshold: 80,
      minRemainingTokens: 1000,
      maxTokens: 8000,
      updateInterval: 2000
    };
    
    this.elements = {};
    this.init();
  }

  init() {
    this.initializeElements();
    this.loadSettings();
    this.bindEvents();
  }

  initializeElements() {
    this.elements = {
      enabled: document.getElementById('enabled'),
      includeCode: document.getElementById('includeCode'),
      warningThreshold: document.getElementById('warningThreshold'),
      minRemainingTokens: document.getElementById('minRemainingTokens'),
      maxTokens: document.getElementById('maxTokens'),
      updateInterval: document.getElementById('updateInterval'),
      saveBtn: document.getElementById('saveBtn'),
      resetBtn: document.getElementById('resetBtn'),
      statusMessage: document.getElementById('statusMessage')
    };
  }

  async loadSettings() {
    try {
      const settings = await chrome.storage.sync.get(this.defaultSettings);
      this.populateForm(settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.populateForm(this.defaultSettings);
    }
  }

  populateForm(settings) {
    this.elements.enabled.checked = settings.enabled;
    this.elements.includeCode.checked = settings.includeCode;
    this.elements.warningThreshold.value = settings.warningThreshold;
    this.elements.minRemainingTokens.value = settings.minRemainingTokens;
    this.elements.maxTokens.value = settings.maxTokens;
    this.elements.updateInterval.value = settings.updateInterval;
  }

  bindEvents() {
    this.elements.saveBtn.addEventListener('click', () => this.saveSettings());
    this.elements.resetBtn.addEventListener('click', () => this.resetSettings());
    
    Object.values(this.elements).forEach(element => {
      if (element.type === 'number' || element.type === 'checkbox') {
        element.addEventListener('change', () => this.validateForm());
      }
    });
  }

  validateForm() {
    const warningThreshold = parseInt(this.elements.warningThreshold.value);
    const minRemaining = parseInt(this.elements.minRemainingTokens.value);
    const maxTokens = parseInt(this.elements.maxTokens.value);
    
    if (minRemaining >= maxTokens) {
      this.showMessage('Minimum remaining tokens must be less than token limit', 'error');
      return false;
    }
    
    if (warningThreshold >= 100) {
      this.showMessage('Warning threshold must be less than 100%', 'error');
      return false;
    }
    
    return true;
  }

  async saveSettings() {
    if (!this.validateForm()) {
      return;
    }

    const settings = {
      enabled: this.elements.enabled.checked,
      includeCode: this.elements.includeCode.checked,
      warningThreshold: parseInt(this.elements.warningThreshold.value),
      minRemainingTokens: parseInt(this.elements.minRemainingTokens.value),
      maxTokens: parseInt(this.elements.maxTokens.value),
      updateInterval: parseInt(this.elements.updateInterval.value)
    };

    try {
      await chrome.storage.sync.set(settings);
      
      chrome.tabs.query({ url: ['https://chat.openai.com/*', 'https://chatgpt.com/*'] }, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            type: 'SETTINGS_UPDATED',
            settings: settings
          });
        });
      });

      this.showMessage('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showMessage('Failed to save settings', 'error');
    }
  }

  resetSettings() {
    this.populateForm(this.defaultSettings);
    this.showMessage('Settings reset to defaults', 'success');
  }

  showMessage(text, type) {
    this.elements.statusMessage.textContent = text;
    this.elements.statusMessage.className = `status-message ${type}`;
    this.elements.statusMessage.style.display = 'block';
    
    setTimeout(() => {
      this.elements.statusMessage.style.display = 'none';
    }, 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});


# 123