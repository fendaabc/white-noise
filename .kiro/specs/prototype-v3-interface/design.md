# 设计文档

## 概述

本设计文档概述了将白噪音应用从当前基于网格的垂直布局转换为具有水平滚动声音选择的单屏沉浸式体验的实现方法。设计利用现有的毛玻璃设计系统，同时引入新的布局模式和交互模型。

核心设计理念围绕**空间效率**和**沉浸式焦点**，将所有功能整合到单个视口中，同时保持应用程序精致的视觉美学和流畅的交互模式。

## 架构

### 布局架构

新布局遵循**垂直堆叠层次结构**，具有优化的间距：

```
┌─────────────────────────────────────────────────────────┐
│                    应用标题                              │
│                                                         │
│                 ┌─────────────┐                         │
│                 │   播放按钮   │                         │
│                 └─────────────┘                         │
│                                                         │
│  ◄ [声音1*] [声音2] [声音3] [声音4] [声音5] ►            │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────────────────┐   │
│  │   音量控制       │  │   定时器控制                 │   │
│  │ ○────────── 70% │  │ [15分*] [30分] [60分]       │   │
│  └─────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 组件层次结构

1. **主容器** - 具有优化间距的Flexbox列布局
2. **标题部分** - 居中的应用标题，减少底部边距
3. **播放控制** - 中央播放/暂停按钮，减少间距
4. **声音选择** - 带边缘指示器的水平滚动容器
5. **控制面板** - 统一的底部部分，并排控制

### 响应式断点

- **桌面端 (≥1024px)**: 完整的并排布局，最佳间距
- **平板端 (768px-1023px)**: 压缩间距，保持并排控制
- **移动端 (≤767px)**: 堆叠控制，优化触摸目标

## Components and Interfaces

### 1. Horizontal Sound Selector Component

#### Structure
```html
<div class="sound-selector-horizontal">
  <div class="scroll-indicator scroll-indicator-left"></div>
  <div class="sound-list-container">
    <div class="sound-list">
      <button class="sound-btn" data-sound="rain">...</button>
      <!-- Additional sound buttons -->
    </div>
  </div>
  <div class="scroll-indicator scroll-indicator-right"></div>
</div>
```

#### Key Features
- **Scrollbar Hiding**: Uses CSS `scrollbar-width: none` and `::-webkit-scrollbar { display: none }`
- **Edge Indicators**: Semi-transparent gradient overlays that fade when scrolled to edges
- **Smooth Scrolling**: CSS `scroll-behavior: smooth` with JavaScript enhancements
- **Touch Support**: Native horizontal scrolling with momentum on mobile devices

#### CSS Implementation Strategy
```css
.sound-selector-horizontal {
  position: relative;
  width: 100%;
  max-width: 800px;
}

.sound-list-container {
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  scroll-behavior: smooth;
}

.sound-list-container::-webkit-scrollbar {
  display: none;
}

.sound-list {
  display: flex;
  gap: var(--space-lg);
  padding: var(--space-md) var(--space-lg);
}

.scroll-indicator {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 40px;
  pointer-events: none;
  z-index: 10;
  transition: opacity var(--duration-normal) var(--ease-natural);
}

.scroll-indicator-left {
  left: 0;
  background: linear-gradient(to right, 
    rgba(26, 29, 41, 0.8) 0%, 
    transparent 100%);
}

.scroll-indicator-right {
  right: 0;
  background: linear-gradient(to left, 
    rgba(26, 29, 41, 0.8) 0%, 
    transparent 100%);
}
```

### 2. Enhanced State Management System

#### Visual State Classes
- `.sound-btn.active` - Selected sound with enhanced glow and border
- `.sound-btn.playing` - Currently playing with breathing animation
- `.timer-btn.active` - Selected timer option with distinct styling
- `.play-button.playing` - Play button in active state

#### State Transition System
```css
.sound-btn.active {
  background: var(--glass-heavy);
  border: 2px solid var(--glass-border-heavy);
  box-shadow: 
    var(--shadow-elevated),
    0 0 20px rgba(255, 255, 255, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.sound-btn.active::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.1) 0%, 
    transparent 50%, 
    rgba(255, 255, 255, 0.05) 100%);
  z-index: -1;
}
```

### 3. Unified Control Panel Component

#### Layout Strategy
```css
.control-panel {
  display: flex;
  gap: var(--space-4xl);
  align-items: flex-start;
  justify-content: center;
  width: 100%;
  max-width: 700px;
  margin-top: var(--space-xl);
}

.volume-control,
.timer-control {
  flex: 1;
  min-width: 280px;
}

@media (max-width: 767px) {
  .control-panel {
    flex-direction: column;
    gap: var(--space-2xl);
    align-items: center;
  }
  
  .volume-control,
  .timer-control {
    width: 100%;
    max-width: 400px;
  }
}
```

#### Alignment System
Both controls use consistent top alignment and shared visual styling:
```css
.control-panel > * {
  align-self: flex-start;
}

.control-panel label {
  display: block;
  margin-bottom: var(--space-md);
  font-weight: var(--font-medium);
  color: var(--text-primary);
  text-align: center;
}
```

### 4. Scroll Interaction Manager

#### JavaScript Interface
```javascript
class HorizontalScrollManager {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    this.scrollList = this.container.querySelector('.sound-list-container');
    this.leftIndicator = this.container.querySelector('.scroll-indicator-left');
    this.rightIndicator = this.container.querySelector('.scroll-indicator-right');
    
    this.init();
  }
  
  init() {
    this.bindEvents();
    this.updateIndicators();
  }
  
  bindEvents() {
    // Mouse wheel horizontal scrolling
    this.scrollList.addEventListener('wheel', this.handleWheel.bind(this));
    
    // Scroll position updates
    this.scrollList.addEventListener('scroll', this.updateIndicators.bind(this));
    
    // Resize handling
    window.addEventListener('resize', this.updateIndicators.bind(this));
  }
  
  handleWheel(event) {
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    
    event.preventDefault();
    this.scrollList.scrollLeft += event.deltaY;
  }
  
  updateIndicators() {
    const { scrollLeft, scrollWidth, clientWidth } = this.scrollList;
    
    // Left indicator visibility
    this.leftIndicator.style.opacity = scrollLeft > 10 ? '1' : '0';
    
    // Right indicator visibility
    const maxScroll = scrollWidth - clientWidth;
    this.rightIndicator.style.opacity = scrollLeft < maxScroll - 10 ? '1' : '0';
  }
}
```

## Data Models

### Application State Model
```javascript
const appState = {
  // Layout state
  isHorizontalLayout: true,
  scrollPosition: 0,
  
  // Existing state (unchanged)
  isPlaying: false,
  playingSounds: new Set(),
  volume: 70,
  timerActive: false,
  timerDuration: 0,
  
  // New UI state
  activeStates: {
    sounds: new Set(),
    timer: null
  }
};
```

### Sound Configuration Model (Enhanced)
```javascript
const soundConfig = {
  rain: {
    path: "audio/rain.mp3",
    name: "雨声",
    icon: "🌧️",
    // New properties for horizontal layout
    displayOrder: 1,
    category: "nature",
    theme: "rain"
  },
  // ... other sounds with enhanced metadata
};
```

## Error Handling

### Scroll Interaction Errors
- **Scroll Position Recovery**: Automatic restoration of scroll position on layout changes
- **Touch Event Conflicts**: Proper event delegation to prevent interference with native scrolling
- **Performance Degradation**: Throttled scroll event handlers to maintain 60fps

### Layout Adaptation Errors
- **Viewport Size Changes**: Responsive breakpoint handling with smooth transitions
- **Content Overflow**: Graceful handling of content that exceeds container bounds
- **State Synchronization**: Consistent state management across layout changes

### Accessibility Fallbacks
- **Reduced Motion**: Alternative animations for users with motion sensitivity
- **High Contrast**: Enhanced visual states for high contrast mode
- **Keyboard Navigation**: Full keyboard accessibility for horizontal scrolling

## Testing Strategy

### Visual Regression Testing
1. **Layout Consistency**: Screenshots at different viewport sizes
2. **State Transitions**: Visual validation of active states and animations
3. **Scroll Indicators**: Proper showing/hiding of edge gradients
4. **Theme Integration**: Correct application of sound-specific themes

### Interaction Testing
1. **Horizontal Scrolling**: Mouse wheel, touch gestures, keyboard navigation
2. **State Management**: Multiple sound selection, timer activation
3. **Responsive Behavior**: Layout adaptation across breakpoints
4. **Performance**: Smooth scrolling and animation performance

### Accessibility Testing
1. **Screen Reader**: Proper announcement of state changes
2. **Keyboard Navigation**: Tab order and focus management
3. **Touch Targets**: Minimum 44px touch target sizes on mobile
4. **Color Contrast**: WCAG AA compliance for all text and interactive elements

### Cross-Browser Testing
1. **Scrollbar Hiding**: Consistent behavior across browsers
2. **Backdrop Filter**: Fallbacks for unsupported browsers
3. **CSS Grid/Flexbox**: Layout consistency across browser versions
4. **Touch Events**: Mobile browser compatibility

## Implementation Phases

### Phase 1: Layout Restructuring
- Convert sound selector from grid to horizontal flex layout
- Implement scroll container with hidden scrollbars
- Add edge gradient indicators
- Update main container spacing for single-screen fit

### Phase 2: Enhanced State Management
- Implement enhanced active state styling
- Add smooth state transitions
- Update JavaScript state management logic
- Integrate with existing audio management system

### Phase 3: Scroll Interaction System
- Implement horizontal scroll manager
- Add mouse wheel support for horizontal scrolling
- Implement edge indicator show/hide logic
- Add smooth scrolling behaviors

### Phase 4: Responsive Optimization
- Implement responsive breakpoints for control panel
- Optimize touch targets for mobile devices
- Add mobile-specific scroll behaviors
- Test and refine across device types

### Phase 5: Polish and Performance
- Add entrance animations for new layout
- Optimize scroll performance with throttling
- Implement accessibility enhancements
- Conduct comprehensive testing and refinement