/**
 * 白噪音网站主控制逻辑
 * 协调AudioManager、TimerManager和用户界面之间的交互
 */

// 全局变量
let audioManager;
let timerManager;
let skeletonManager;
let loadingOrchestrator;
let errorRecoveryManager;
let appState;

// 将关键函数暴露到全局作用域，供LoadingOrchestrator调用
window.initDOMElements = initDOMElements;
window.initManagers = initManagers;
window.bindEventListeners = bindEventListeners;
window.initializeRippleEffects = initializeRippleEffects;
window.restoreUserSettings = restoreUserSettings;
window.initBackgroundSlideshow = initBackgroundSlideshow;
window.warmupFrequentlyUsedSounds = warmupFrequentlyUsedSounds;

// 音效配置
const soundConfig = {
  rain: {
    path: "audio/rain.mp3",
    name: "雨声",
    icon: "🌧️",
  },
  waves: {
    path: "audio/waves.mp3",
    name: "海浪声",
    icon: "🌊",
  },
  fire: {
    path: "audio/fire.mp3",
    name: "篝火声",
    icon: "🔥",
  },
  forest: {
    path: "audio/forest.mp3",
    name: "森林声",
    icon: "🌲",
  },
  cafe: {
    path: "audio/cafe.mp3",
    name: "咖啡厅",
    icon: "☕",
  },
  "white-noise": {
    path: "audio/white-noise.mp3",
    name: "白噪音",
    icon: "🎧",
  },
  wind: {
    path: "audio/wind.mp3",
    name: "风声",
    icon: "💨",
  },
};

// 应用状态
const defaultState = {
  isPlaying: false,
  playingSounds: new Set(), // 改为Set来支持多音效播放
  volume: 70,
  timerActive: false,
  timerDuration: 0,
  settingsPanelVisible: false,
};

// DOM元素引用
const elements = {};

/**
 * 初始化应用程序
 */
async function initApp() {
  try {
    console.log("开始初始化白噪音应用...");

    // 初始化错误恢复管理器
    errorRecoveryManager = new ErrorRecoveryManager();
    
    // 设置错误恢复回调
    errorRecoveryManager.setCallbacks({
      onError: (errorRecord) => {
        console.log('错误记录:', errorRecord);
      },
      onRetry: (retryInfo) => {
        console.log(`重试操作: ${retryInfo.context.type} - 第${retryInfo.retryCount}次`);
        showRetryNotification(retryInfo);
      },
      onFallback: (fallbackInfo) => {
        console.log('执行降级策略:', fallbackInfo);
        showFallbackNotification(fallbackInfo);
      },
      onRecovery: (recoveryInfo) => {
        console.log('错误恢复成功:', recoveryInfo);
        showRecoveryNotification(recoveryInfo);
      }
    });

    // 初始化加载编排器
    loadingOrchestrator = new LoadingOrchestrator();
    
    // 将错误恢复管理器注入到加载编排器
    loadingOrchestrator.setErrorRecoveryManager(errorRecoveryManager);

    // 初始化并显示骨架屏
    try {
      skeletonManager = new SkeletonManager();
      skeletonManager.show();
      console.log("骨架屏初始化和显示完成");
    } catch (error) {
      console.error("骨架屏初始化失败:", error);
      // 如果骨架屏失败，继续执行但不显示任何加载指示器
    }

    // 初始化状态
    initAppState();
    console.log("应用状态初始化完成");

    // 使用加载编排器管理加载流程
    await loadingOrchestrator.startLoading({
      onProgressUpdate: (progress) => {
        console.log(
          `加载进度: ${progress.phase} - ${progress.progress}% - ${progress.message}`
        );
        updateLoadingProgress(progress);
      },
      onPhaseComplete: (phase, result) => {
        console.log(`加载阶段完成: ${phase}`, result);
      },
      onError: (errorInfo) => {
        console.error(`加载错误: ${errorInfo.context}`, errorInfo.error);
        handleLoadingError(errorInfo);
      },
      onComplete: (summary) => {
        console.log("加载编排完成:", summary);
        showLoadingSuccess('应用加载完成');
        finalizeInitialization();
      },
    });

    console.log("白噪音应用初始化完成");
  } catch (error) {
    console.error("应用初始化失败:", error);
    showErrorMessage(`应用初始化失败: ${error.message}`);

    // 错误时也要隐藏骨架屏
    if (skeletonManager) {
      skeletonManager.hide();
    }
  }
}

/**
 * 初始化应用状态
 */
function initAppState() {
  appState = { ...defaultState };

  // 从localStorage恢复设置
  const savedSettings = localStorage.getItem("whiteNoiseSettings");
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings);
      appState.volume = settings.volume || defaultState.volume;
      if (settings.playingSounds && Array.isArray(settings.playingSounds)) {
        appState.playingSounds = new Set(settings.playingSounds);
      }
    } catch (error) {
      console.warn("恢复用户设置失败:", error);
    }
  }
}

/**
 * 获取DOM元素引用
 */
function initDOMElements() {
  elements.playPauseBtn = document.getElementById("play-pause-btn");
  elements.soundSelector = document.getElementById("sound-selector");
  elements.soundButtons = document.querySelectorAll(".sound-btn");
  elements.settingsBtn = document.getElementById("settings-btn");
  elements.volumeSlider = document.getElementById("volume-slider");
  elements.volumeDisplay = document.getElementById("volume-display");
  elements.timerButtons = document.querySelectorAll(".timer-btn");
  elements.customTimerBtn = document.getElementById("custom-timer-btn");
  elements.customTimerInput = document.getElementById("custom-timer-input");
  elements.customMinutes = document.getElementById("custom-minutes");
  elements.setCustomTimer = document.getElementById("set-custom-timer");
  elements.timerStatus = document.getElementById("timer-status");
  elements.timerDisplay = document.getElementById("timer-display");
  elements.cancelTimer = document.getElementById("cancel-timer");
  elements.errorMessage = document.getElementById("error-message");
  elements.errorText = document.getElementById("error-text");
  elements.closeError = document.getElementById("close-error");

  // 验证关键元素是否存在
  const requiredElements = ["playPauseBtn", "soundSelector", "volumeSlider"];
  for (const elementName of requiredElements) {
    if (!elements[elementName]) {
      throw new Error(`关键DOM元素未找到: ${elementName}`);
    }
  }
}

/**
 * 初始化管理器
 */
async function initManagers() {
  // 初始化 LazyAudioManager 并完成必要绑定
  audioManager = new LazyAudioManager();

  // 将音频配置传入懒加载管理器，便于按需加载时获取配置
  if (typeof audioManager.setSoundConfigs === 'function') {
    audioManager.setSoundConfigs(soundConfig);
  }

  // 注入错误恢复管理器（若存在），便于在加载失败时走统一重试/降级
  if (errorRecoveryManager && typeof audioManager.setErrorRecoveryManager === 'function') {
    audioManager.setErrorRecoveryManager(errorRecoveryManager);
  }

  // 设置加载相关的回调（仅后台日志，不显示UI）
  if (typeof audioManager.setCallbacks === 'function') {
    audioManager.setCallbacks({
      onLoadingStateChange: handleAudioLoadingStateChange,
      onLoadingProgress: handleAudioLoadingProgress,
      onLoadingError: handleAudioLoadingError,
    });
  }

  await audioManager.init();

  // 供 ErrorRecoveryManager 等全局模块访问（其使用 window.audioManager）
  try {
    window.audioManager = audioManager;
  } catch (e) {
    console.warn('无法挂载 window.audioManager:', e);
  }

  // 初始化TimerManager
  timerManager = new TimerManager();

  console.log("管理器初始化完成");
}

/**
 * 更新加载进度显示（仅后台日志）
 * @param {Object} progress - 进度信息
 */
function updateLoadingProgress(progress) {
  // 只在控制台输出进度信息，不显示UI
  console.log(`[加载进度] ${progress.phase}: ${progress.progress}% - ${progress.message}`);
}

/**
 * 隐藏加载进度显示（仅后台日志）
 */
function hideLoadingProgress() {
  console.log('[加载进度] 加载进度隐藏');
}

/**
 * 显示加载错误状态（仅后台日志）
 * @param {string} message - 错误消息
 */
function showLoadingError(message) {
  console.error(`[加载错误] ${message}`);
}

/**
 * 显示加载成功状态（仅后台日志）
 * @param {string} message - 成功消息
 */
function showLoadingSuccess(message) {
  console.log(`[加载成功] ${message}`);
}

/**
 * 处理音频加载状态变化（仅后台日志）
 * @param {string} name - 音频名称
 * @param {string} status - 加载状态
 * @param {Object} state - 状态详情
 */
function handleAudioLoadingStateChange(name, status, state) {
  console.log(`[音频加载] ${name} -> ${status}`);
  // 不再更新UI，只记录日志
}

/**
 * 处理音频加载进度（仅后台日志）
 * @param {string} name - 音频名称
 * @param {number} progress - 进度百分比
 * @param {number} loaded - 已加载字节数
 * @param {number} total - 总字节数
 */
function handleAudioLoadingProgress(name, progress, loaded, total) {
  console.log(`[音频进度] ${name} - ${progress}% (${loaded}/${total} bytes)`);
  // 不再更新UI，只记录日志
}

/**
 * 处理音频加载错误
 * @param {Object} errorInfo - 错误信息
 */
function handleAudioLoadingError(errorInfo) {
  const { name, error, retryCount } = errorInfo;
  console.error(`音频加载错误: ${name}`, error);
  
  // 如果重试次数用完，显示错误提示
  if (retryCount >= audioManager.maxRetries) {
    showErrorMessage(`音频 "${soundConfig[name]?.name || name}" 加载失败`);
  }
}

/**
 * 处理加载错误
 * @param {Object} errorInfo - 错误信息
 */
function handleLoadingError(errorInfo) {
  // 根据错误类型决定处理策略
  const { error, context, phase } = errorInfo;

  // 非关键阶段的错误不显示给用户
  const criticalPhases = ["basic_ui", "interactive"];

  if (criticalPhases.includes(phase)) {
    // 关键阶段错误：显示在加载状态指示器和错误消息中
    showLoadingError(`${phase === 'basic_ui' ? '界面' : '交互'}加载失败`);
    showErrorMessage(`加载失败: ${error.message}`);
  } else {
    // 非关键错误：只在加载状态指示器中显示警告
    console.warn(`非关键加载错误 [${context}]:`, error);
    
    if (phase === 'skeleton') {
      // 骨架屏错误不影响用户体验
      console.log('骨架屏加载失败，继续正常流程');
    } else if (phase === 'background') {
      // 背景资源错误只记录日志
      console.warn('[背景资源] 部分背景资源加载失败，但不影响使用');
    }
  }
}

/**
 * 完成最终初始化
 * 这个函数现在由LoadingOrchestrator调用，作为加载流程的一部分
 */
function finalizeInitialization() {
  try {
    console.log("开始最终初始化阶段...");
    
    // 隐藏骨架屏，显示真实内容
    if (skeletonManager) {
      console.log("准备隐藏骨架屏...");
      try {
        skeletonManager.hide(() => {
          console.log("骨架屏隐藏完成，真实内容已显示");
        });
      } catch (error) {
        console.error("隐藏骨架屏时出错:", error);
      }
    } else {
      console.warn("skeletonManager未初始化");
    }

    console.log("最终初始化完成");
  } catch (error) {
    console.error("最终初始化失败:", error);
    showErrorMessage(`初始化失败: ${error.message}`);
  }
}

/**
 * 绑定事件监听器
 */
function bindEventListeners() {
  // 播放/暂停按钮
  elements.playPauseBtn.addEventListener("click", handlePlayPauseClick);

  // 音效选择按钮（现在支持多音效叠加）
  elements.soundButtons.forEach((button) => {
    button.addEventListener("click", handleSoundButtonClick);
  });

  // 音量控制
  elements.volumeSlider.addEventListener("input", handleVolumeChange);

  // 定时器按钮
  elements.timerButtons.forEach((button) => {
    if (button.id !== "custom-timer-btn") {
      button.addEventListener("click", handleTimerButtonClick);
    }
  });

  // 自定义定时器
  elements.customTimerBtn.addEventListener("click", toggleCustomTimerInput);
  elements.setCustomTimer.addEventListener("click", handleCustomTimerSet);
  elements.customMinutes.addEventListener(
    "keypress",
    handleCustomTimerKeypress
  );

  // 取消定时器
  elements.cancelTimer.addEventListener("click", handleCancelTimer);

  // 错误消息关闭
  elements.closeError.addEventListener("click", hideErrorMessage);

  // 键盘快捷键
  document.addEventListener("keydown", handleKeyboardShortcuts);

  // 页面可见性变化（处理标签页切换）
  document.addEventListener("visibilitychange", handleVisibilityChange);

  // 初始化水平滚动管理器
  try {
    horizontalScrollManager = new HorizontalScrollManager('#sound-selector');
    console.log("水平滚动管理器初始化完成");
  } catch (error) {
    console.error("水平滚动管理器初始化失败:", error);
  }

  console.log("事件监听器绑定完成");
}

/**
 * 加载音频文件
 */
async function loadAudioFiles() {
  try {
    console.log("开始加载音频文件...");

    // 设置超时机制，防止无限加载
    const loadPromise = audioManager.loadSounds(soundConfig);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("音频加载超时")), 15000); // 15秒超时
    });

    await Promise.race([loadPromise, timeoutPromise]);
    console.log("音频文件加载完成");

    // 检查加载成功的音频数量
    const loadedSounds = audioManager.getLoadedSounds();
    console.log("成功加载的音频:", loadedSounds);

    if (loadedSounds.length === 0) {
      throw new Error("没有音频文件加载成功");
    }

    // 预热AudioContext（可选）
    if (audioManager.getContextState() === "suspended") {
      console.log("AudioContext处于暂停状态，等待用户交互");
    }
  } catch (error) {
    console.error("音频文件加载失败:", error);
    showErrorMessage("音频文件加载失败，但应用仍可正常使用界面功能");

    // 即使音频加载失败，也要继续初始化
  }
}

/**
 * 确保指定音效已加载（按需加载）
 * @param {string} name - 音效名称
 */
async function ensureSoundLoaded(name) {
  try {
    if (!audioManager) return;
    if (audioManager.isLoaded && audioManager.isLoaded(name)) return;

    const cfg = soundConfig ? soundConfig[name] : null;

    // 优先使用懒加载接口（如果可用）
    if (typeof audioManager.loadSoundLazy === 'function') {
      await audioManager.loadSoundLazy(name, cfg || null);
      return;
    }

    // 回退到批量加载接口
    if (typeof audioManager.loadSounds === 'function' && cfg) {
      await audioManager.loadSounds({ [name]: cfg });
    }
  } catch (error) {
    console.error(`按需加载音效失败: ${name}`, error);
  }
}

/**
 * 预热常用音效（后台异步加载，不触发播放）
 * @param {string[]} names - 需要预热的音效名列表
 * @param {number} delayMs - 启动前延迟毫秒数，默认2000ms
 */
async function warmupFrequentlyUsedSounds(names = null, delayMs = 2000) {
  try {
    const list = Array.isArray(names) && names.length > 0 ? names : Object.keys(soundConfig || {});
    if (!Array.isArray(list) || list.length === 0) return;
    if (delayMs && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    for (const name of list) {
      await ensureSoundLoaded(name);
    }
    console.log('常用音效预热完成:', list);
  } catch (e) {
    console.warn('常用音效预热失败:', e);
  }
}

/**
 * 恢复用户设置
 */
function restoreUserSettings() {
  // 设置音量
  elements.volumeSlider.value = appState.volume;
  updateVolumeDisplay(appState.volume);
  audioManager.setMasterVolume(appState.volume / 100);

  // 恢复音效激活状态（但不自动播放）
  updateSoundButtonsState();

  console.log("用户设置已恢复");
}

/**
 * 保存用户设置
 */
function saveUserSettings() {
  const settings = {
    volume: appState.volume,
    playingSounds: Array.from(appState.playingSounds),
  };

  try {
    localStorage.setItem("whiteNoiseSettings", JSON.stringify(settings));
  } catch (error) {
    console.warn("保存用户设置失败:", error);
  }
}

// 加载指示器相关函数已移除，现在使用骨架屏系统

/**
 * 显示错误消息
 */
function showErrorMessage(message) {
  if (elements.errorMessage && elements.errorText) {
    elements.errorText.textContent = message;
    elements.errorMessage.style.display = "block";

    // 5秒后自动隐藏
    setTimeout(hideErrorMessage, 5000);
  }
}

/**
 * 隐藏错误消息
 */
function hideErrorMessage() {
  if (elements.errorMessage) {
    elements.errorMessage.style.display = "none";
  }
}

/**
 * 显示重试通知
 * @param {Object} retryInfo - 重试信息
 */
function showRetryNotification(retryInfo) {
  const { context, retryCount, maxRetries } = retryInfo;
  
  // 创建重试通知
  const notification = document.createElement('div');
  notification.className = 'retry-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">🔄</span>
      <span class="notification-text">正在重试${getContextDisplayName(context.type)}... (${retryCount}/${maxRetries})</span>
    </div>
  `;

  document.body.appendChild(notification);

  // 自动隐藏通知
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 3000);
}

/**
 * 显示降级通知
 * @param {Object} fallbackInfo - 降级信息
 */
function showFallbackNotification(fallbackInfo) {
  const { context, fallbackResult } = fallbackInfo;
  
  // 只对用户可见的降级显示通知
  if (context.type === 'audio' || context.type === 'ui') {
    const notification = document.createElement('div');
    notification.className = 'fallback-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">⚠️</span>
        <span class="notification-text">${fallbackResult.message || '部分功能已降级，但不影响基本使用'}</span>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    document.body.appendChild(notification);

    // 自动隐藏通知
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 8000);
  }
}

/**
 * 显示恢复通知
 * @param {Object} recoveryInfo - 恢复信息
 */
function showRecoveryNotification(recoveryInfo) {
  const { context } = recoveryInfo;
  
  const notification = document.createElement('div');
  notification.className = 'recovery-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">✅</span>
      <span class="notification-text">${getContextDisplayName(context.type)}已恢复正常</span>
    </div>
  `;

  document.body.appendChild(notification);

  // 自动隐藏通知
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 3000);
}

/**
 * 获取上下文类型的显示名称
 * @param {string} contextType - 上下文类型
 * @returns {string} 显示名称
 */
function getContextDisplayName(contextType) {
  const displayNames = {
    'audio': '音频',
    'network': '网络连接',
    'ui': '界面',
    'skeleton': '加载动画'
  };
  
  return displayNames[contextType] || contextType;
}

/**
 * 更新音量显示
 */
function updateVolumeDisplay(volume) {
  if (elements.volumeDisplay) {
    elements.volumeDisplay.textContent = `${volume}%`;
  }

  // 更新音量可视化
  updateVolumeVisualizer(volume);
}

/**
 * 更新音量可视化器
 */
function updateVolumeVisualizer(volume) {
  const volumeBars = document.querySelectorAll(".volume-bar");
  if (!volumeBars.length) return;

  // 计算应该激活的音量条数量
  const activeBarCount = Math.ceil((volume / 100) * volumeBars.length);

  volumeBars.forEach((bar, index) => {
    if (index < activeBarCount) {
      bar.classList.add("active");
      // 添加动画效果
      bar.classList.add("animate");
      setTimeout(() => {
        bar.classList.remove("animate");
      }, 600);
    } else {
      bar.classList.remove("active");
    }
  });
}

/**
 * 启动音量可视化动画
 */
function startVolumeAnimation() {
  const volumeBars = document.querySelectorAll(".volume-bar");
  if (!volumeBars.length) return;

  let animationId;

  function animate() {
    volumeBars.forEach((bar, index) => {
      const delay = index * 100;
      setTimeout(() => {
        bar.classList.add("animate");
        setTimeout(() => {
          bar.classList.remove("animate");
        }, 300);
      }, delay);
    });

    animationId = setTimeout(animate, 1500);
  }

  if (appState.isPlaying) {
    animate();
  }

  return animationId;
}

/**
 * 停止音量可视化动画
 */
function stopVolumeAnimation(animationId) {
  if (animationId) {
    clearTimeout(animationId);
  }
}

// 音量动画ID
let volumeAnimationId = null;

/**
 * 更新播放按钮状态
 */
function updatePlayButtonState() {
  if (!elements.playPauseBtn) return;

  if (appState.isPlaying) {
    elements.playPauseBtn.textContent = "暂停";
    elements.playPauseBtn.classList.add("playing");
    elements.playPauseBtn.setAttribute("aria-label", "暂停播放");

    // 启动音量可视化动画
    volumeAnimationId = startVolumeAnimation();
  } else {
    elements.playPauseBtn.textContent = "播放";
    elements.playPauseBtn.classList.remove("playing");
    elements.playPauseBtn.setAttribute("aria-label", "开始播放");

    // 停止音量可视化动画
    stopVolumeAnimation(volumeAnimationId);
    volumeAnimationId = null;
  }
}

/**
 * 更新音效按钮状态
 */
function updateSoundButtonsState() {
  elements.soundButtons.forEach((button) => {
    const soundName = button.dataset.sound;
    if (appState.playingSounds.has(soundName)) {
      button.classList.add("active");
      button.classList.add("playing");
    } else {
      button.classList.remove("active");
      button.classList.remove("playing");
    }
  });
}

/**
 * 更新音效按钮的加载状态（已移除UI显示）
 * @param {string} soundName - 音效名称
 * @param {string} status - 加载状态
 */
function updateSoundButtonLoadingState(soundName, status) {
  // 不再更新UI，只记录日志
  console.log(`[按钮状态] ${soundName} -> ${status}`);
}

/**
 * 更新音效按钮的加载进度（已移除UI显示）
 * @param {string} soundName - 音效名称
 * @param {number} progress - 进度百分比
 */
function updateSoundButtonProgress(soundName, progress) {
  // 不再更新UI，只记录日志
  console.log(`[按钮进度] ${soundName} -> ${progress}%`);
}

/**
 * 为音效按钮添加进度指示器（已移除UI显示）
 * @param {HTMLElement} button - 音效按钮元素
 */
function addProgressIndicator(button) {
  // 不再添加UI元素，只记录日志
  console.log('[按钮指示器] 进度指示器已禁用');
}

/**
 * 更新定时器显示
 */
function updateTimerDisplay(status) {
  if (!elements.timerDisplay || !elements.timerStatus) return;

  if (status.isActive) {
    elements.timerDisplay.textContent = status.remainingTimeFormatted;
    elements.timerStatus.style.display = "block";

    // 更新圆形进度条
    updateTimerProgress(status.progress || 0);
  } else {
    elements.timerStatus.style.display = "none";
  }
}

/**
 * 更新定时器圆形进度条
 */
function updateTimerProgress(progress) {
  const progressBar = document.querySelector(".timer-progress-bar");
  if (!progressBar) return;

  // 计算进度（0-1之间的值）
  const circumference = 157; // 2 * π * r (r=25, 新的半径)
  const offset = circumference - progress * circumference;

  progressBar.style.strokeDashoffset = offset;

  // 根据进度改变颜色
  if (progress > 0.7) {
    progressBar.style.stroke = "rgba(56, 161, 105, 0.8)"; // 绿色
  } else if (progress > 0.3) {
    progressBar.style.stroke = "rgba(214, 158, 46, 0.8)"; // 黄色
  } else {
    progressBar.style.stroke = "rgba(229, 62, 62, 0.8)"; // 红色
  }
}

/**
 * 页面加载完成后初始化
 */
document.addEventListener("DOMContentLoaded", initApp);

/**
 * 页面卸载前清理资源
 */
window.addEventListener("beforeunload", () => {
  saveUserSettings();

  if (audioManager) {
    audioManager.destroy();
  }

  if (timerManager) {
    timerManager.destroy();
  }

  if (skeletonManager) {
    skeletonManager.destroy();
  }

  if (loadingOrchestrator) {
    loadingOrchestrator.destroy();
  }

  if (errorRecoveryManager) {
    errorRecoveryManager.destroy();
  }

  if (horizontalScrollManager) {
    horizontalScrollManager.destroy();
  }

  if (backgroundSlideshow) {
    backgroundSlideshow.destroy();
  }
});

// ==================== 事件处理函数 ====================



/**
 * 处理播放/暂停按钮点击
 */
async function handlePlayPauseClick() {
  try {
    if (appState.isPlaying) {
      // 暂停所有播放
      audioManager.stopAllSounds();
      appState.isPlaying = false;
      appState.playingSounds.clear();

      // 重置背景主题
      resetBackgroundTheme();
    } else {
      // 如果没有选中的音效，默认播放雨声
      if (appState.playingSounds.size === 0) {
        const defaultSound = "rain";
        await ensureSoundLoaded(defaultSound);
        if (await audioManager.playSound(defaultSound, appState.volume / 100)) {
          appState.isPlaying = true;
          appState.playingSounds.add(defaultSound);
          switchBackgroundTheme(defaultSound);
        } else {
          showErrorMessage("播放失败，请检查音频文件是否正常");
          return;
        }
      } else {
        // 恢复播放所有选中的音效
        let hasSuccess = false;
        for (const soundName of appState.playingSounds) {
          // 确保每个音效已加载（按需加载）
          await ensureSoundLoaded(soundName);
          if (await audioManager.playSound(soundName, appState.volume / 100)) {
            hasSuccess = true;
          }
        }
        if (hasSuccess) {
          appState.isPlaying = true;
          // 使用第一个音效的主题
          const firstSound = Array.from(appState.playingSounds)[0];
          switchBackgroundTheme(firstSound);
        } else {
          showErrorMessage("播放失败，请重试");
          return;
        }
      }
    }

    updatePlayButtonState();
    updateSoundButtonsState();
    saveUserSettings();

    // 添加涟漪效果
    addRippleEffect(elements.playPauseBtn);
  } catch (error) {
    console.error("播放/暂停操作失败:", error);
    showErrorMessage("操作失败，请重试");
  }
}

/**
 * 处理音效按钮点击（支持多音效叠加）
 */
async function handleSoundButtonClick(event) {
  try {
    const soundName = event.currentTarget.dataset.sound;

    if (!soundName) {
      showErrorMessage('无效的音效名称');
      return;
    }

    // 确保音频已加载（按需加载）
    await ensureSoundLoaded(soundName);

    // 如果点击的音效正在播放，则停止它
    if (appState.playingSounds.has(soundName)) {
      audioManager.stopSound(soundName);
      appState.playingSounds.delete(soundName);

      // 如果没有音效在播放了，更新播放状态
      if (appState.playingSounds.size === 0) {
        appState.isPlaying = false;
        resetBackgroundTheme();
      } else {
        // 使用剩余音效中的第一个作为背景主题
        const firstSound = Array.from(appState.playingSounds)[0];
        switchBackgroundTheme(firstSound);
      }
    } else {
      // 添加新的音效到播放列表
      if (await audioManager.playSound(soundName, appState.volume / 100)) {
        appState.isPlaying = true;
        appState.playingSounds.add(soundName);

        // 使用第一个音效的主题（如果这是第一个音效）
        if (appState.playingSounds.size === 1) {
          switchBackgroundTheme(soundName);
        }
      } else {
        showErrorMessage("播放失败，请重试");
        return;
      }
    }

    updatePlayButtonState();
    updateSoundButtonsState();
    saveUserSettings();

    // 添加涟漪效果
    addRippleEffect(event.currentTarget);
  } catch (error) {
    console.error("音效切换失败:", error);
    showErrorMessage("音效切换失败，请重试");
  }
}

/**
 * 切换设置面板显示状态
 */
function toggleSettingsPanel() {
  if (appState.settingsPanelVisible) {
    hideSettingsPanel();
  } else {
    showSettingsPanel();
  }
}

/**
 * 显示设置面板
 */
function showSettingsPanel() {
  if (elements.settingsPanel) {
    elements.settingsPanel.classList.add("visible");
    appState.settingsPanelVisible = true;
  }
}

/**
 * 隐藏设置面板
 */
function hideSettingsPanel() {
  if (elements.settingsPanel) {
    elements.settingsPanel.classList.remove("visible");
    appState.settingsPanelVisible = false;
  }
}

/**
 * 处理设置面板点击（点击外部区域关闭）
 */
function handleSettingsPanelClick(event) {
  if (event.target === elements.settingsPanel) {
    hideSettingsPanel();
  }
}

/**
 * 处理音量变化（使用防抖优化）
 */
const handleVolumeChange = debounce(function (event) {
  try {
    const volume = parseInt(event.target.value);
    appState.volume = volume;

    // 更新显示
    updateVolumeDisplay(volume);

    // 设置音频音量
    audioManager.setMasterVolume(volume / 100);

    // 保存设置
    saveUserSettings();
  } catch (error) {
    console.error("音量调节失败:", error);
  }
}, 100); // 100ms防抖

/**
 * 处理定时器按钮点击
 */
function handleTimerButtonClick(event) {
  try {
    const minutes = parseInt(event.currentTarget.dataset.minutes);

    if (!minutes || minutes <= 0) {
      showErrorMessage("无效的定时器时长");
      return;
    }

    startTimer(minutes);

    // 更新按钮状态
    elements.timerButtons.forEach((btn) => btn.classList.remove("active"));
    event.currentTarget.classList.add("active");
  } catch (error) {
    console.error("设置定时器失败:", error);
    showErrorMessage("设置定时器失败，请重试");
  }
}

/**
 * 切换自定义定时器输入显示
 */
function toggleCustomTimerInput() {
  if (elements.customTimerInput) {
    const isVisible = elements.customTimerInput.style.display !== "none";
    elements.customTimerInput.style.display = isVisible ? "none" : "flex";

    if (!isVisible) {
      elements.customMinutes.focus();
    }
  }
}

/**
 * 处理自定义定时器设置
 */
function handleCustomTimerSet() {
  try {
    const minutes = parseInt(elements.customMinutes.value);

    if (!minutes || minutes <= 0 || minutes > 480) {
      showErrorMessage("请输入1-480之间的分钟数");
      return;
    }

    startTimer(minutes);

    // 隐藏输入框并清空
    elements.customTimerInput.style.display = "none";
    elements.customMinutes.value = "";

    // 更新按钮状态
    elements.timerButtons.forEach((btn) => btn.classList.remove("active"));
    elements.customTimerBtn.classList.add("active");
  } catch (error) {
    console.error("设置自定义定时器失败:", error);
    showErrorMessage("设置定时器失败，请重试");
  }
}

/**
 * 处理自定义定时器输入框回车键
 */
function handleCustomTimerKeypress(event) {
  if (event.key === "Enter") {
    handleCustomTimerSet();
  }
}

/**
 * 启动定时器
 */
function startTimer(minutes) {
  try {
    const success = timerManager.start(
      minutes,
      handleTimerExpired,
      updateTimerDisplay
    );

    if (success) {
      appState.timerActive = true;
      appState.timerDuration = minutes;
      console.log(`定时器已设置: ${minutes}分钟`);
    } else {
      showErrorMessage("定时器设置失败");
    }
  } catch (error) {
    console.error("启动定时器失败:", error);
    showErrorMessage("定时器设置失败，请重试");
  }
}

/**
 * 处理定时器到期
 */
function handleTimerExpired() {
  try {
    // 停止所有音频
    audioManager.stopAllSounds();

    // 更新应用状态
    appState.isPlaying = false;
    appState.playingSounds.clear();
    appState.timerActive = false;
    appState.timerDuration = 0;

    // 重置背景主题
    resetBackgroundTheme();

    // 更新UI
    updatePlayButtonState();
    updateSoundButtonsState();
    updateTimerDisplay({ isActive: false });

    // 重置定时器按钮状态
    elements.timerButtons.forEach((btn) => btn.classList.remove("active"));

    console.log("定时器到期，已停止播放");
  } catch (error) {
    console.error("处理定时器到期失败:", error);
  }
}

/**
 * 处理取消定时器
 */
function handleCancelTimer() {
  try {
    timerManager.cancel();

    appState.timerActive = false;
    appState.timerDuration = 0;

    updateTimerDisplay({ isActive: false });

    // 重置定时器按钮状态
    elements.timerButtons.forEach((btn) => btn.classList.remove("active"));

    console.log("定时器已取消");
  } catch (error) {
    console.error("取消定时器失败:", error);
  }
}

/**
 * 处理键盘快捷键
 */
function handleKeyboardShortcuts(event) {
  // 如果正在输入，忽略快捷键
  if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
    return;
  }

  switch (event.key.toLowerCase()) {
    case "1":
    case "2":
    case "3":
    case "4":
    case "5":
      const soundIndex = parseInt(event.key) - 1;
      const soundNames = Object.keys(soundConfig);
      if (soundIndex >= 0 && soundIndex < soundNames.length) {
        const soundName = soundNames[soundIndex];
        const button = document.querySelector(`[data-sound="${soundName}"]`);
        if (button) {
          button.click();
        }
      }
      break;

    case " ":
    case "spacebar":
      event.preventDefault();
      // 如果有正在播放的音效，暂停它；否则播放第一个音效
      if (appState.isPlaying && appState.currentSound) {
        const currentButton = document.querySelector(
          `[data-sound="${appState.currentSound}"]`
        );
        if (currentButton) {
          currentButton.click();
        }
      } else {
        // 播放第一个音效（雨声）
        const firstButton = document.querySelector('[data-sound="rain"]');
        if (firstButton) {
          firstButton.click();
        }
      }
      break;
  }
}

/**
 * 处理页面可见性变化
 */
function handleVisibilityChange() {
  if (document.hidden) {
    // 页面隐藏时暂停（可选）
    console.log("页面已隐藏");
  } else {
    // 页面显示时恢复AudioContext（处理自动播放策略）
    if (audioManager && appState.isPlaying) {
      audioManager.resumeContext();
    }
    console.log("页面已显示");
  }
}

// ==================== 水平滚动管理器 ====================

/**
 * 水平滚动管理器
 * 管理声音选择器的水平滚动交互和指示器显示
 */
class HorizontalScrollManager {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      console.warn(`HorizontalScrollManager: 容器 ${containerSelector} 未找到`);
      return;
    }
    
    this.scrollList = this.container.querySelector('.sound-list-container');
    this.leftIndicator = this.container.querySelector('.scroll-indicator-left');
    this.rightIndicator = this.container.querySelector('.scroll-indicator-right');
    
    if (!this.scrollList) {
      console.warn('HorizontalScrollManager: 滚动列表容器未找到');
      return;
    }
    
    this.setupAccessibility();
    this.init();
  }
  
  setupAccessibility() {
    // 为滚动容器添加ARIA标签
    this.scrollList.setAttribute('role', 'region');
    this.scrollList.setAttribute('aria-label', '声音选择列表，可水平滚动');
    
    // 添加滚动状态的实时区域
    this.createScrollStatusAnnouncer();
    
    // 为容器添加键盘导航说明
    this.container.setAttribute('aria-label', '声音选择器，使用左右箭头键滚动');
    
    // 检测浏览器特性支持
    this.detectBrowserFeatures();
  }
  
  detectBrowserFeatures() {
    // 检测是否支持平滑滚动
    this.supportsSmoothScroll = 'scrollBehavior' in document.documentElement.style;
    
    // 检测是否支持触摸事件
    this.supportsTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // 检测是否支持CSS Grid和Flexbox
    this.supportsFlexbox = CSS.supports('display', 'flex');
    
    console.log('浏览器特性检测:', {
      smoothScroll: this.supportsSmoothScroll,
      touch: this.supportsTouch,
      flexbox: this.supportsFlexbox
    });
  }
  
  createScrollStatusAnnouncer() {
    // 创建屏幕阅读器公告区域
    this.announcer = document.createElement('div');
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.className = 'sr-only';
    this.announcer.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    
    this.container.appendChild(this.announcer);
  }
  
  init() {
    this.bindEvents();
    this.updateIndicators();
    
    // 延迟恢复滚动位置，确保内容已加载
    setTimeout(() => {
      this.restoreScrollPosition();
    }, 100);
  }
  
  bindEvents() {
    if (!this.scrollList) return;
    
    // 鼠标滚轮水平滚动
    this.scrollList.addEventListener('wheel', this.handleWheel.bind(this));
    
    // 滚动位置更新和保存（使用节流优化性能）
    const handleScroll = this.throttle(() => {
      this.updateIndicators();
      this.debouncedSavePosition();
    }, 16); // 约60fps
    
    this.scrollList.addEventListener('scroll', handleScroll);
    
    // 窗口大小变化处理（使用防抖）
    const handleResize = this.debounce(() => {
      this.updateIndicators();
      this.handleResponsiveTransition();
    }, 250);
    
    window.addEventListener('resize', handleResize);
    
    // 键盘导航
    this.container.addEventListener('keydown', this.handleKeydown.bind(this));
    
    // 确保容器可以获得焦点
    if (!this.container.hasAttribute('tabindex')) {
      this.container.setAttribute('tabindex', '0');
    }
    
    // 创建防抖保存函数
    this.debouncedSavePosition = this.debounce(() => {
      this.saveScrollPosition();
    }, 500);
    
    // 保存事件处理器引用以便清理
    this.boundHandlers = {
      scroll: handleScroll,
      resize: handleResize,
      wheel: this.handleWheel.bind(this),
      keydown: this.handleKeydown.bind(this)
    };
  }
  
  handleWheel(event) {
    // 只处理垂直滚动转换为水平滚动
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    
    event.preventDefault();
    
    // 兼容不同浏览器的滚动值
    const delta = event.deltaY || event.detail || event.wheelDelta;
    const scrollAmount = delta > 0 ? 50 : -50;
    
    this.scrollList.scrollLeft += scrollAmount;
  }
  
  handleKeydown(event) {
    if (!this.scrollList) return;
    
    const scrollAmount = 100; // 每次滚动的像素数
    let handled = false;
    
    switch (event.key) {
      case 'ArrowLeft':
        this.scrollList.scrollLeft -= scrollAmount;
        handled = true;
        break;
      case 'ArrowRight':
        this.scrollList.scrollLeft += scrollAmount;
        handled = true;
        break;
      case 'Home':
        this.scrollTo(0);
        handled = true;
        break;
      case 'End':
        this.scrollTo(this.scrollList.scrollWidth - this.scrollList.clientWidth);
        handled = true;
        break;
    }
    
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
  
  updateIndicators() {
    if (!this.scrollList || !this.leftIndicator || !this.rightIndicator) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = this.scrollList;
    const maxScroll = scrollWidth - clientWidth;
    
    // 左侧指示器可见性
    const showLeftIndicator = scrollLeft > 10;
    if (showLeftIndicator) {
      this.leftIndicator.classList.add('visible');
    } else {
      this.leftIndicator.classList.remove('visible');
    }
    
    // 右侧指示器可见性
    const showRightIndicator = scrollLeft < maxScroll - 10;
    if (showRightIndicator) {
      this.rightIndicator.classList.add('visible');
    } else {
      this.rightIndicator.classList.remove('visible');
    }
    
    // 更新屏幕阅读器公告
    this.updateScrollAnnouncement(scrollLeft, maxScroll, showLeftIndicator, showRightIndicator);
  }
  
  updateScrollAnnouncement(scrollLeft, maxScroll, showLeftIndicator, showRightIndicator) {
    if (!this.announcer) return;
    
    // 防抖公告更新，避免过于频繁的公告
    if (this.announcementTimeout) {
      clearTimeout(this.announcementTimeout);
    }
    
    this.announcementTimeout = setTimeout(() => {
      let announcement = '';
      
      if (maxScroll <= 0) {
        announcement = '所有声音选项都可见';
      } else {
        const progress = Math.round((scrollLeft / maxScroll) * 100);
        announcement = `滚动进度 ${progress}%`;
        
        if (showLeftIndicator && showRightIndicator) {
          announcement += '，可向左右滚动查看更多选项';
        } else if (showRightIndicator) {
          announcement += '，可向右滚动查看更多选项';
        } else if (showLeftIndicator) {
          announcement += '，可向左滚动查看更多选项';
        } else {
          announcement += '，已显示所有选项';
        }
      }
      
      this.announcer.textContent = announcement;
    }, 1000); // 1秒延迟，避免滚动时过于频繁的公告
  }
  
  /**
   * 处理响应式过渡
   */
  handleResponsiveTransition() {
    // 为主要元素添加过渡类
    const elementsToTransition = [
      document.querySelector('.main-container'),
      document.querySelector('.control-panel'),
      this.container
    ];
    
    elementsToTransition.forEach(element => {
      if (element) {
        element.classList.add('responsive-transition');
        
        // 过渡完成后移除类，避免影响其他动画
        setTimeout(() => {
          element.classList.remove('responsive-transition');
        }, 300);
      }
    });
  }
  
  /**
   * 滚动到指定位置
   * @param {number} position - 滚动位置
   * @param {boolean} smooth - 是否平滑滚动
   */
  scrollTo(position, smooth = true) {
    if (!this.scrollList) return;
    
    // 使用特性检测决定滚动方式
    if (smooth && this.supportsSmoothScroll) {
      this.scrollList.scrollTo({
        left: position,
        behavior: 'smooth'
      });
    } else if (smooth && !this.supportsSmoothScroll) {
      // 为不支持平滑滚动的浏览器提供动画回退
      this.animateScrollTo(position);
    } else {
      this.scrollList.scrollLeft = position;
    }
  }
  
  /**
   * 动画滚动回退（用于不支持CSS平滑滚动的浏览器）
   * @param {number} targetPosition - 目标位置
   */
  animateScrollTo(targetPosition) {
    const startPosition = this.scrollList.scrollLeft;
    const distance = targetPosition - startPosition;
    const duration = 300;
    let startTime = null;
    
    const animateScroll = (currentTime) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      
      // 使用缓动函数
      const easeInOutCubic = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      this.scrollList.scrollLeft = startPosition + distance * easeInOutCubic;
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };
    
    requestAnimationFrame(animateScroll);
  }
  
  /**
   * 滚动到指定元素
   * @param {HTMLElement} element - 目标元素
   * @param {boolean} smooth - 是否平滑滚动
   */
  scrollToElement(element, smooth = true) {
    if (!this.scrollList || !element) return;
    
    const containerRect = this.scrollList.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const scrollLeft = this.scrollList.scrollLeft;
    
    const targetPosition = scrollLeft + elementRect.left - containerRect.left - 
                          (containerRect.width - elementRect.width) / 2;
    
    this.scrollTo(targetPosition, smooth);
  }
  
  /**
   * 防抖函数
   * @param {Function} func - 要防抖的函数
   * @param {number} wait - 等待时间（毫秒）
   * @returns {Function} 防抖后的函数
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  /**
   * 节流函数
   * @param {Function} func - 要节流的函数
   * @param {number} limit - 限制时间间隔（毫秒）
   * @returns {Function} 节流后的函数
   */
  throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  
  /**
   * 保存滚动位置
   */
  saveScrollPosition() {
    if (!this.scrollList) return;
    
    try {
      localStorage.setItem('horizontalScrollPosition', this.scrollList.scrollLeft.toString());
    } catch (error) {
      console.warn('保存滚动位置失败:', error);
    }
  }
  
  /**
   * 恢复滚动位置
   */
  restoreScrollPosition() {
    if (!this.scrollList) return;
    
    try {
      const savedPosition = localStorage.getItem('horizontalScrollPosition');
      if (savedPosition !== null) {
        const position = parseInt(savedPosition, 10);
        if (!isNaN(position)) {
          this.scrollTo(position, false); // 不使用平滑滚动以避免初始化时的动画
        }
      }
    } catch (error) {
      console.warn('恢复滚动位置失败:', error);
    }
  }
  
  /**
   * 销毁管理器
   */
  destroy() {
    // 保存当前滚动位置
    this.saveScrollPosition();
    
    // 清理定时器
    if (this.announcementTimeout) {
      clearTimeout(this.announcementTimeout);
    }
    
    // 移除事件监听器
    if (this.boundHandlers && this.scrollList) {
      this.scrollList.removeEventListener('wheel', this.boundHandlers.wheel);
      this.scrollList.removeEventListener('scroll', this.boundHandlers.scroll);
    }
    
    if (this.boundHandlers && this.container) {
      this.container.removeEventListener('keydown', this.boundHandlers.keydown);
    }
    
    if (this.boundHandlers) {
      window.removeEventListener('resize', this.boundHandlers.resize);
    }
    
    // 清理公告元素
    if (this.announcer && this.announcer.parentNode) {
      this.announcer.parentNode.removeChild(this.announcer);
    }
  }
}

// 全局水平滚动管理器实例
let horizontalScrollManager;

/**
 * 动态调整声音按钮布局
 * 根据按钮数量自动优化显示效果
 */
function adjustSoundButtonLayout() {
  const soundList = document.querySelector('.sound-list');
  const soundButtons = document.querySelectorAll('.sound-btn');
  
  if (!soundList || !soundButtons.length) return;
  
  const buttonCount = soundButtons.length;
  console.log(`检测到 ${buttonCount} 个声音按钮`);
  
  // 如果按钮数量为7个或更少，使用完美适配布局
  if (buttonCount <= 7) {
    soundList.style.justifyContent = 'space-evenly';
    soundList.classList.add('perfect-fit-layout');
    console.log('应用完美适配布局（7个或更少按钮）');
  } else {
    // 如果按钮数量超过7个，使用滚动布局
    soundList.style.justifyContent = 'flex-start';
    soundList.classList.remove('perfect-fit-layout');
    soundList.classList.add('scroll-layout');
    console.log('应用滚动布局（超过7个按钮）');
  }
}

// ==================== 交互效果函数 ====================

/**
 * 涟漪效果管理器
 */
class RippleManager {
  constructor() {
    this.activeRipples = new Map();
  }

  /**
   * 创建涟漪效果
   */
  createRipple(element, event) {
    if (!element) return;

    // 获取点击位置
    const rect = element.getBoundingClientRect();
    const x = event ? event.clientX - rect.left : rect.width / 2;
    const y = event ? event.clientY - rect.top : rect.height / 2;

    // 创建涟漪元素
    const ripple = document.createElement("div");
    ripple.className = "ripple-effect";
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    // 添加到元素中
    element.appendChild(ripple);

    // 触发动画
    requestAnimationFrame(() => {
      ripple.classList.add("ripple-animate");
    });

    // 清理涟漪
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);

    return ripple;
  }

  /**
   * 为元素添加涟漪效果监听器
   */
  addRippleListener(element) {
    if (!element) return;

    element.addEventListener("click", (event) => {
      this.createRipple(element, event);
    });

    // 确保元素有相对定位
    if (getComputedStyle(element).position === "static") {
      element.style.position = "relative";
    }

    // 确保元素有溢出隐藏
    element.style.overflow = "hidden";
  }
}

// 创建全局涟漪管理器
const rippleManager = new RippleManager();

/**
 * 添加涟漪效果（简化接口）
 */
function addRippleEffect(element, event = null) {
  rippleManager.createRipple(element, event);
}

/**
 * 初始化所有涟漪效果
 */
function initializeRippleEffects() {
  // 为主播放按钮添加涟漪效果
  if (elements.playPauseBtn) {
    rippleManager.addRippleListener(elements.playPauseBtn);
    elements.playPauseBtn.classList.add("ripple-large");
  }

  // 为音效按钮添加涟漪效果
  elements.soundButtons.forEach((button) => {
    rippleManager.addRippleListener(button);
  });

  // 为定时器按钮添加涟漪效果
  elements.timerButtons.forEach((button) => {
    rippleManager.addRippleListener(button);
    button.classList.add("ripple-small");
  });

  // 为其他按钮添加涟漪效果
  const otherButtons = [
    elements.setCustomTimer,
    elements.cancelTimer,
    elements.closeError,
  ];

  otherButtons.forEach((button) => {
    if (button) {
      rippleManager.addRippleListener(button);
      button.classList.add("ripple-small");
    }
  });
}

/**
 * 为元素添加呼吸动画
 */
function addBreathingEffect(element) {
  if (!element) return;

  element.style.animation = "breathe 3s ease-in-out infinite";
}

/**
 * 移除呼吸动画
 */
function removeBreathingEffect(element) {
  if (!element) return;

  element.style.animation = "";
}

// ==================== 主题管理函数 ====================

/**
 * 切换背景主题
 */
function switchBackgroundTheme(soundName) {
  const backgroundContainer = document.getElementById("background-container");
  if (!backgroundContainer) return;

  // 移除所有主题类
  const themeClasses = [
    "bg-rain",
    "bg-waves",
    "bg-fire",
    "bg-forest",
    "bg-cafe",
    "bg-white-noise",
    "bg-wind",
  ];
  themeClasses.forEach((className) => {
    backgroundContainer.classList.remove(className);
  });

  // 添加对应的主题类
  if (soundName && themeClasses.includes(`bg-${soundName}`)) {
    backgroundContainer.classList.add(`bg-${soundName}`);
  }

  console.log(`背景主题已切换到: ${soundName}`);
}

/**
 * 重置背景主题到默认状态
 */
function resetBackgroundTheme() {
  const backgroundContainer = document.getElementById("background-container");
  if (!backgroundContainer) return;

  const themeClasses = [
    "bg-rain",
    "bg-waves",
    "bg-fire",
    "bg-forest",
    "bg-cafe",
    "bg-white-noise",
    "bg-wind",
  ];
  themeClasses.forEach((className) => {
    backgroundContainer.classList.remove(className);
  });

  console.log("背景主题已重置到默认状态");
}

// ==================== 工具函数 ====================

/**
 * 防抖函数
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数
 */
function throttle(func, limit) {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 格式化时间
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

/**
 * 检查浏览器支持
 */
function checkBrowserSupport() {
  const support = {
    webAudio: !!(window.AudioContext || window.webkitAudioContext),
    localStorage: !!window.localStorage,
    es6: typeof Symbol !== "undefined",
  };

  return support;
}

// ==================== 背景轮播管理 ====================

/**
 * 背景轮播管理器
 */
class BackgroundSlideshow {
  constructor() {
    this.container = document.getElementById("background-slideshow");
    this.slides = [];
    this.currentIndex = 0;
    this.intervalId = null;
    this.duration = 8000; // 8秒切换一次

    // 检测设备类型
    this.isMobile = window.innerWidth <= 768;

    // 预设图片列表（根据实际文件名）
    this.imageList = this.isMobile
      ? [
          "images/phone-1.png",
          "images/phone-2.png",
          "images/phone-3.png",
          "images/phone-4.png",
          "images/phone-5.png",
        ]
      : [
          "images/pc-1.png",
          "images/pc-2.png",
          "images/pc-3.png",
          "images/pc-4.png",
          "images/pc-5.png",
        ];
  }

  /**
   * 初始化轮播
   */
  async init() {
    if (!this.container) return;

    // 创建图片元素
    this.imageList.forEach((imagePath, index) => {
      const slide = document.createElement("div");
      slide.className = "background-slide";
      slide.style.backgroundImage = `url('${imagePath}')`;
      slide.style.backgroundSize = "cover";
      slide.style.backgroundPosition = "center";
      slide.style.backgroundRepeat = "no-repeat";

      // 第一张图片设为激活状态
      if (index === 0) {
        slide.classList.add("active");
      }

      this.container.appendChild(slide);
      this.slides.push(slide);
    });

    // 开始轮播
    this.start();

    // 监听窗口大小变化
    window.addEventListener("resize", this.handleResize.bind(this));
  }

  /**
   * 开始轮播
   */
  start() {
    if (this.slides.length <= 1) return;

    this.intervalId = setInterval(() => {
      this.nextSlide();
    }, this.duration);
  }

  /**
   * 停止轮播
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 下一张图片
   */
  nextSlide() {
    if (this.slides.length === 0) return;

    // 隐藏当前图片
    this.slides[this.currentIndex].classList.remove("active");

    // 切换到下一张
    this.currentIndex = (this.currentIndex + 1) % this.slides.length;

    // 显示新图片
    this.slides[this.currentIndex].classList.add("active");
  }

  /**
   * 处理窗口大小变化
   */
  handleResize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth <= 768;

    // 如果设备类型改变，重新加载图片
    if (wasMobile !== this.isMobile) {
      this.updateImageList();
      this.reloadImages();
    }
  }

  /**
   * 更新图片列表
   */
  updateImageList() {
    this.imageList = this.isMobile
      ? [
          "images/phone-1.png",
          "images/phone-2.png",
          "images/phone-3.png",
          "images/phone-4.png",
          "images/phone-5.png",
        ]
      : [
          "images/pc-1.png",
          "images/pc-2.png",
          "images/pc-3.png",
          "images/pc-4.png",
          "images/pc-5.png",
        ];
  }

  /**
   * 重新加载图片
   */
  reloadImages() {
    // 清除现有slides
    this.slides.forEach((slide) => slide.remove());
    this.slides = [];
    this.currentIndex = 0;

    // 重新创建slides
    this.imageList.forEach((imagePath, index) => {
      const slide = document.createElement("div");
      slide.className = "background-slide";
      slide.style.backgroundImage = `url('${imagePath}')`;
      slide.style.backgroundSize = "cover";
      slide.style.backgroundPosition = "center";
      slide.style.backgroundRepeat = "no-repeat";

      if (index === 0) {
        slide.classList.add("active");
      }

      this.container.appendChild(slide);
      this.slides.push(slide);
    });
  }

  /**
   * 销毁轮播
   */
  destroy() {
    this.stop();
    window.removeEventListener("resize", this.handleResize.bind(this));
  }
}

// 全局背景轮播实例
let backgroundSlideshow = null;

/**
 * 初始化背景轮播
 */
function initBackgroundSlideshow() {
  backgroundSlideshow = new BackgroundSlideshow();
  backgroundSlideshow.init();
}

// 导出全局函数（用于调试）
window.whiteNoiseApp = {
  get audioManager() {
    return audioManager;
  },
  get timerManager() {
    return timerManager;
  },
  get skeletonManager() {
    return skeletonManager;
  },
  get loadingOrchestrator() {
    return loadingOrchestrator;
  },
  get appState() {
    return appState;
  },
  showErrorMessage,
  hideErrorMessageeErrorMessage,
  checkBrowserSupport,
  getPerformanceInfo: () => {
    return {
      audioMemory: audioManager ? audioManager.getMemoryInfo() : null,
      timerActive: timerManager ? timerManager.isActive() : false,
      appState: appState ? { ...appState } : null,
      performance: {
        loadTime: performance.now(),
        memory: performance.memory
          ? {
              used:
                Math.round(
                  (performance.memory.usedJSHeapSize / 1024 / 1024) * 100
                ) / 100,
              total:
                Math.round(
                  (performance.memory.totalJSHeapSize / 1024 / 1024) * 100
                ) / 100,
              limit:
                Math.round(
                  (performance.memory.jsHeapSizeLimit / 1024 / 1024) * 100
                ) / 100,
            }
          : "Not available",
      },
    };
  },
  runTests: () => {
    const tests = [];

    // 测试1: 检查全局对象
    tests.push({
      name: "全局对象存在",
      passed: !!window.whiteNoiseApp,
      message: window.whiteNoiseApp ? "✓" : "全局对象未找到",
    });

    // 测试2: 检查管理器
    tests.push({
      name: "AudioManager存在",
      passed: !!audioManager,
      message: audioManager ? "✓" : "AudioManager未初始化",
    });

    tests.push({
      name: "TimerManager存在",
      passed: !!timerManager,
      message: timerManager ? "✓" : "TimerManager未初始化",
    });

    tests.push({
      name: "应用状态存在",
      passed: !!appState,
      message: appState ? "✓" : "应用状态未初始化",
    });

    // 测试3: 检查DOM元素
    const requiredElements = [
      "play-pause-btn",
      "sound-selector",
      "settings-panel",
      "volume-slider",
    ];
    const missingElements = requiredElements.filter(
      (id) => !document.getElementById(id)
    );
    tests.push({
      name: "必需DOM元素存在",
      passed: missingElements.length === 0,
      message:
        missingElements.length === 0
          ? "✓"
          : `缺失: ${missingElements.join(", ")}`,
    });

    // 测试4: 检查浏览器支持
    const support = checkBrowserSupport();
    tests.push({
      name: "Web Audio API支持",
      passed: support.webAudio,
      message: support.webAudio ? "✓" : "不支持Web Audio API",
    });

    tests.push({
      name: "LocalStorage支持",
      passed: support.localStorage,
      message: support.localStorage ? "✓" : "不支持LocalStorage",
    });

    // 测试5: 检查音频加载状态
    if (audioManager) {
      const loadedSounds = audioManager.getLoadedSounds();
      tests.push({
        name: "音频文件已加载",
        passed: loadedSounds.length > 0,
        message: `已加载 ${loadedSounds.length} 个音频文件`,
      });
    }

    // 输出结果
    console.group("🧪 白噪音应用测试结果");
    tests.forEach((test) => {
      console.log(`${test.passed ? "✅" : "❌"} ${test.name}: ${test.message}`);
    });

    const passCount = tests.filter((t) => t.passed).length;
    console.log(
      `\n📊 总结: ${passCount}/${tests.length} 测试通过 ${
        passCount === tests.length ? "🎉" : "❌"
      }`
    );
    console.groupEnd();

    return tests;
  },
};
