# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Extension Development Workflow

### Loading and Testing Changes
1. **Reload extension**: Go to `chrome://extensions/`, find AI Token Watch, click reload button
2. **Test on supported platforms**: 
   - **ChatGPT**: `https://chat.openai.com` or `https://chatgpt.com` ✅
   - **Gemini**: `https://gemini.google.com` ✅  
   - **Grok**: `https://x.com/i/grok` ✅
   - **Claude**: `https://claude.ai` ⚠️ (unstable DOM structure)
3. **Debug console**: Open DevTools Console to see `[PlatformDetector]` and `[TokenEstimator]` logs
4. **Settings testing**: Click extension icon to test popup settings interface

### Key Development Commands
- No build system required - direct file editing
- Use browser DevTools for debugging content scripts
- Test in ChatGPT conversations of varying lengths and complexity
- Verify SPA route changes (switching between conversations)

## Architecture Overview

### Core Components Interaction

**PlatformDetector** (platformDetector.js) provides:
- Automatic AI platform detection (URL + DOM feature detection)
- Platform-specific selector configurations for token extraction
- Support for ChatGPT, Claude, Gemini, and Grok platforms
- Graceful fallback for unsupported platforms

**AITokenWatch** (content.js) is the main orchestrator that:
- Manages compact HUD display (capsule → expandable) across all platforms
- Coordinates with TokenEstimator for real-time calculation
- Handles SPA route detection via history API interception
- Triggers manual summary generation on user action

**TokenEstimator** (tokenEstimator.js) provides:
- Multi-platform token estimation with platform-specific role detection
- Hybrid estimation algorithm (word count + character count with 1.15x buffer)
- Code block filtering when `includeCode` setting is disabled
- DOM content extraction with fallback strategies for different platforms

**Summary Generation System** creates professional handover documents:
- Task-oriented Seed Prompts with TL;DR, conclusions, TODOs
- Professional handover reports with executive summary, decisions, timeline
- Content cleaning to remove chat expressions ("超棒", "太讚", etc.)

### Critical Architecture Patterns

**SPA Route Detection**: Intercepts `history.pushState`/`replaceState` + MutationObserver for ChatGPT's client-side navigation. Essential for resetting token counts when switching conversations.

**HUD State Management**: Two-state design (compact capsule ↔ expanded view) controlled by `isExpanded` flag and CSS classes (`ctw-compact`, `ctw-expanded`).

**Settings Persistence**: Chrome Storage API with default fallbacks, real-time sync to active tabs via message passing.

**Token Calculation Flow**:
1. Platform detection and configuration loading
2. DOM scanning with platform-specific selectors
3. Message role determination (user/assistant) with multiple detection strategies
4. Content extraction and optional code filtering
5. Hybrid estimation algorithm with platform-specific buffer factors
6. Visual state updates (normal/warning/critical with color-coded borders)

## Extension-Specific Development Notes

### Content Script Injection Order
- `platformDetector.js` loads first (platform detection)
- `tokenEstimator.js` loads second (estimation engine)
- `content.js` loads third (main UI logic)
- All run at `document_start` for early initialization

### Platform-Specific Compatibility

#### ChatGPT (`chat.openai.com`, `chatgpt.com`) ✅
- Primary: `[data-message-author-role]` with direct role attribution
- Content: `.markdown, .whitespace-pre-wrap, .prose`
- Stable DOM structure, reliable detection

#### Claude (`claude.ai`) ⚠️
- **Known Issues**: DOM structure changes frequently, causing role detection failures
- Primary attempts: `[data-is-streaming]`, `[data-testid="conversation-turn"]`
- Font class detection: `font-user-message`, `font-claude-response`
- **Current Status**: Can detect messages but roles often return `undefined`
- **Recommendation**: Use alternative platforms until Claude.ai DOM stabilizes

#### Gemini (`gemini.google.com`) ✅
- Primary: `[data-testid*="message"]`, `.conversation-turn`
- Content: `.markdown, .formatted-text, .model-response-text`
- Reliable platform support

#### Grok (`x.com/i/grok`) ✅
- Primary: `[data-testid*="grok"]`, `[data-testid*="cellInnerDiv"]`
- Content: `[data-testid="tweetText"]`, `.css-901oao`
- Twitter-based DOM patterns, stable detection

### Manual Trigger Design
Unlike typical extensions with automatic alerts, this uses user-controlled summary generation:
- Visual warnings (red borders, animations) show state
- No intrusive popups until user clicks HUD → expand → "生成交接摘要"
- Preserves ChatGPT workflow while providing power-user functionality

### Summary Quality System
Professional document generation with intelligent content extraction:
- **Task Elements**: Objectives (需要/要/請), Decisions (建議/應該), Questions (如何/為什麼)
- **Content Cleaning**: Regex-based chat language removal with whitespace normalization  
- **Structured Output**: Executive summaries, priority rankings, technical considerations

## Development Considerations

### Multi-Platform Token Estimation
- Different platforms have different DOM structures requiring separate detection strategies
- Claude.ai presents ongoing challenges due to frequent UI updates
- Buffer factors may need platform-specific tuning (current: 1.15x universal)

### Performance Optimization
- DOM scanning runs every 2 seconds (configurable) across all platforms
- Platform detection adds minimal overhead but improves accuracy
- Memory usage scales with conversation length - monitor for leaks
- Consider debouncing for platforms with rapid DOM mutations

### Extensibility Points
- `platformDetector.js` can easily accommodate new AI platforms
- Role detection strategies can be refined per platform
- `extractTaskElements()` can be enhanced with more sophisticated NLP
- Summary templates could become platform-aware and user-customizable

### Platform Maintenance
- **Claude.ai**: Requires regular selector updates due to UI changes
- **Other platforms**: Generally stable, monitor for major redesigns
- **New platforms**: Add platform configs to `platformDetector.js`

### Extension Store Readiness
- Icons currently use text placeholders - replace with proper PNG files
- Version number management in manifest.json
- Privacy policy compliance (local storage only, no data transmission)