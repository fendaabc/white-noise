/**
 * SoundButtonGenerator - 动态音效按钮生成器
 * 根据不同模式动态生成音效按钮，支持自定义音频标识和编辑功能
 */
class SoundButtonGenerator {
    constructor() {
        this.container = null;
        this.currentMode = 'normal';
        this.customSounds = {};
        this.buttonClickHandler = null;
        this.editClickHandler = null;
        
        // 绑定事件处理器
        this.handleButtonClick = this.handleButtonClick.bind(this);
        this.handleEditClick = this.handleEditClick.bind(this);
        
        console.log('SoundButtonGenerator 初始化完成');
    }

    /**
     * 初始化生成器
     * @param {string} containerSelector - 容器选择器
     */
    init(containerSelector) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) {
            throw new Error(`音效按钮容器未找到: ${containerSelector}`);
        }
        
        console.log('SoundButtonGenerator 初始化成功');
        return true;
    }

    /**
     * 设置点击事件处理器
     * @param {Function} buttonHandler - 按钮点击处理器
     * @param {Function} editHandler - 编辑按钮点击处理器
     */
    setEventHandlers(buttonHandler, editHandler) {
        this.buttonClickHandler = buttonHandler;
        this.editClickHandler = editHandler;
    }

    /**
     * 设置当前模式
     * @param {string} mode - 模式名称
     */
    setCurrentMode(mode) {
        this.currentMode = mode;
    }

    /**
     * 设置自定义音效配置
     * @param {Object} customSounds - 自定义音效配置
     */
    setCustomSounds(customSounds) {
        this.customSounds = customSounds || {};
    }
    
    /**
     * 检查是否为自定义音效
     * @param {string} soundKey - 音效键名
     * @returns {boolean} 是否为自定义音效
     */
    isCustomSound(soundKey) {
        return this.customSounds && 
               this.customSounds[soundKey] && 
               this.customSounds[soundKey].type === 'local';
    }

    /**
     * 获取当前模式的音效配置
     * @returns {Object} 音效配置对象
     */
    getCurrentModeConfig() {
        if (this.currentMode === 'campus') {
            return window.campusSoundConfig || {};
        } else {
            // 返回常规模式配置（从 main.js 的 soundConfig）
            return window.soundConfig || {};
        }
    }

    /**
     * 生成音效按钮
     */
    generateButtons() {
        if (!this.container) {
            console.error('容器未初始化');
            return;
        }

        // 清空当前按钮
        this.container.innerHTML = '';

        // 获取当前模式的配置
        const config = this.getCurrentModeConfig();
        
        if (!config || Object.keys(config).length === 0) {
            console.warn(`${this.currentMode} 模式没有可用的音效配置`);
            this.showEmptyState();
            return;
        }

        // 生成按钮
        Object.entries(config).forEach(([soundKey, soundConfig]) => {
            const button = this.createSoundButton(soundKey, soundConfig);
            this.container.appendChild(button);
        });

        // 添加事件监听器
        this.bindEvents();
        
        console.log(`已生成 ${Object.keys(config).length} 个音效按钮 (${this.currentMode} 模式)`);
    }

    /**
     * 创建单个音效按钮
     * @param {string} soundKey - 音效键名
     * @param {Object} soundConfig - 音效配置
     * @returns {HTMLElement} 按钮元素
     */
    createSoundButton(soundKey, soundConfig) {
        const button = document.createElement('button');
        button.className = 'sound-btn';
        button.setAttribute('data-sound', soundKey);
        button.setAttribute('aria-label', soundConfig.name || soundKey);

        // 检查是否为自定义音效
        const isCustom = this.isCustomSound(soundKey);
        if (isCustom) {
            button.classList.add('custom');
        }

        // 创建按钮内容
        const soundIcon = document.createElement('span');
        soundIcon.className = 'sound-icon';
        soundIcon.textContent = soundConfig.icon || '🎵';

        const soundName = document.createElement('span');
        soundName.className = 'sound-name';
        soundName.textContent = soundConfig.name || soundKey;

        const playIndicator = document.createElement('div');
        playIndicator.className = 'play-indicator';
        playIndicator.textContent = '▶';

        // 编辑功能已统一到右键/长按菜单中，不再显示悬浮编辑按钮

        // 组装按钮
        button.appendChild(soundIcon);
        button.appendChild(soundName);
        button.appendChild(playIndicator);

        // 添加长按和右键菜单功能
        this.addAdvancedInteractions(button, soundKey, soundConfig);

        return button;
    }

    /**
     * 添加高级交互功能（长按、右键菜单）
     * @param {HTMLElement} button - 按钮元素
     * @param {string} soundKey - 音效键名
     * @param {Object} soundConfig - 音效配置
     */
    addAdvancedInteractions(button, soundKey, soundConfig) {
        let longPressTimer = null;
        let isLongPress = false;
        
        // 长按检测（鼠标和触摸）
        const startLongPress = (e) => {
            isLongPress = false;
            longPressTimer = setTimeout(() => {
                isLongPress = true;
                this.showContextMenu(e, soundKey, soundConfig);
                // 添加触觉反馈（如果支持）
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            }, 800); // 800ms 长按
        };
        
        const cancelLongPress = () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        };
        
        const endLongPress = (e) => {
            cancelLongPress();
            if (isLongPress) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        };
        
        // 鼠标事件
        button.addEventListener('mousedown', startLongPress);
        button.addEventListener('mouseup', endLongPress);
        button.addEventListener('mouseleave', cancelLongPress);
        
        // 触摸事件
        button.addEventListener('touchstart', (e) => {
            startLongPress(e);
        }, { passive: true });
        
        button.addEventListener('touchend', (e) => {
            endLongPress(e);
        });
        
        button.addEventListener('touchcancel', cancelLongPress);
        
        // 右键菜单
        button.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e, soundKey, soundConfig);
        });
        
        // 存储引用以便后续清理
        button._longPressCleanup = () => {
            cancelLongPress();
        };
    }

    /**
     * 显示上下文菜单
     * @param {Event} event - 触发事件
     * @param {string} soundKey - 音效键名
     * @param {Object} soundConfig - 音效配置
     */
    showContextMenu(event, soundKey, soundConfig) {
        // 移除现有菜单
        this.hideContextMenu();
        
        // 创建菜单元素
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.id = 'sound-context-menu';
        
        const isCustom = this.isCustomSound(soundKey);
        const soundName = soundConfig.name || soundKey;
        
        // 菜单选项（按照蓝图优化顺序）
        const menuItems = [
            {
                icon: '🎧',
                text: '预览音效',
                action: () => this.previewSound(soundKey)
            },
            {
                icon: '🔊',
                text: '独立音量',
                action: () => this.showVolumeControl(soundKey)
            }
        ];
        
        // 校园模式下的附加选项
        if (this.currentMode === 'campus') {
            menuItems.push({
                icon: '✏️',
                text: '自定义音频',
                action: () => this.editSound(soundKey)
            });
        }
        
        // 查看详情
        menuItems.push({
            icon: 'ℹ️',
            text: '查看详情',
            action: () => this.showSoundInfo(soundKey, soundConfig)
        });
        
        // 分割线和危险操作（仅在有自定义音效时显示）
        if (isCustom) {
            menuItems.push(
                { separator: true },
                {
                    icon: '🔄',
                    text: '还原默认',
                    action: () => this.resetSoundWithConfirmation(soundKey),
                    dangerous: true // 标记为危险操作
                }
            );
        }
        
        // 生成菜单HTML
        menu.innerHTML = `
            <div class="context-menu-header">
                <span class="menu-icon">${soundConfig.icon || '🎥'}</span>
                <span class="menu-title">${soundName}</span>
            </div>
            <div class="context-menu-items">
                ${menuItems.map(item => {
                    if (item.separator) {
                        return '<div class="menu-separator"></div>';
                    }
                    const dangerousClass = item.dangerous ? ' dangerous' : '';
                    return `
                        <div class="menu-item${dangerousClass}" data-action="${item.text}">
                            <span class="menu-item-icon">${item.icon}</span>
                            <span class="menu-item-text">${item.text}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        // 添加事件监听
        menu.addEventListener('click', (e) => {
            const menuItem = e.target.closest('.menu-item');
            if (menuItem) {
                const actionText = menuItem.dataset.action;
                const item = menuItems.find(i => i.text === actionText);
                if (item && item.action) {
                    item.action();
                    this.hideContextMenu();
                }
            }
        });
        
        // 计算位置
        document.body.appendChild(menu);
        const rect = menu.getBoundingClientRect();
        const x = Math.min(event.clientX, window.innerWidth - rect.width - 10);
        const y = Math.min(event.clientY, window.innerHeight - rect.height - 10);
        
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        
        // 添加显示动画
        requestAnimationFrame(() => {
            menu.classList.add('show');
        });
        
        // 点击外部隐藏菜单
        setTimeout(() => {
            document.addEventListener('click', this.hideContextMenu.bind(this), { once: true });
        }, 100);
    }

    /**
     * 隐藏上下文菜单
     */
    hideContextMenu() {
        const existingMenu = document.getElementById('sound-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
    }

    /**
     * 预览音效（短暂播放）
     * @param {string} soundKey - 音效键名
     */
    async previewSound(soundKey) {
        try {
            // 创建预览音频元素
            if (this.previewAudio) {
                this.previewAudio.pause();
                this.previewAudio = null;
            }
            
            // 获取音效信息
            const soundInfo = this.getSoundInfo ? this.getSoundInfo(soundKey) : null;
            if (!soundInfo) {
                this.showPreviewError('音效信息未找到');
                return;
            }
            
            this.previewAudio = new Audio();
            this.previewAudio.src = soundInfo.path;
            this.previewAudio.volume = 0.5; // 预览音量较低
            
            // 显示预览状态
            this.showPreviewStatus('正在预览...');
            
            // 播放3秒
            await this.previewAudio.play();
            setTimeout(() => {
                if (this.previewAudio) {
                    this.previewAudio.pause();
                    this.previewAudio = null;
                    this.showPreviewStatus('预览完成', 'success');
                }
            }, 3000);
            
        } catch (error) {
            console.error('预览音效失败:', error);
            this.showPreviewError('预览失败');
        }
    }

    /**
     * 显示音量控制器
     * @param {string} soundKey - 音效键名
     */
    showVolumeControl(soundKey) {
        // 移除现有的音量控制器
        this.hideVolumeControl();
        
        const control = document.createElement('div');
        control.className = 'volume-control-popup';
        control.id = 'sound-volume-control';
        
        const soundName = this.getSoundDisplayName(soundKey);
        const currentVolume = this.getSoundVolume(soundKey);
        
        control.innerHTML = `
            <div class="volume-control-header">
                <span class="volume-icon">🔊</span>
                <span class="volume-title">${soundName} 音量</span>
                <button class="volume-close">×</button>
            </div>
            <div class="volume-control-body">
                <div class="volume-slider-container">
                    <input type="range" 
                           class="volume-slider" 
                           min="0" 
                           max="100" 
                           value="${currentVolume}" 
                           data-sound="${soundKey}">
                    <div class="volume-value">${currentVolume}%</div>
                </div>
                <div class="volume-buttons">
                    <button class="volume-btn" data-volume="0">🔇 静音</button>
                    <button class="volume-btn" data-volume="50">🔉 中等</button>
                    <button class="volume-btn" data-volume="100">🔊 最大</button>
                </div>
            </div>
        `;
        
        // 绑定事件
        const slider = control.querySelector('.volume-slider');
        const valueDisplay = control.querySelector('.volume-value');
        const closeBtn = control.querySelector('.volume-close');
        const volumeBtns = control.querySelectorAll('.volume-btn');
        
        slider.addEventListener('input', (e) => {
            const volume = parseInt(e.target.value);
            valueDisplay.textContent = volume + '%';
            this.setSoundVolume(soundKey, volume);
        });
        
        closeBtn.addEventListener('click', () => {
            this.hideVolumeControl();
        });
        
        volumeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const volume = parseInt(btn.dataset.volume);
                slider.value = volume;
                valueDisplay.textContent = volume + '%';
                this.setSoundVolume(soundKey, volume);
            });
        });
        
        // 添加到页面
        document.body.appendChild(control);
        
        // 居中显示
        const rect = control.getBoundingClientRect();
        control.style.left = (window.innerWidth - rect.width) / 2 + 'px';
        control.style.top = (window.innerHeight - rect.height) / 2 + 'px';
        
        // 显示动画
        requestAnimationFrame(() => {
            control.classList.add('show');
        });
    }

    /**
     * 隐藏音量控制器
     */
    hideVolumeControl() {
        const control = document.getElementById('sound-volume-control');
        if (control) {
            control.remove();
        }
    }

    /**
     * 编辑音效（调用编辑处理器）
     * @param {string} soundKey - 音效键名
     */
    editSound(soundKey) {
        if (this.editClickHandler) {
            // 模拟编辑事件
            const event = { currentTarget: { dataset: { sound: soundKey } } };
            this.editClickHandler(event);
        }
    }

    /**
     * 重置音效为默认
     * @param {string} soundKey - 音效键名
     */
    resetSound(soundKey) {
        if (this.onSoundReset) {
            this.onSoundReset(soundKey);
        }
    }

    /**
     * 显示音效信息
     * @param {string} soundKey - 音效键名
     * @param {Object} soundConfig - 音效配置
     */
    showSoundInfo(soundKey, soundConfig) {
        const isCustom = this.isCustomSound(soundKey);
        const info = `
            名称：${soundConfig.name || soundKey}\n
            类型：${isCustom ? '自定义音频' : '默认音效'}\n
            格式：${soundConfig.type || 'HLS'}
        `;
        
        alert(info);
    }

    // 辅助方法
    
    /**
     * 获取音效显示名称
     */
    getSoundDisplayName(soundKey) {
        const config = this.getCurrentModeConfig();
        return config[soundKey]?.name || soundKey;
    }

    /**
     * 获取音效音量
     */
    getSoundVolume(soundKey) {
        // 这里可以从音频管理器获取，暂时返回默认值
        return 70;
    }

    /**
     * 设置音效音量
     */
    setSoundVolume(soundKey, volume) {
        // 这里应该调用音频管理器设置独立音量
        console.log(`设置 ${soundKey} 音量为 ${volume}%`);
    }

    /**
     * 显示预览状态
     */
    showPreviewStatus(message, type = 'info') {
        // 创建状态提示
        let status = document.getElementById('preview-status');
        if (!status) {
            status = document.createElement('div');
            status.id = 'preview-status';
            status.className = 'preview-status';
            document.body.appendChild(status);
        }
        
        status.textContent = message;
        status.className = `preview-status ${type}`;
        
        // 自动隐藏
        setTimeout(() => {
            if (status && status.parentElement) {
                status.remove();
            }
        }, 2000);
    }

    /**
     * 显示预览错误
     */
    showPreviewError(message) {
        this.showPreviewStatus(message, 'error');
    }

    /**
     * 显示空状态
     */
    showEmptyState() {
        this.container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎵</div>
                <div class="empty-text">暂无可用音效</div>
                <div class="empty-description">请检查配置或稍后重试</div>
            </div>
        `;
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 为所有音效按钮添加点击事件
        const buttons = this.container.querySelectorAll('.sound-btn');
        buttons.forEach(button => {
            button.addEventListener('click', this.handleButtonClick);
        });
    }

    /**
     * 处理按钮点击事件
     * @param {Event} event - 点击事件
     */
    handleButtonClick(event) {
        if (this.buttonClickHandler) {
            this.buttonClickHandler(event);
        } else {
            console.warn('未设置按钮点击处理器');
        }
    }

    /**
     * 处理编辑按钮点击事件
     * @param {Event} event - 点击事件
     */
    handleEditClick(event) {
        if (this.editClickHandler) {
            this.editClickHandler(event);
        } else {
            console.warn('未设置编辑按钮点击处理器');
        }
    }

    /**
     * 更新按钮状态
     * @param {Set} playingSounds - 正在播放的音效集合
     */
    updateButtonStates(playingSounds) {
        if (!this.container) return;

        const buttons = this.container.querySelectorAll('.sound-btn');
        buttons.forEach(button => {
            const soundName = button.dataset.sound;
            
            if (playingSounds.has(soundName)) {
                button.classList.add('active', 'playing');
            } else {
                button.classList.remove('active', 'playing');
            }
        });
    }

    /**
     * 更新自定义音效标识
     * @param {string} soundKey - 音效键名
     * @param {boolean} isCustom - 是否为自定义音效
     */
    updateCustomIndicator(soundKey, isCustom) {
        if (!this.container) return;

        const button = this.container.querySelector(`[data-sound="${soundKey}"]`);
        if (button) {
            if (isCustom) {
                button.classList.add('custom');
            } else {
                button.classList.remove('custom');
            }
        }
    }

    /**
     * 设置按钮加载状态
     * @param {string} soundKey - 音效键名
     * @param {string} state - 加载状态 ('loading', 'success', 'error', null)
     */
    setButtonLoadingState(soundKey, state) {
        if (!this.container) return;

        const button = this.container.querySelector(`[data-sound="${soundKey}"]`);
        if (button) {
            // 清除所有加载状态类
            button.classList.remove('loading', 'load-success', 'load-error');
            
            // 添加新状态类
            if (state) {
                button.classList.add(state === 'loading' ? 'loading' : `load-${state}`);
            }
        }
    }

    /**
     * 添加涟漪效果
     * @param {HTMLElement} element - 目标元素
     * @param {Event} event - 点击事件
     */
    addRippleEffect(element, event) {
        // 如果元素已有涟漪，先移除
        const existingRipple = element.querySelector('.ripple');
        if (existingRipple) {
            existingRipple.remove();
        }

        // 创建涟漪元素
        const ripple = document.createElement('span');
        ripple.className = 'ripple';

        // 计算涟漪位置
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        // 设置涟漪样式
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';

        // 添加到元素
        element.appendChild(ripple);

        // 动画结束后移除
        setTimeout(() => {
            if (ripple.parentElement) {
                ripple.remove();
            }
        }, 600);
    }

    /**
     * 重新生成指定音效的按钮
     * @param {string} soundKey - 音效键名
     */
    regenerateButton(soundKey) {
        if (!this.container) return;

        const existingButton = this.container.querySelector(`[data-sound="${soundKey}"]`);
        if (existingButton) {
            const config = this.getCurrentModeConfig();
            const soundConfig = config[soundKey];
            
            if (soundConfig) {
                const newButton = this.createSoundButton(soundKey, soundConfig);
                this.container.replaceChild(newButton, existingButton);
                
                // 重新绑定事件
                newButton.addEventListener('click', this.handleButtonClick);
                
                console.log(`已重新生成按钮: ${soundKey}`);
            }
        }
    }

    /**
     * 获取所有按钮元素
     * @returns {NodeList} 按钮元素列表
     */
    getAllButtons() {
        if (!this.container) return [];
        return this.container.querySelectorAll('.sound-btn');
    }

    /**
     * 获取指定音效的按钮元素
     * @param {string} soundKey - 音效键名
     * @returns {HTMLElement|null} 按钮元素
     */
    getButton(soundKey) {
        if (!this.container) return null;
        return this.container.querySelector(`[data-sound="${soundKey}"]`);
    }

    /**
     * 动画切换到新模式
     * @param {string} newMode - 新模式
     * @param {Function} callback - 切换完成回调
     */
    animatedSwitchMode(newMode, callback) {
        if (!this.container) {
            if (callback) callback();
            return;
        }

        // 淡出当前按钮
        this.container.style.transition = 'opacity 0.3s ease-out';
        this.container.style.opacity = '0';

        setTimeout(() => {
            // 更新模式并重新生成按钮
            this.setCurrentMode(newMode);
            this.generateButtons();

            // 淡入新按钮
            setTimeout(() => {
                this.container.style.opacity = '1';
                
                setTimeout(() => {
                    this.container.style.transition = '';
                    if (callback) callback();
                }, 300);
            }, 50);
        }, 300);
    }

    /**
     * 带确认对话框的重置音效功能
     * @param {string} soundKey - 音效键名
     */
    resetSoundWithConfirmation(soundKey) {
        const soundConfig = this.getCurrentModeConfig()[soundKey];
        const soundName = soundConfig ? soundConfig.name : soundKey;
        
        // 创建确认对话框
        const modal = document.createElement('div');
        modal.className = 'confirmation-modal';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>确认重置</h3>
                </div>
                <div class="modal-body">
                    <p>确定要将「${soundName}」重置为默认音效吗？</p>
                    <p class="warning-text">此操作将删除您上传的自定义音频，且无法撤销。</p>
                </div>
                <div class="modal-actions">
                    <button class="btn-cancel" type="button">取消</button>
                    <button class="btn-confirm dangerous" type="button">确认重置</button>
                </div>
            </div>
        `;
        
        // 事件处理
        const closeModal = () => {
            modal.remove();
        };
        
        const cancelBtn = modal.querySelector('.btn-cancel');
        const confirmBtn = modal.querySelector('.btn-confirm');
        const backdrop = modal.querySelector('.modal-backdrop');
        
        // 默认焦点在取消按钮上（安全选择）
        setTimeout(() => {
            cancelBtn.focus();
        }, 100);
        
        // 事件监听
        cancelBtn.addEventListener('click', closeModal);
        backdrop.addEventListener('click', closeModal);
        
        confirmBtn.addEventListener('click', () => {
            // 执行实际的重置操作
            this.resetSound(soundKey);
            closeModal();
        });
        
        // 键盘事件
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        });
        
        // 添加到页面
        document.body.appendChild(modal);
        
        // 添加显示动画
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }

    /**
     * 销毁生成器
     */
    destroy() {
        // 移除事件监听器
        if (this.container) {
            const buttons = this.container.querySelectorAll('.sound-btn');
            buttons.forEach(button => {
                button.removeEventListener('click', this.handleButtonClick);
            });
            
            const editButtons = this.container.querySelectorAll('.edit-btn');
            editButtons.forEach(btn => {
                btn.removeEventListener('click', this.handleEditClick);
            });
        }

        // 清理引用
        this.container = null;
        this.buttonClickHandler = null;
        this.editClickHandler = null;
        this.customSounds = {};
        
        console.log('SoundButtonGenerator 已销毁');
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoundButtonGenerator;
} else {
    window.SoundButtonGenerator = SoundButtonGenerator;
}