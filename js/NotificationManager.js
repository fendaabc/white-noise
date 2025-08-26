/**
 * NotificationManager - 统一通知管理器
 * 处理错误提示、成功消息、警告信息等所有用户反馈
 */
class NotificationManager {
    constructor() {
        this.container = null;
        this.notifications = new Map();
        this.maxNotifications = 5;
        this.defaultDuration = 5000; // 5秒
        this.init();
        
        console.log('NotificationManager 初始化完成');
    }

    /**
     * 初始化通知管理器
     */
    init() {
        this.createContainer();
        this.bindGlobalErrorHandlers();
    }

    /**
     * 创建通知容器
     */
    createContainer() {
        // 检查是否已存在容器
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        this.container = container;
    }

    /**
     * 绑定全局错误处理器
     */
    bindGlobalErrorHandlers() {
        // 捕获未处理的JavaScript错误
        window.addEventListener('error', (event) => {
            // 过滤掉浏览器扩展错误
            if (event.message && (
                event.message.includes('runtime.lastError') ||
                event.message.includes('Extension context') ||
                event.filename && event.filename.includes('extension')
            )) {
                return;
            }

            // 只记录关键错误
            if (event.message && (
                event.message.includes('Audio') ||
                event.message.includes('播放') ||
                event.message.includes('上传') ||
                event.message.includes('配置') ||
                event.message.includes('模式')
            )) {
                this.showError(`系统错误: ${event.message}`, {
                    duration: 8000,
                    actions: [{
                        text: '重新加载',
                        action: () => window.location.reload()
                    }]
                });
            }
        });

        // 捕获未处理的Promise错误
        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason && event.reason.message && (
                event.reason.message.includes('runtime.lastError') ||
                event.reason.message.includes('Extension context')
            )) {
                return;
            }

            // 只处理与应用相关的错误
            if (event.reason && event.reason.message && (
                event.reason.message.includes('Audio') ||
                event.reason.message.includes('播放') ||
                event.reason.message.includes('上传') ||
                event.reason.message.includes('配置')
            )) {
                this.showError(`加载错误: ${event.reason.message}`, {
                    duration: 6000
                });
            }
        });
    }

    /**
     * 显示成功消息
     * @param {string} message - 消息内容
     * @param {Object} options - 选项
     */
    showSuccess(message, options = {}) {
        return this.showNotification(message, 'success', {
            icon: '✅',
            duration: 3000,
            ...options
        });
    }

    /**
     * 显示错误消息
     * @param {string} message - 消息内容
     * @param {Object} options - 选项
     */
    showError(message, options = {}) {
        return this.showNotification(message, 'error', {
            icon: '❌',
            duration: 6000,
            persistent: options.persistent || false,
            ...options
        });
    }

    /**
     * 显示警告消息
     * @param {string} message - 消息内容
     * @param {Object} options - 选项
     */
    showWarning(message, options = {}) {
        return this.showNotification(message, 'warning', {
            icon: '⚠️',
            duration: 4000,
            ...options
        });
    }

    /**
     * 显示信息消息
     * @param {string} message - 消息内容
     * @param {Object} options - 选项
     */
    showInfo(message, options = {}) {
        return this.showNotification(message, 'info', {
            icon: 'ℹ️',
            duration: 3000,
            ...options
        });
    }

    /**
     * 显示加载状态消息
     * @param {string} message - 消息内容
     * @param {Object} options - 选项
     */
    showLoading(message, options = {}) {
        return this.showNotification(message, 'loading', {
            icon: '⏳',
            persistent: true,
            showProgress: true,
            ...options
        });
    }

    /**
     * 显示通知
     * @param {string} message - 消息内容
     * @param {string} type - 通知类型
     * @param {Object} options - 选项
     */
    showNotification(message, type, options = {}) {
        const id = this.generateId();
        const notification = this.createNotificationElement(id, message, type, options);
        
        // 限制通知数量
        this.limitNotifications();
        
        // 添加到容器
        this.container.appendChild(notification);
        this.notifications.set(id, {
            element: notification,
            type: type,
            options: options,
            timestamp: Date.now()
        });

        // 显示动画
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // 自动隐藏（除非是持久化通知）
        if (!options.persistent) {
            const duration = options.duration || this.defaultDuration;
            setTimeout(() => {
                this.hideNotification(id);
            }, duration);
        }

        return id;
    }

    /**
     * 创建通知元素
     * @param {string} id - 通知ID
     * @param {string} message - 消息内容
     * @param {string} type - 通知类型
     * @param {Object} options - 选项
     */
    createNotificationElement(id, message, type, options) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.dataset.id = id;

        // 创建内容
        const content = document.createElement('div');
        content.className = 'notification-content';

        // 图标
        if (options.icon) {
            const icon = document.createElement('div');
            icon.className = 'notification-icon';
            icon.textContent = options.icon;
            content.appendChild(icon);
        }

        // 消息文本
        const messageEl = document.createElement('div');
        messageEl.className = 'notification-message';
        messageEl.textContent = message;
        content.appendChild(messageEl);

        notification.appendChild(content);

        // 进度条（加载状态）
        if (options.showProgress) {
            const progress = document.createElement('div');
            progress.className = 'notification-progress';
            const progressBar = document.createElement('div');
            progressBar.className = 'notification-progress-bar';
            progress.appendChild(progressBar);
            notification.appendChild(progress);
        }

        // 操作按钮
        if (options.actions && options.actions.length > 0) {
            const actions = document.createElement('div');
            actions.className = 'notification-actions';
            
            options.actions.forEach(actionConfig => {
                const button = document.createElement('button');
                button.className = 'notification-action-btn';
                button.textContent = actionConfig.text;
                button.addEventListener('click', () => {
                    if (actionConfig.action) {
                        actionConfig.action();
                    }
                    this.hideNotification(id);
                });
                actions.appendChild(button);
            });
            
            notification.appendChild(actions);
        }

        // 关闭按钮（非持久化通知）
        if (!options.persistent || options.actions) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'notification-close';
            closeBtn.innerHTML = '×';
            closeBtn.addEventListener('click', () => {
                this.hideNotification(id);
            });
            notification.appendChild(closeBtn);
        }

        return notification;
    }

    /**
     * 隐藏通知
     * @param {string} id - 通知ID
     */
    hideNotification(id) {
        const notificationData = this.notifications.get(id);
        if (!notificationData) return;

        const element = notificationData.element;
        element.classList.add('hide');
        
        // 等待动画完成后移除
        setTimeout(() => {
            if (element.parentElement) {
                element.parentElement.removeChild(element);
            }
            this.notifications.delete(id);
        }, 300);
    }

    /**
     * 更新通知内容
     * @param {string} id - 通知ID
     * @param {string} message - 新消息
     * @param {Object} options - 选项
     */
    updateNotification(id, message, options = {}) {
        const notificationData = this.notifications.get(id);
        if (!notificationData) return;

        const messageEl = notificationData.element.querySelector('.notification-message');
        if (messageEl) {
            messageEl.textContent = message;
        }

        // 更新进度
        if (options.progress !== undefined) {
            const progressBar = notificationData.element.querySelector('.notification-progress-bar');
            if (progressBar) {
                progressBar.style.width = `${options.progress}%`;
            }
        }

        // 更新图标
        if (options.icon) {
            const iconEl = notificationData.element.querySelector('.notification-icon');
            if (iconEl) {
                iconEl.textContent = options.icon;
            }
        }
    }

    /**
     * 清除所有通知
     */
    clearAll() {
        this.notifications.forEach((_, id) => {
            this.hideNotification(id);
        });
    }

    /**
     * 清除指定类型的通知
     * @param {string} type - 通知类型
     */
    clearByType(type) {
        this.notifications.forEach((notificationData, id) => {
            if (notificationData.type === type) {
                this.hideNotification(id);
            }
        });
    }

    /**
     * 限制通知数量
     */
    limitNotifications() {
        if (this.notifications.size >= this.maxNotifications) {
            // 移除最老的通知
            const oldestId = Array.from(this.notifications.keys())[0];
            this.hideNotification(oldestId);
        }
    }

    /**
     * 生成唯一ID
     */
    generateId() {
        return 'notification_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 显示文件上传错误
     * @param {string} fileName - 文件名
     * @param {string} reason - 错误原因
     */
    showFileUploadError(fileName, reason) {
        const message = `文件 "${fileName}" 上传失败: ${reason}`;
        return this.showError(message, {
            actions: [{
                text: '重新选择',
                action: () => {
                    // 触发文件选择器
                    const fileInput = document.querySelector('input[type="file"]');
                    if (fileInput) {
                        fileInput.click();
                    }
                }
            }]
        });
    }

    /**
     * 显示音频播放错误
     * @param {string} soundName - 音效名称
     * @param {string} reason - 错误原因
     */
    showAudioPlayError(soundName, reason) {
        const message = `音效 "${soundName}" 播放失败: ${reason}`;
        return this.showError(message, {
            duration: 4000,
            actions: [{
                text: '重试',
                action: () => {
                    // 触发重新播放
                    if (window.audioManager && window.audioManager.retryPlaySound) {
                        window.audioManager.retryPlaySound(soundName);
                    }
                }
            }]
        });
    }

    /**
     * 显示网络错误
     * @param {string} context - 错误上下文
     */
    showNetworkError(context = '') {
        const message = `网络连接异常${context ? ': ' + context : ''}`;
        return this.showError(message, {
            persistent: true,
            actions: [{
                text: '检查网络',
                action: () => {
                    // 测试网络连接
                    this.testNetworkConnection();
                }
            }, {
                text: '重新加载',
                action: () => window.location.reload()
            }]
        });
    }

    /**
     * 显示存储空间不足错误
     */
    showStorageFullError() {
        return this.showError('设备存储空间不足，无法保存更多音频文件', {
            persistent: true,
            actions: [{
                text: '清理存储',
                action: () => {
                    if (window.localStorageManager && window.localStorageManager.showStorageManager) {
                        window.localStorageManager.showStorageManager();
                    }
                }
            }]
        });
    }

    /**
     * 测试网络连接
     */
    async testNetworkConnection() {
        const loadingId = this.showLoading('正在检测网络连接...');
        
        try {
            const response = await fetch('/favicon.ico', { 
                method: 'HEAD',
                cache: 'no-cache'
            });
            
            this.hideNotification(loadingId);
            
            if (response.ok) {
                this.showSuccess('网络连接正常');
            } else {
                this.showWarning('网络连接不稳定');
            }
        } catch (error) {
            this.hideNotification(loadingId);
            this.showError('无法连接到服务器');
        }
    }

    /**
     * 销毁通知管理器
     */
    destroy() {
        this.clearAll();
        
        if (this.container && this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }
        
        this.notifications.clear();
        this.container = null;
        
        console.log('NotificationManager 已销毁');
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
} else {
    window.NotificationManager = NotificationManager;
}