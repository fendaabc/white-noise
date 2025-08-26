/**
 * ModeManager - 模式切换管理器
 * 管理常规模式和校园模式之间的切换，协调UI、音频和状态管理
 */
class ModeManager {
    constructor() {
        this.currentMode = 'normal';
        this.soundButtonGenerator = null;
        this.localStorageManager = null;
        this.audioManager = null;
        
        // UI元素引用
        this.normalModeBtn = null;
        this.campusModeBtn = null;
        this.modeIndicator = null;
        this.modeContainer = null;
        this.customAudioMenu = null;
        this.audioFilePicker = null;
        
        // 状态
        this.isAnimating = false;
        this.currentEditSound = null;
        
        // 回调函数
        this.onModeChange = null;
        this.onCustomAudioSet = null;
        
        console.log('ModeManager 初始化完成');
    }

    /**
     * 初始化模式管理器
     * @param {Object} config - 配置选项
     */
    async init(config = {}) {
        try {
            // 获取必要的管理器实例
            this.soundButtonGenerator = config.soundButtonGenerator;
            this.localStorageManager = config.localStorageManager;
            this.audioManager = config.audioManager;
            
            // 初始化UI元素
            this.initUIElements();
            
            // 初始化音效按钮生成器
            if (this.soundButtonGenerator) {
                this.soundButtonGenerator.init('#sound-list');
                this.soundButtonGenerator.setEventHandlers(
                    this.handleSoundButtonClick.bind(this),
                    this.handleEditButtonClick.bind(this)
                );
            }
            
            // 绑定事件
            this.bindEvents();
            
            // 恢复模式状态
            this.restoreMode(config.initialMode || 'normal');
            
            console.log('ModeManager 初始化成功');
            return true;
            
        } catch (error) {
            console.error('ModeManager 初始化失败:', error);
            return false;
        }
    }

    /**
     * 初始化UI元素
     */
    initUIElements() {
        this.normalModeBtn = document.getElementById('normal-mode-btn');
        this.campusModeBtn = document.getElementById('campus-mode-btn');
        this.modeIndicator = document.querySelector('.mode-indicator');
        this.modeContainer = document.querySelector('.mode-toggle-container');
        this.customAudioMenu = document.getElementById('custom-audio-menu');
        this.audioFilePicker = document.getElementById('audio-file-picker');
        
        // 验证必要元素
        const requiredElements = {
            normalModeBtn: this.normalModeBtn,
            campusModeBtn: this.campusModeBtn,
            modeIndicator: this.modeIndicator,
            modeContainer: this.modeContainer
        };
        
        for (const [name, element] of Object.entries(requiredElements)) {
            if (!element) {
                throw new Error(`必要的UI元素未找到: ${name}`);
            }
        }
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 模式切换按钮
        this.normalModeBtn.addEventListener('click', () => this.switchMode('normal'));
        this.campusModeBtn.addEventListener('click', () => this.switchMode('campus'));
        
        // 自定义音频菜单事件
        if (this.customAudioMenu) {
            this.bindCustomAudioMenuEvents();
        }
        
        // 文件选择器事件
        if (this.audioFilePicker) {
            this.audioFilePicker.addEventListener('change', this.handleFileSelect.bind(this));
        }
    }

    /**
     * 绑定自定义音频菜单事件
     */
    bindCustomAudioMenuEvents() {
        const uploadBtn = document.getElementById('upload-audio-btn');
        const resetBtn = document.getElementById('reset-to-default-btn');
        const cancelBtn = document.getElementById('cancel-menu-btn');
        const menuOverlay = this.customAudioMenu.querySelector('.menu-overlay');
        
        if (uploadBtn) {
            uploadBtn.addEventListener('click', this.handleUploadClick.bind(this));
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', this.handleResetClick.bind(this));
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', this.hideCustomAudioMenu.bind(this));
        }
        
        if (menuOverlay) {
            menuOverlay.addEventListener('click', this.hideCustomAudioMenu.bind(this));
        }
    }

    /**
     * 切换模式
     * @param {string} mode - 目标模式 ('normal' | 'campus')
     */
    async switchMode(mode) {
        if (this.isAnimating || this.currentMode === mode) {
            return;
        }
        
        console.log(`切换模式: ${this.currentMode} -> ${mode}`);
        
        this.isAnimating = true;
        
        try {
            // 更新UI状态
            this.updateModeButtons(mode);
            this.updateModeIndicator(mode);
            this.updateBodyClass(mode);
            
            // 动画切换音效按钮
            if (this.soundButtonGenerator) {
                await new Promise(resolve => {
                    this.soundButtonGenerator.animatedSwitchMode(mode, resolve);
                });
            }
            
            // 更新音频管理器模式
            if (this.audioManager && typeof this.audioManager.setCurrentMode === 'function') {
                this.audioManager.setCurrentMode(mode);
            }
            
            // 更新当前模式
            const previousMode = this.currentMode;
            this.currentMode = mode;
            
            // 触发模式变更回调
            if (this.onModeChange) {
                this.onModeChange(mode, previousMode);
            }
            
            console.log(`模式切换完成: ${mode}`);
            
        } catch (error) {
            console.error('模式切换失败:', error);
        } finally {
            this.isAnimating = false;
        }
    }

    /**
     * 更新模式按钮状态
     * @param {string} activeMode - 激活的模式
     */
    updateModeButtons(activeMode) {
        // 移除所有active类
        this.normalModeBtn.classList.remove('active');
        this.campusModeBtn.classList.remove('active');
        
        // 添加active类到目标按钮
        if (activeMode === 'normal') {
            this.normalModeBtn.classList.add('active');
        } else {
            this.campusModeBtn.classList.add('active');
        }
    }

    /**
     * 更新模式指示器位置
     * @param {string} mode - 目标模式
     */
    updateModeIndicator(mode) {
        if (mode === 'campus') {
            this.modeContainer.classList.add('campus-mode');
        } else {
            this.modeContainer.classList.remove('campus-mode');
        }
    }

    /**
     * 更新body的CSS类
     * @param {string} mode - 目标模式
     */
    updateBodyClass(mode) {
        document.body.classList.remove('normal-mode', 'campus-mode');
        document.body.classList.add(`${mode}-mode`);
    }

    /**
     * 恢复模式状态
     * @param {string} mode - 要恢复的模式
     */
    restoreMode(mode) {
        this.currentMode = mode;
        this.updateModeButtons(mode);
        this.updateModeIndicator(mode);
        this.updateBodyClass(mode);
        
        // 生成对应模式的音效按钮
        if (this.soundButtonGenerator) {
            this.soundButtonGenerator.setCurrentMode(mode);
            this.soundButtonGenerator.generateButtons();
        }
    }

    /**
     * 处理音效按钮点击
     * @param {Event} event - 点击事件
     */
    handleSoundButtonClick(event) {
        const soundName = event.currentTarget.dataset.sound;
        if (!soundName) return;
        
        // 添加涟漪效果
        if (this.soundButtonGenerator) {
            this.soundButtonGenerator.addRippleEffect(event.currentTarget, event);
        }
        
        // 触发原始的音效按钮处理逻辑
        if (window.handleSoundButtonClick) {
            window.handleSoundButtonClick(event);
        }
    }

    /**
     * 处理编辑按钮点击
     * @param {Event} event - 点击事件
     */
    handleEditButtonClick(event) {
        const soundName = event.currentTarget.dataset.sound;
        if (!soundName) return;
        
        console.log(`编辑音效: ${soundName}`);
        
        this.currentEditSound = soundName;
        this.showCustomAudioMenu(soundName);
    }

    /**
     * 显示自定义音频菜单
     * @param {string} soundName - 音效名称
     */
    showCustomAudioMenu(soundName) {
        if (!this.customAudioMenu) return;
        
        // 更新菜单内容
        const soundNameSpan = document.getElementById('menu-sound-name');
        if (soundNameSpan) {
            soundNameSpan.textContent = this.getSoundDisplayName(soundName);
        }
        
        // 显示菜单
        this.customAudioMenu.style.display = 'flex';
        
        // 添加键盘事件监听
        document.addEventListener('keydown', this.handleMenuKeydown.bind(this));
    }

    /**
     * 隐藏自定义音频菜单
     */
    hideCustomAudioMenu() {
        if (!this.customAudioMenu) return;
        
        this.customAudioMenu.style.display = 'none';
        this.currentEditSound = null;
        
        // 移除键盘事件监听
        document.removeEventListener('keydown', this.handleMenuKeydown.bind(this));
        
        // 隐藏上传进度
        this.hideUploadProgress();
    }

    /**
     * 处理菜单键盘事件
     * @param {KeyboardEvent} event - 键盘事件
     */
    handleMenuKeydown(event) {
        if (event.key === 'Escape') {
            this.hideCustomAudioMenu();
        }
    }

    /**
     * 处理上传按钮点击
     */
    handleUploadClick() {
        if (this.audioFilePicker) {
            this.audioFilePicker.click();
        }
    }

    /**
     * 处理重置按钮点击
     */
    async handleResetClick() {
        if (!this.currentEditSound) return;
        
        try {
            // 移除自定义音频
            if (this.localStorageManager) {
                this.localStorageManager.deleteAudioFile(this.currentEditSound);
            }
            
            // 更新音效按钮生成器
            if (this.soundButtonGenerator) {
                this.soundButtonGenerator.updateCustomIndicator(this.currentEditSound, false);
                this.soundButtonGenerator.regenerateButton(this.currentEditSound);
            }
            
            // 触发回调
            if (this.onCustomAudioSet) {
                this.onCustomAudioSet(this.currentEditSound, null);
            }
            
            this.hideCustomAudioMenu();
            
            console.log(`已重置音效: ${this.currentEditSound}`);
            
        } catch (error) {
            console.error('重置音效失败:', error);
            alert('重置失败，请重试');
        }
    }

    /**
     * 处理文件选择
     * @param {Event} event - 文件选择事件
     */
    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file || !this.currentEditSound) return;
        
        try {
            // 显示上传进度
            this.showUploadProgress();
            this.updateProgressText('正在验证文件...');
            
            // 模拟进度更新
            await this.simulateProgress(20);
            
            // 存储音频文件
            if (this.localStorageManager) {
                this.updateProgressText('正在上传文件...');
                await this.simulateProgress(60);
                
                const result = await this.localStorageManager.storeAudioFile(this.currentEditSound, file);
                
                this.updateProgressText('正在更新配置...');
                await this.simulateProgress(80);
                
                // 更新音效按钮
                if (this.soundButtonGenerator) {
                    this.soundButtonGenerator.updateCustomIndicator(this.currentEditSound, true);
                    this.soundButtonGenerator.regenerateButton(this.currentEditSound);
                }
                
                // 更新音频管理器
                if (this.audioManager && typeof this.audioManager.setCustomSound === 'function') {
                    this.audioManager.setCustomSound(this.currentEditSound, {
                        type: 'local',
                        path: result.blobUrl,
                        fileName: result.fileName
                    });
                }
                
                this.updateProgressText('完成上传!');
                await this.simulateProgress(100);
                
                // 显示成功反馈
                this.showSuccessMessage(`音效 "${this.getSoundDisplayName(this.currentEditSound)}" 已成功更新为 "${result.fileName}"`);
                
                // 触发回调
                if (this.onCustomAudioSet) {
                    this.onCustomAudioSet(this.currentEditSound, result);
                }
                
                console.log(`已设置自定义音效: ${this.currentEditSound} -> ${result.fileName}`);
            }
            
            // 延迟隐藏菜单，让用户看到成功消息
            setTimeout(() => {
                this.hideCustomAudioMenu();
            }, 1500);
            
        } catch (error) {
            console.error('上传音频失败:', error);
            this.showErrorMessage(`上传失败: ${error.message}`);
        } finally {
            setTimeout(() => {
                this.hideUploadProgress();
            }, 2000);
            // 清空文件选择器
            event.target.value = '';
        }
    }

    /**
     * 显示上传进度
     */
    showUploadProgress() {
        const progressElement = document.getElementById('upload-progress');
        if (progressElement) {
            progressElement.style.display = 'block';
            
            // 重置进度条
            const progressBar = progressElement.querySelector('.progress-fill');
            if (progressBar) {
                progressBar.style.width = '0%';
            }
            
            // 重置文本
            this.updateProgressText('准备上传...');
        }
    }

    /**
     * 隐藏上传进度
     */
    hideUploadProgress() {
        const progressElement = document.getElementById('upload-progress');
        if (progressElement) {
            progressElement.style.display = 'none';
        }
    }

    /**
     * 更新进度文本
     * @param {string} text - 进度文本
     */
    updateProgressText(text) {
        const progressText = document.querySelector('.progress-text');
        if (progressText) {
            progressText.textContent = text;
        }
    }

    /**
     * 模拟进度更新
     * @param {number} targetPercent - 目标百分比
     */
    async simulateProgress(targetPercent) {
        return new Promise(resolve => {
            const progressBar = document.querySelector('.progress-fill');
            if (!progressBar) {
                resolve();
                return;
            }
            
            const currentPercent = parseFloat(progressBar.style.width) || 0;
            const increment = (targetPercent - currentPercent) / 10;
            let current = currentPercent;
            
            const updateProgress = () => {
                current += increment;
                if (current >= targetPercent) {
                    progressBar.style.width = targetPercent + '%';
                    resolve();
                } else {
                    progressBar.style.width = current + '%';
                    setTimeout(updateProgress, 50);
                }
            };
            
            updateProgress();
        });
    }

    /**
     * 显示成功消息
     * @param {string} message - 成功消息
     */
    showSuccessMessage(message) {
        // 优先使用全局NotificationManager
        if (window.notificationManager) {
            window.notificationManager.showSuccess(message);
        } else {
            this.showNotification(message, 'success');
        }
    }

    /**
     * 显示错误消息
     * @param {string} message - 错误消息
     */
    showErrorMessage(message) {
        // 优先使用全局NotificationManager
        if (window.notificationManager) {
            window.notificationManager.showError(message);
        } else {
            this.showNotification(message, 'error');
        }
    }

    /**
     * 显示通知消息
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型 ('success', 'error', 'info')
     */
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `upload-notification ${type}`;
        
        const icon = type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icon}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 自动隐藏
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, type === 'success' ? 3000 : 5000);
    }

    /**
     * 获取音效显示名称
     * @param {string} soundKey - 音效键名
     * @returns {string} 显示名称
     */
    getSoundDisplayName(soundKey) {
        const config = this.currentMode === 'campus' ? 
            (window.campusSoundConfig || {}) : 
            (window.soundConfig || {});
        
        return config[soundKey]?.name || soundKey;
    }

    /**
     * 获取当前模式
     * @returns {string} 当前模式
     */
    getCurrentMode() {
        return this.currentMode;
    }

    /**
     * 设置模式变更回调
     * @param {Function} callback - 回调函数
     */
    setModeChangeCallback(callback) {
        this.onModeChange = callback;
    }

    /**
     * 设置自定义音频设置回调
     * @param {Function} callback - 回调函数
     */
    setCustomAudioCallback(callback) {
        this.onCustomAudioSet = callback;
    }

    /**
     * 更新按钮状态
     * @param {Set} playingSounds - 正在播放的音效集合
     */
    updateButtonStates(playingSounds) {
        if (this.soundButtonGenerator) {
            this.soundButtonGenerator.updateButtonStates(playingSounds);
        }
    }

    /**
     * 销毁管理器
     */
    destroy() {
        // 移除事件监听器
        if (this.normalModeBtn) {
            this.normalModeBtn.removeEventListener('click', () => this.switchMode('normal'));
        }
        
        if (this.campusModeBtn) {
            this.campusModeBtn.removeEventListener('click', () => this.switchMode('campus'));
        }
        
        // 销毁音效按钮生成器
        if (this.soundButtonGenerator) {
            this.soundButtonGenerator.destroy();
        }
        
        // 清理引用
        this.soundButtonGenerator = null;
        this.localStorageManager = null;
        this.audioManager = null;
        this.onModeChange = null;
        this.onCustomAudioSet = null;
        
        console.log('ModeManager 已销毁');
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModeManager;
} else {
    window.ModeManager = ModeManager;
}