/**
 * 白噪音网站主控制逻辑
 * 协调AudioManager、TimerManager和用户界面之间的交互
 */

// 全局变量
let audioManager;
let timerManager;
let appState;

// 音效配置
const soundConfig = {
    rain: {
        path: 'audio/rain.mp3',
        name: '雨声',
        icon: '🌧️'
    },
    waves: {
        path: 'audio/waves.mp3',
        name: '海浪声',
        icon: '🌊'
    },
    fire: {
        path: 'audio/fire.mp3',
        name: '篝火声',
        icon: '🔥'
    },
    forest: {
        path: 'audio/forest.mp3',
        name: '森林声',
        icon: '🌲'
    },
    cafe: {
        path: 'audio/cafe.mp3',
        name: '咖啡厅',
        icon: '☕'
    }
};

// 应用状态
const defaultState = {
    isPlaying: false,
    playingSounds: new Set(), // 改为Set来支持多音效播放
    volume: 70,
    timerActive: false,
    timerDuration: 0,
    settingsPanelVisible: false
};

// DOM元素引用
const elements = {};

/**
 * 初始化应用程序
 */
async function initApp() {
    try {
        console.log('开始初始化白噪音应用...');
        
        // 显示加载指示器
        showLoadingIndicator();
        
        // 初始化状态
        initAppState();
        console.log('应用状态初始化完成');
        
        // 获取DOM元素引用
        initDOMElements();
        console.log('DOM元素引用获取完成');
        
        // 初始化管理器
        await initManagers();
        console.log('管理器初始化完成');
        
        // 绑定事件监听器
        bindEventListeners();
        console.log('事件监听器绑定完成');
        
        // 初始化涟漪效果
        initializeRippleEffects();
        console.log('涟漪效果初始化完成');
        
        // 初始化背景轮播
        initBackgroundSlideshow();
        console.log('背景轮播初始化完成');
        
        // 加载音频文件（允许失败）
        try {
            await loadAudioFiles();
            console.log('音频文件加载流程完成');
        } catch (error) {
            console.warn('音频加载失败，但继续初始化界面:', error);
        }
        
        // 恢复用户设置
        restoreUserSettings();
        console.log('用户设置恢复完成');
        
        // 隐藏加载指示器
        hideLoadingIndicator();
        
        console.log('白噪音应用初始化完成');
        
    } catch (error) {
        console.error('应用初始化失败:', error);
        showErrorMessage(`应用初始化失败: ${error.message}`);
        hideLoadingIndicator();
    }
}

/**
 * 初始化应用状态
 */
function initAppState() {
    appState = { ...defaultState };
    
    // 从localStorage恢复设置
    const savedSettings = localStorage.getItem('whiteNoiseSettings');
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            appState.volume = settings.volume || defaultState.volume;
            if (settings.playingSounds && Array.isArray(settings.playingSounds)) {
                appState.playingSounds = new Set(settings.playingSounds);
            }
        } catch (error) {
            console.warn('恢复用户设置失败:', error);
        }
    }
}

/**
 * 获取DOM元素引用
 */
function initDOMElements() {
    elements.playPauseBtn = document.getElementById('play-pause-btn');
    elements.soundSelector = document.getElementById('sound-selector');
    elements.soundButtons = document.querySelectorAll('.sound-btn');
    elements.settingsBtn = document.getElementById('settings-btn');
    elements.volumeSlider = document.getElementById('volume-slider');
    elements.volumeDisplay = document.getElementById('volume-display');
    elements.timerButtons = document.querySelectorAll('.timer-btn');
    elements.customTimerBtn = document.getElementById('custom-timer-btn');
    elements.customTimerInput = document.getElementById('custom-timer-input');
    elements.customMinutes = document.getElementById('custom-minutes');
    elements.setCustomTimer = document.getElementById('set-custom-timer');
    elements.timerStatus = document.getElementById('timer-status');
    elements.timerDisplay = document.getElementById('timer-display');
    elements.cancelTimer = document.getElementById('cancel-timer');
    elements.loadingIndicator = document.getElementById('loading-indicator');
    elements.errorMessage = document.getElementById('error-message');
    elements.errorText = document.getElementById('error-text');
    elements.closeError = document.getElementById('close-error');
    
    // 验证关键元素是否存在
    const requiredElements = ['playPauseBtn', 'soundSelector', 'volumeSlider'];
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
    // 初始化AudioManager
    audioManager = new AudioManager();
    await audioManager.init();
    
    // 初始化TimerManager
    timerManager = new TimerManager();
    
    console.log('管理器初始化完成');
}

/**
 * 绑定事件监听器
 */
function bindEventListeners() {
    // 播放/暂停按钮
    elements.playPauseBtn.addEventListener('click', handlePlayPauseClick);
    
    // 音效选择按钮（现在支持多音效叠加）
    elements.soundButtons.forEach(button => {
        button.addEventListener('click', handleSoundButtonClick);
    });
    
    // 音量控制
    elements.volumeSlider.addEventListener('input', handleVolumeChange);
    
    // 定时器按钮
    elements.timerButtons.forEach(button => {
        if (button.id !== 'custom-timer-btn') {
            button.addEventListener('click', handleTimerButtonClick);
        }
    });
    
    // 自定义定时器
    elements.customTimerBtn.addEventListener('click', toggleCustomTimerInput);
    elements.setCustomTimer.addEventListener('click', handleCustomTimerSet);
    elements.customMinutes.addEventListener('keypress', handleCustomTimerKeypress);
    
    // 取消定时器
    elements.cancelTimer.addEventListener('click', handleCancelTimer);
    
    // 错误消息关闭
    elements.closeError.addEventListener('click', hideErrorMessage);
    
    // 键盘快捷键
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // 页面可见性变化（处理标签页切换）
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    console.log('事件监听器绑定完成');
}

/**
 * 加载音频文件
 */
async function loadAudioFiles() {
    try {
        console.log('开始加载音频文件...');
        
        // 更新加载指示器文本
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            const loadingText = loadingIndicator.querySelector('p');
            if (loadingText) {
                loadingText.textContent = '正在加载音频文件...';
            }
        }
        
        // 设置超时机制，防止无限加载
        const loadPromise = audioManager.loadSounds(soundConfig);
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('音频加载超时')), 15000); // 15秒超时
        });
        
        await Promise.race([loadPromise, timeoutPromise]);
        console.log('音频文件加载完成');
        
        // 检查加载成功的音频数量
        const loadedSounds = audioManager.getLoadedSounds();
        console.log('成功加载的音频:', loadedSounds);
        
        if (loadedSounds.length === 0) {
            throw new Error('没有音频文件加载成功');
        }
        
        // 预热AudioContext（可选）
        if (audioManager.getContextState() === 'suspended') {
            console.log('AudioContext处于暂停状态，等待用户交互');
        }
        
    } catch (error) {
        console.error('音频文件加载失败:', error);
        showErrorMessage('音频文件加载失败，但应用仍可正常使用界面功能');
        
        // 即使音频加载失败，也要继续初始化
        // 不要在这里调用hideLoadingIndicator，让主初始化流程处理
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
    
    console.log('用户设置已恢复');
}

/**
 * 保存用户设置
 */
function saveUserSettings() {
    const settings = {
        volume: appState.volume,
        playingSounds: Array.from(appState.playingSounds)
    };
    
    try {
        localStorage.setItem('whiteNoiseSettings', JSON.stringify(settings));
    } catch (error) {
        console.warn('保存用户设置失败:', error);
    }
}

/**
 * 显示加载指示器
 */
function showLoadingIndicator() {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) {
        indicator.style.display = 'flex';
        console.log('显示加载指示器');
    }
}

/**
 * 隐藏加载指示器
 */
function hideLoadingIndicator() {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) {
        indicator.style.display = 'none';
        console.log('隐藏加载指示器');
    }
}

/**
 * 显示错误消息
 */
function showErrorMessage(message) {
    if (elements.errorMessage && elements.errorText) {
        elements.errorText.textContent = message;
        elements.errorMessage.style.display = 'block';
        
        // 5秒后自动隐藏
        setTimeout(hideErrorMessage, 5000);
    }
}

/**
 * 隐藏错误消息
 */
function hideErrorMessage() {
    if (elements.errorMessage) {
        elements.errorMessage.style.display = 'none';
    }
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
    const volumeBars = document.querySelectorAll('.volume-bar');
    if (!volumeBars.length) return;
    
    // 计算应该激活的音量条数量
    const activeBarCount = Math.ceil((volume / 100) * volumeBars.length);
    
    volumeBars.forEach((bar, index) => {
        if (index < activeBarCount) {
            bar.classList.add('active');
            // 添加动画效果
            bar.classList.add('animate');
            setTimeout(() => {
                bar.classList.remove('animate');
            }, 600);
        } else {
            bar.classList.remove('active');
        }
    });
}

/**
 * 启动音量可视化动画
 */
function startVolumeAnimation() {
    const volumeBars = document.querySelectorAll('.volume-bar');
    if (!volumeBars.length) return;
    
    let animationId;
    
    function animate() {
        volumeBars.forEach((bar, index) => {
            const delay = index * 100;
            setTimeout(() => {
                bar.classList.add('animate');
                setTimeout(() => {
                    bar.classList.remove('animate');
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
        elements.playPauseBtn.textContent = '暂停';
        elements.playPauseBtn.classList.add('playing');
        elements.playPauseBtn.setAttribute('aria-label', '暂停播放');
        
        // 启动音量可视化动画
        volumeAnimationId = startVolumeAnimation();
    } else {
        elements.playPauseBtn.textContent = '播放';
        elements.playPauseBtn.classList.remove('playing');
        elements.playPauseBtn.setAttribute('aria-label', '开始播放');
        
        // 停止音量可视化动画
        stopVolumeAnimation(volumeAnimationId);
        volumeAnimationId = null;
    }
}

/**
 * 更新音效按钮状态
 */
function updateSoundButtonsState() {
    elements.soundButtons.forEach(button => {
        const soundName = button.dataset.sound;
        if (appState.playingSounds.has(soundName)) {
            button.classList.add('active');
            button.classList.add('playing');
        } else {
            button.classList.remove('active');
            button.classList.remove('playing');
        }
    });
}

/**
 * 更新定时器显示
 */
function updateTimerDisplay(status) {
    if (!elements.timerDisplay || !elements.timerStatus) return;
    
    if (status.isActive) {
        elements.timerDisplay.textContent = status.remainingTimeFormatted;
        elements.timerStatus.style.display = 'block';
        
        // 更新圆形进度条
        updateTimerProgress(status.progress || 0);
    } else {
        elements.timerStatus.style.display = 'none';
    }
}

/**
 * 更新定时器圆形进度条
 */
function updateTimerProgress(progress) {
    const progressBar = document.querySelector('.timer-progress-bar');
    if (!progressBar) return;
    
    // 计算进度（0-1之间的值）
    const circumference = 157; // 2 * π * r (r=25, 新的半径)
    const offset = circumference - (progress * circumference);
    
    progressBar.style.strokeDashoffset = offset;
    
    // 根据进度改变颜色
    if (progress > 0.7) {
        progressBar.style.stroke = 'rgba(56, 161, 105, 0.8)'; // 绿色
    } else if (progress > 0.3) {
        progressBar.style.stroke = 'rgba(214, 158, 46, 0.8)'; // 黄色
    } else {
        progressBar.style.stroke = 'rgba(229, 62, 62, 0.8)'; // 红色
    }
}

/**
 * 页面加载完成后初始化
 */
document.addEventListener('DOMContentLoaded', initApp);

/**
 * 页面卸载前清理资源
 */
window.addEventListener('beforeunload', () => {
    saveUserSettings();
    
    if (audioManager) {
        audioManager.destroy();
    }
    
    if (timerManager) {
        timerManager.destroy();
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
            // 暂停播放
            audioManager.stopAllSounds();
            appState.isPlaying = false;
            appState.currentSound = null;
            
            // 重置背景主题
            resetBackgroundTheme();
        } else {
            // 开始播放
            const soundToPlay = appState.currentSound || 'rain'; // 默认播放雨声
            
            console.log('尝试播放音效:', soundToPlay);
            console.log('音量设置:', appState.volume / 100);
            console.log('AudioManager状态:', audioManager.getContextState());
            console.log('音频是否已加载:', audioManager.isLoaded(soundToPlay));
            
            if (await audioManager.playSound(soundToPlay, appState.volume / 100)) {
                appState.isPlaying = true;
                appState.currentSound = soundToPlay;
                
                // 切换背景主题
                switchBackgroundTheme(soundToPlay);
                
                console.log('播放成功');
            } else {
                console.error('播放失败');
                showErrorMessage('播放失败，请检查音频文件是否正常');
                return;
            }
        }
        
        updatePlayButtonState();
        updateSoundButtonsState();
        saveUserSettings();
        
        // 添加涟漪效果
        addRippleEffect(elements.playPauseBtn);
        
    } catch (error) {
        console.error('播放/暂停操作失败:', error);
        showErrorMessage('操作失败，请重试');
    }
}

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
                const defaultSound = 'rain';
                if (await audioManager.playSound(defaultSound, appState.volume / 100)) {
                    appState.isPlaying = true;
                    appState.playingSounds.add(defaultSound);
                    switchBackgroundTheme(defaultSound);
                } else {
                    showErrorMessage('播放失败，请检查音频文件是否正常');
                    return;
                }
            } else {
                // 恢复播放所有选中的音效
                let hasSuccess = false;
                for (const soundName of appState.playingSounds) {
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
                    showErrorMessage('播放失败，请重试');
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
        console.error('播放/暂停操作失败:', error);
        showErrorMessage('操作失败，请重试');
    }
}

/**
 * 处理音效按钮点击（支持多音效叠加）
 */
async function handleSoundButtonClick(event) {
    try {
        const soundName = event.currentTarget.dataset.sound;
        
        if (!soundName || !audioManager.isLoaded(soundName)) {
            showErrorMessage(`音效 ${soundName} 未加载或不可用`);
            return;
        }
        
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
                showErrorMessage('播放失败，请重试');
                return;
            }
        }
        
        updatePlayButtonState();
        updateSoundButtonsState();
        saveUserSettings();
        
        // 添加涟漪效果
        addRippleEffect(event.currentTarget);
        
    } catch (error) {
        console.error('音效切换失败:', error);
        showErrorMessage('音效切换失败，请重试');
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
        elements.settingsPanel.classList.add('visible');
        appState.settingsPanelVisible = true;
    }
}

/**
 * 隐藏设置面板
 */
function hideSettingsPanel() {
    if (elements.settingsPanel) {
        elements.settingsPanel.classList.remove('visible');
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
const handleVolumeChange = debounce(function(event) {
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
        console.error('音量调节失败:', error);
    }
}, 100); // 100ms防抖

/**
 * 处理定时器按钮点击
 */
function handleTimerButtonClick(event) {
    try {
        const minutes = parseInt(event.currentTarget.dataset.minutes);
        
        if (!minutes || minutes <= 0) {
            showErrorMessage('无效的定时器时长');
            return;
        }
        
        startTimer(minutes);
        
        // 更新按钮状态
        elements.timerButtons.forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');
        
    } catch (error) {
        console.error('设置定时器失败:', error);
        showErrorMessage('设置定时器失败，请重试');
    }
}

/**
 * 切换自定义定时器输入显示
 */
function toggleCustomTimerInput() {
    if (elements.customTimerInput) {
        const isVisible = elements.customTimerInput.style.display !== 'none';
        elements.customTimerInput.style.display = isVisible ? 'none' : 'flex';
        
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
            showErrorMessage('请输入1-480之间的分钟数');
            return;
        }
        
        startTimer(minutes);
        
        // 隐藏输入框并清空
        elements.customTimerInput.style.display = 'none';
        elements.customMinutes.value = '';
        
        // 更新按钮状态
        elements.timerButtons.forEach(btn => btn.classList.remove('active'));
        elements.customTimerBtn.classList.add('active');
        
    } catch (error) {
        console.error('设置自定义定时器失败:', error);
        showErrorMessage('设置定时器失败，请重试');
    }
}

/**
 * 处理自定义定时器输入框回车键
 */
function handleCustomTimerKeypress(event) {
    if (event.key === 'Enter') {
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
            showErrorMessage('定时器设置失败');
        }
        
    } catch (error) {
        console.error('启动定时器失败:', error);
        showErrorMessage('定时器设置失败，请重试');
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
        elements.timerButtons.forEach(btn => btn.classList.remove('active'));
        
        console.log('定时器到期，已停止播放');
        
    } catch (error) {
        console.error('处理定时器到期失败:', error);
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
        elements.timerButtons.forEach(btn => btn.classList.remove('active'));
        
        console.log('定时器已取消');
        
    } catch (error) {
        console.error('取消定时器失败:', error);
    }
}

/**
 * 处理键盘快捷键
 */
function handleKeyboardShortcuts(event) {
    // 如果正在输入，忽略快捷键
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }
    
    switch (event.key.toLowerCase()) {
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
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
            
        case ' ':
        case 'spacebar':
            event.preventDefault();
            // 如果有正在播放的音效，暂停它；否则播放第一个音效
            if (appState.isPlaying && appState.currentSound) {
                const currentButton = document.querySelector(`[data-sound="${appState.currentSound}"]`);
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
        console.log('页面已隐藏');
    } else {
        // 页面显示时恢复AudioContext（处理自动播放策略）
        if (audioManager && appState.isPlaying) {
            audioManager.resumeContext();
        }
        console.log('页面已显示');
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
        const x = event ? (event.clientX - rect.left) : (rect.width / 2);
        const y = event ? (event.clientY - rect.top) : (rect.height / 2);
        
        // 创建涟漪元素
        const ripple = document.createElement('div');
        ripple.className = 'ripple-effect';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        
        // 添加到元素中
        element.appendChild(ripple);
        
        // 触发动画
        requestAnimationFrame(() => {
            ripple.classList.add('ripple-animate');
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
        
        element.addEventListener('click', (event) => {
            this.createRipple(element, event);
        });
        
        // 确保元素有相对定位
        if (getComputedStyle(element).position === 'static') {
            element.style.position = 'relative';
        }
        
        // 确保元素有溢出隐藏
        element.style.overflow = 'hidden';
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
        elements.playPauseBtn.classList.add('ripple-large');
    }
    
    // 为音效按钮添加涟漪效果
    elements.soundButtons.forEach(button => {
        rippleManager.addRippleListener(button);
    });
    
    // 为定时器按钮添加涟漪效果
    elements.timerButtons.forEach(button => {
        rippleManager.addRippleListener(button);
        button.classList.add('ripple-small');
    });
    
    // 为其他按钮添加涟漪效果
    const otherButtons = [
        elements.setCustomTimer,
        elements.cancelTimer,
        elements.closeError
    ];
    
    otherButtons.forEach(button => {
        if (button) {
            rippleManager.addRippleListener(button);
            button.classList.add('ripple-small');
        }
    });
}

/**
 * 为元素添加呼吸动画
 */
function addBreathingEffect(element) {
    if (!element) return;
    
    element.style.animation = 'breathe 3s ease-in-out infinite';
}

/**
 * 移除呼吸动画
 */
function removeBreathingEffect(element) {
    if (!element) return;
    
    element.style.animation = '';
}

// ==================== 主题管理函数 ====================

/**
 * 切换背景主题
 */
function switchBackgroundTheme(soundName) {
    const backgroundContainer = document.getElementById('background-container');
    if (!backgroundContainer) return;
    
    // 移除所有主题类
    const themeClasses = ['bg-rain', 'bg-waves', 'bg-fire', 'bg-forest', 'bg-cafe'];
    themeClasses.forEach(className => {
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
    const backgroundContainer = document.getElementById('background-container');
    if (!backgroundContainer) return;
    
    const themeClasses = ['bg-rain', 'bg-waves', 'bg-fire', 'bg-forest', 'bg-cafe'];
    themeClasses.forEach(className => {
        backgroundContainer.classList.remove(className);
    });
    
    console.log('背景主题已重置到默认状态');
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
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 格式化时间
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 检查浏览器支持
 */
function checkBrowserSupport() {
    const support = {
        webAudio: !!(window.AudioContext || window.webkitAudioContext),
        localStorage: !!window.localStorage,
        es6: typeof Symbol !== 'undefined'
    };
    
    return support;
}

// ==================== 背景轮播管理 ====================

/**
 * 背景轮播管理器
 */
class BackgroundSlideshow {
    constructor() {
        this.container = document.getElementById('background-slideshow');
        this.slides = [];
        this.currentIndex = 0;
        this.intervalId = null;
        this.duration = 8000; // 8秒切换一次
        
        // 检测设备类型
        this.isMobile = window.innerWidth <= 768;
        
        // 预设图片列表（根据实际文件名）
        this.imageList = this.isMobile ? [
            'images/phone-1.png', 'images/phone-2.png', 'images/phone-3.png', 
            'images/phone-4.png', 'images/phone-5.png'
        ] : [
            'images/pc-1.png', 'images/pc-2.png', 'images/pc-3.png', 
            'images/pc-4.png', 'images/pc-5.png'
        ];
    }
    
    /**
     * 初始化轮播
     */
    async init() {
        if (!this.container) return;
        
        // 创建图片元素
        this.imageList.forEach((imagePath, index) => {
            const slide = document.createElement('div');
            slide.className = 'background-slide';
            slide.style.backgroundImage = `url('${imagePath}')`;
            
            // 第一张图片设为激活状态
            if (index === 0) {
                slide.classList.add('active');
            }
            
            this.container.appendChild(slide);
            this.slides.push(slide);
        });
        
        // 开始轮播
        this.start();
        
        // 监听窗口大小变化
        window.addEventListener('resize', this.handleResize.bind(this));
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
        this.slides[this.currentIndex].classList.remove('active');
        
        // 切换到下一张
        this.currentIndex = (this.currentIndex + 1) % this.slides.length;
        
        // 显示新图片
        this.slides[this.currentIndex].classList.add('active');
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
        this.imageList = this.isMobile ? [
            'images/phone-1.png', 'images/phone-2.png', 'images/phone-3.png', 
            'images/phone-4.png', 'images/phone-5.png'
        ] : [
            'images/pc-1.png', 'images/pc-2.png', 'images/pc-3.png', 
            'images/pc-4.png', 'images/pc-5.png'
        ];
    }
    
    /**
     * 重新加载图片
     */
    reloadImages() {
        // 清除现有slides
        this.slides.forEach(slide => slide.remove());
        this.slides = [];
        this.currentIndex = 0;
        
        // 重新创建slides
        this.imageList.forEach((imagePath, index) => {
            const slide = document.createElement('div');
            slide.className = 'background-slide';
            slide.style.backgroundImage = `url('${imagePath}')`;
            
            if (index === 0) {
                slide.classList.add('active');
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
        window.removeEventListener('resize', this.handleResize.bind(this));
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
    get audioManager() { return audioManager; },
    get timerManager() { return timerManager; },
    get appState() { return appState; },
    showErrorMessage,
    hideErrorMessage,
    checkBrowserSupport,
    getPerformanceInfo: () => {
        return {
            audioMemory: audioManager ? audioManager.getMemoryInfo() : null,
            timerActive: timerManager ? timerManager.isActive() : false,
            appState: appState ? { ...appState } : null,
            performance: {
                loadTime: performance.now(),
                memory: performance.memory ? {
                    used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100,
                    total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024 * 100) / 100,
                    limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024 * 100) / 100
                } : 'Not available'
            }
        };
    },
    runTests: () => {
        const tests = [];
        
        // 测试1: 检查全局对象
        tests.push({
            name: '全局对象存在',
            passed: !!window.whiteNoiseApp,
            message: window.whiteNoiseApp ? '✓' : '全局对象未找到'
        });
        
        // 测试2: 检查管理器
        tests.push({
            name: 'AudioManager存在',
            passed: !!audioManager,
            message: audioManager ? '✓' : 'AudioManager未初始化'
        });
        
        tests.push({
            name: 'TimerManager存在', 
            passed: !!timerManager,
            message: timerManager ? '✓' : 'TimerManager未初始化'
        });
        
        tests.push({
            name: '应用状态存在',
            passed: !!appState,
            message: appState ? '✓' : '应用状态未初始化'
        });
        
        // 测试3: 检查DOM元素
        const requiredElements = ['play-pause-btn', 'sound-selector', 'settings-panel', 'volume-slider'];
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        tests.push({
            name: '必需DOM元素存在',
            passed: missingElements.length === 0,
            message: missingElements.length === 0 ? '✓' : `缺失: ${missingElements.join(', ')}`
        });
        
        // 测试4: 检查浏览器支持
        const support = checkBrowserSupport();
        tests.push({
            name: 'Web Audio API支持',
            passed: support.webAudio,
            message: support.webAudio ? '✓' : '不支持Web Audio API'
        });
        
        tests.push({
            name: 'LocalStorage支持',
            passed: support.localStorage,
            message: support.localStorage ? '✓' : '不支持LocalStorage'
        });
        
        // 测试5: 检查音频加载状态
        if (audioManager) {
            const loadedSounds = audioManager.getLoadedSounds();
            tests.push({
                name: '音频文件已加载',
                passed: loadedSounds.length > 0,
                message: `已加载 ${loadedSounds.length} 个音频文件`
            });
        }
        
        // 输出结果
        console.group('🧪 白噪音应用测试结果');
        tests.forEach(test => {
            console.log(`${test.passed ? '✅' : '❌'} ${test.name}: ${test.message}`);
        });
        
        const passCount = tests.filter(t => t.passed).length;
        console.log(`\n📊 总结: ${passCount}/${tests.length} 测试通过 ${passCount === tests.length ? '🎉' : '❌'}`);
        console.groupEnd();
        
        return tests;
    }
};