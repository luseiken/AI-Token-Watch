# AI Token Watch

A Chrome Extension that monitors AI conversation token usage across multiple platforms (ChatGPT, Claude, Gemini, Grok) with real-time display and intelligent warnings.

## 功能特色 (Features)

### 🎯 多平台支援 (Multi-Platform Support)
- **ChatGPT** - chat.openai.com, chatgpt.com
- **Claude** - claude.ai  
- **Gemini** - gemini.google.com, bard.google.com
- **Grok** - x.com/i/grok, twitter.com/i/grok

### 🚀 核心功能 (Core Features)
- **即時 Token 監控** - 可拖曳圓球 HUD 顯示當前對話的 token 使用量
- **智能平台檢測** - 自動識別並適配不同 AI 平台
- **動態 Token 限制** - 根據平台自動調整 token 上限 (ChatGPT: 8K, Claude: 200K, Gemini: 30K, Grok: 25K)
- **三色警示系統** - 🟢 正常 → 🟠 警告 → 🔴 危險，脈衝動畫提醒
- **專業摘要生成** - 任務導向摘要和工作交接報告
- **SPA 路由相容** - 完美支援所有平台的單頁面應用程式路由切換
- **寬螢幕適配** - 支援 16:9, 21:9 等各種螢幕比例
- **位置記憶** - HUD 拖曳位置永久保存

## 安裝方式 (Installation)

1. 下載或複製此專案到本機
2. 開啟 Chrome 瀏覽器
3. 進入 `chrome://extensions/`
4. 開啟「開發人員模式」(Developer mode)
5. 點擊「載入未封裝項目」(Load unpacked)
6. 選擇 `chatgpt-token-watch` 資料夾

## 使用說明 (Usage)

### 基本使用

1. 安裝完成後會在支援的 AI 平台右側顯示圓球 HUD
2. 圓球顯示 token 數字 (如 "1.2K")，顏色表示警告等級
3. **拖曳圓球** - 移動到任意位置，自動記憶偏好位置
4. **點擊圓球** - 展開詳細面板查看統計和操作選項

### 設定調整

點擊擴充功能圖示開啟設定頁面：

- **Enable Token Monitor**: 啟用/停用監控功能
- **計入程式碼區塊**: 是否將程式碼計入 token 估算
- **Token Limit**: 會根據當前平台自動設定上限
- **Warning Threshold**: 警示門檻百分比 (預設 80%)
- **Min Remaining Tokens**: 最小剩餘 token 數 (預設 1000)
- **Update Interval**: 更新頻率毫秒數 (預設 2000ms)

### HUD 圓球操作

- **點擊圓球**: 展開/收起詳細面板
- **拖曳圓球**: 移動位置，支援邊界限制和位置記憶
- **顏色狀態**: 
  - 🟢 綠色: 正常使用 (< 80%)
  - 🟠 橙色: 接近警示門檻 (80-95%)，2秒脈衝
  - 🔴 紅色: 接近或超過上限 (> 95%)，1.5秒脈衝

### 摘要生成功能

展開 HUD 面板後可生成專業摘要：
- **任務接續指南** - TL;DR + 待辦事項 + 下一步行動
- **專案工作交接報告** - 執行摘要 + 技術決策 + 交接檢查清單

## 技術架構 (Technical Architecture)

### 檔案結構

```
ai-token-watch/
├── manifest.json           # Manifest V3 設定檔 (多平台權限)
├── platformDetector.js     # 🆕 平台檢測和適配系統
├── tokenEstimator.js       # Token 估算模組 (支援多平台)
├── content.js              # 內容腳本 (AITokenWatch 主要邏輯)
├── background.js           # 背景腳本 (通知處理)
├── popup.html/css/js       # 設定介面
├── styles.css              # HUD 樣式 (響應式設計)
└── icons/                  # 擴充功能圖示
```

### 核心架構

1. **PlatformDetector**: 
   - 自動偵測當前 AI 平台 (URL + DOM 特徵雙重檢測)
   - 提供平台特定的選擇器和配置
   - 支援調試模式和問題診斷

2. **TokenEstimator**: 
   - 多平台適配的 token 估算引擎
   - 混合演算法: 字數 × 1.3 + 字元數 × 0.25 + 1.15 緩衝係數
   - 智能程式碼區塊過濾

3. **AITokenWatch**: 
   - 統一的 HUD 控制器，支援所有平台
   - 拖曳系統、位置記憶、響應式適配
   - 專業摘要生成和內容清理

### 平台特定配置

| 平台 | Token 限制 | 主選擇器 | 內容選擇器 |
|------|----------|----------|-----------|
| ChatGPT | 8,000 | `[data-message-author-role]` | `.markdown, .prose` |
| Claude | 200,000 | `[data-testid*="message"]` | `.font-claude-message` |
| Gemini | 30,000 | `[data-testid*="message"]` | `.markdown, .formatted-text` |
| Grok | 25,000 | `[data-testid*="grok"]` | `[data-testid="tweetText"]` |

## 支援的平台 (Supported Platforms)

### ✅ 完全支援
- **ChatGPT**: `chat.openai.com`, `chatgpt.com` ✅
- **Gemini**: `gemini.google.com`, `bard.google.com` ✅
- **Grok**: `x.com/i/grok`, `twitter.com/i/grok` ✅

### ⚠️ 部分支援
- **Claude**: `claude.ai` ⚠️ (DOM 結構頻繁變動，角色檢測不穩定)

### 🔄 自動適配功能
- 平台自動檢測和配置載入
- 動態 token 限制調整
- 平台特定的 DOM 選擇器
- 不支援平台的優雅降級

## 開發說明 (Development)

### 本機開發

1. 修改程式碼後重新載入擴充功能
2. 開啟 DevTools Console 檢視除錯訊息
3. 測試各平台的對話情境
4. 使用調試模式 (Ctrl+Shift+D) 診斷問題

### 新增平台支援

在 `platformDetector.js` 的 `platformConfigs` 新增平台配置：

```javascript
[PLATFORM_NAME]: {
  domains: ['platform.com'],
  selectors: {
    primary: '[data-message]',
    fallback: ['.message'],
    content: '.content',
    userRole: 'user',
    assistantRole: 'assistant'
  },
  tokenLimit: 10000,
  name: 'Platform Name'
}
```

## 故障排除 (Troubleshooting)

### 常見問題

1. **HUD 未顯示**: 
   - 檢查是否在支援的 AI 平台
   - 開啟 Console 查看 `[AITokenWatch]` 日誌

2. **HUD 在寬螢幕不可見**:
   - 系統會自動檢測和校正位置
   - 寬螢幕會自動啟用調試模式

3. **Token 計數為 0**:
   - 檢查平台檢測是否成功
   - 確認對話內容已載入

4. **Claude.ai 角色檢測失敗**:
   - Claude.ai DOM 結構經常變動，導致無法正確識別 user/assistant 角色
   - 擴展會顯示檢測到消息但角色為 `undefined`
   - 建議使用其他平台或等待 Claude.ai DOM 結構穩定

### 調試功能

- **自動調試**: 寬螢幕 (aspect ratio > 1.7) 自動啟用
- **手動調試**: 按 `Ctrl+Shift+D` 切換調試模式
- **診斷資訊**: Console 輸出完整的位置、可見性、平台檢測狀態

## 版本記錄 (Version History)

### v2.0.0 🎉 多平台通用版
- ✨ 新增支援 Claude、Gemini、Grok 平台
- ✨ 全新 PlatformDetector 智能平台檢測系統
- ✨ 動態 token 限制根據平台自動調整
- 🔄 重構 TokenEstimator 支援多平台 DOM 結構
- 🔄 更名為 AI Token Watch
- 🛠️ 優化擴充功能權限配置

### v1.5.0 寬螢幕相容性修復
- 🐛 修復 16:9 寬螢幕 HUD 不可見問題
- ✨ 新增專業調試系統和自動位置校正
- ✨ 響應式適配支援 21:9 超寬螢幕

### v1.4.0 圓球拖曳設計
- ✨ 圓球可拖曳 HUD 重大設計改版
- ✨ 位置記憶和智能展開面板
- ✨ 三色警示系統和動畫效果

### v1.0.0-1.3.0 基礎版本
- 基礎 ChatGPT token 監控功能
- 專業摘要生成系統
- SPA 路由支援和設定介面

## 授權條款 (License)

MIT License

## 貢獻指南 (Contributing)

歡迎提交 Issue 和 Pull Request！

### 新增平台支援流程
1. Fork 專案並建立分支
2. 在 `platformDetector.js` 新增平台配置
3. 更新 `manifest.json` 權限
4. 測試平台相容性
5. 提交 Pull Request

### 開發原則
- 遵循現有程式碼風格和架構
- 確保向後相容性
- 提供詳細的測試和文件

## 注意事項 (Notes)

- Token 估算為近似值，各平台實際計算方式可能不同
- 擴充功能不會收集或傳送任何使用者資料
- 所有設定和位置資料僅儲存在本機瀏覽器中
- 支援的平台清單會持續更新擴展

---

**AI Token Watch v2.0.0** - 你的全能 AI 對話管理夥伴 🚀
 
---

## 2025-09-09 更新（暫停 Claude + 修復 Gemini/Grok 計數）

### ✅ 今天完成的工作

#### 1. 暫停 Claude 監控（保留未來擴充）
- `platformDetector.js`: 對 Claude 設定 `enabled: false`
- `content.js`: 若平台 `enabled === false`，不建立 HUD、不顯示 debug，乾淨早退

#### 2. Gemini/Grok 計數修復與強化
- 放寬角色限制：`role === unknown` 但內容充足時，推論為 `assistant` 以納入計數（避免 0）
- 平台提示（heuristics）：
  - Gemini：`response-container` → 視為 assistant
  - Grok：`.not-prose` → 視為 assistant；缺特徵時使用交替（user/assistant）降級
- 去重（de-dup）：同一內容只計一次（解決 Gemini 多容器重複）
- 非文字節點過濾：忽略 `svg/script/style/img/button` 等無文本元素
- Grok 選擇器優化：優先 `.not-prose`，降低掃描雜訊

#### 3. 初始化與路由穩定性
- `TokenEstimator` 支援 lazy init；`content.js` 在初始化與 SPA 路由變更時重新初始化估算平台

### 📌 實際影響
- Grok：總 tokens 可能比過去更低（因去重與雜訊過濾），更接近真實值
- Gemini：計數恢復正常；因 DOM 結構，角色顯示多偏向 assistant（不影響總量）
- ChatGPT：行為不變
- Claude：預設停用，不顯示 HUD

### ⚠️ 已知限制
- Claude：DOM 變動頻繁，角色檢測不穩定 → 暫列 Experimental/Paused
- 設定即時套用：目前只對 ChatGPT 即時廣播；Gemini/Grok 調整「Include code」後需重整頁面
- 程式碼計數：預設計入；關閉後以標記/樣式過濾，但若平台用純樣式代碼區，可能仍有殘留

### 🛠 技術細節
- platformDetector：
  - Claude `enabled: false`
  - Grok primary/content 加入 `.not-prose`
- tokenEstimator：
  - lazy init + 路由 re-init
  - 內容充分但 `role=unknown` → 推論為 `assistant` 計數
  - Gemini: `response-container` → assistant
  - Grok: `.not-prose` → assistant；交替降級
  - 去重：以內容正規化雜湊判斷
  - 預過濾：排除非文本節點、極短內容

### 📋 下一步計劃
1. Grok：視需求放寬「極短訊息」過濾（1–4 字）
2. 設定傳播：在 popup 廣播設定到 Gemini/Grok，免重整
3. 角色精準度：強化 Gemini/Grok 的 user 偵測與去重策略
