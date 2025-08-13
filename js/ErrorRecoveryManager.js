/**
 * ErrorRecoveryManager - 错误恢复管理器
 * 处理各种加载错误，实现重试机制和降级策略
 */
class ErrorRecoveryManager {
    constructor() {
        // 重试策略配置
        this.retryStrategies = {
            'network': { 
                maxRetries: 3, 
                backoff: 'exponential',
                baseDelay: 1000,
                maxDelay: 10000
            },
            'audio': { 
                maxRetries: 2, 
                backoff: 'linear',
                baseDelay: 2000,
                maxDelay: 8000
            },
            'ui': { 
                maxRetries: 1, 
                backoff: 'immediate',
                baseDelay: 0,
                maxDelay: 0
            },
            'skeleton': {
                maxRetries: 0, // 骨架屏失败不重试，直接降级
                backoff: 'immediate',
                baseDelay: 0,
                maxDelay: 0
            }
        };

        // 错误类型映射
        this.errorTypeMap = {
            'TypeError': 'ui',
            'NetworkError': 'network',
            'TimeoutError': 'network',
            'AudioError': 'audio',
            'DecodeError': 'audio',
            'SkeletonError': 'skeleton'
        };

        // 错误记录
        this.errorHistory = [];
        this.retryAttempts = new Map();
        this.fallbackStates = new Map();

        // 网络状态监控
        this.isOnline = navigator.onLine;
        this.networkQuality = 'unknown';

        // 回调函数
        this.onError = null;
        this.onRetry = null;
        this.onFallback = null;
        this.onRecovery = null;

        // 初始化网络监控
        this.initNetworkMonitoring();

        console.log('ErrorRecoveryManager 初始化完成');
    }

    /**
     * 初始化网络状态监控
     */
    initNetworkMonitoring() {
        // 监听网络状态变化
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('网络连接已恢复');
            this.handleNetworkRecovery();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('网络连接已断开');
            this.handleNetworkDisconnection();
        });

        // 检测网络质量
        this.detectNetworkQuality();
    }

    /**
     * 检测网络质量
     */
    async detectNetworkQuality() {
        try {
            if ('connection' in navigator) {
                const connection = navigator.connection;
                this.networkQuality = this.classifyConnection(connection);
                console.log(`网络质量: ${this.networkQuality}`);
            } else {
                // 通过测试请求检测网络质量
                const startTime = performance.now();
                await fetch('data:text/plain,test', { method: 'HEAD' });
                const endTime = performance.now();
                
                const latency = endTime - startTime;
                this.networkQuality = latency < 100 ? 'good' : latency < 300 ? 'fair' : 'poor';
            }
        } catch (error) {
            this.networkQuality = 'poor';
            console.warn('网络质量检测失败:', error);
        }
    }

    /**
     * 分类网络连接质量
     * @param {NetworkInformation} connection - 网络连接信息
     * @returns {string} 网络质量等级
     */
    classifyConnection(connection) {
        const effectiveType = connection.effectiveType;
        const downlink = connection.downlink;

        if (effectiveType === '4g' && downlink > 10) {
            return 'excellent';
        } else if (effectiveType === '4g' || (effectiveType === '3g' && downlink > 1.5)) {
            return 'good';
        } else if (effectiveType === '3g' || effectiveType === '2g') {
            return 'fair';
        } else {
            return 'poor';
        }
    }

    /**
     * 处理错误并尝试恢复
     * @param {Error} error - 错误对象
     * @param {Object} context - 错误上下文
     * @returns {Promise<boolean>} 是否成功恢复
     */
    async handleError(error, context) {
        try {
            console.log(`处理错误: ${error.message}`, context);

            // 记录错误
            const errorRecord = this.recordError(error, context);

            // 确定错误类型
            const errorType = this.determineErrorType(error, context);

            // 获取重试策略
            const strategy = this.retryStrategies[errorType];
            if (!strategy) {
                console.warn(`未知错误类型: ${errorType}`);
                return this.fallbackStrategy(error, context);
            }

            // 检查是否可以重试
            const retryKey = this.getRetryKey(context);
            const currentRetries = this.retryAttempts.get(retryKey) || 0;

            if (currentRetries >= strategy.maxRetries) {
                console.log(`已达到最大重试次数 (${strategy.maxRetries})，执行降级策略`);
                return this.fallbackStrategy(error, context);
            }

            // 执行重试
            return this.executeRetry(error, context, strategy, currentRetries);

        } catch (recoveryError) {
            console.error('错误恢复过程中发生异常:', recoveryError);
            return this.fallbackStrategy(error, context);
        }
    }

    /**
     * 记录错误信息
     * @param {Error} error - 错误对象
     * @param {Object} context - 错误上下文
     * @returns {Object} 错误记录
     */
    recordError(error, context) {
        const errorRecord = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            context: { ...context },
            networkState: {
                isOnline: this.isOnline,
                quality: this.networkQuality
            },
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        this.errorHistory.push(errorRecord);

        // 限制错误历史记录数量
        if (this.errorHistory.length > 100) {
            this.errorHistory = this.errorHistory.slice(-50);
        }

        // 触发错误回调
        if (this.onError) {
            this.onError(errorRecord);
        }

        return errorRecord;
    }

    /**
     * 确定错误类型
     * @param {Error} error - 错误对象
     * @param {Object} context - 错误上下文
     * @returns {string} 错误类型
     */
    determineErrorType(error, context) {
        // 根据上下文确定错误类型
        if (context.type) {
            return context.type;
        }

        // 根据错误名称确定类型
        if (this.errorTypeMap[error.name]) {
            return this.errorTypeMap[error.name];
        }

        // 根据错误消息确定类型
        const message = error.message.toLowerCase();
        if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
            return 'network';
        } else if (message.includes('audio') || message.includes('decode')) {
            return 'audio';
        } else if (message.includes('skeleton')) {
            return 'skeleton';
        } else {
            return 'ui';
        }
    }

    /**
     * 获取重试键
     * @param {Object} context - 错误上下文
     * @returns {string} 重试键
     */
    getRetryKey(context) {
        return `${context.type || 'unknown'}_${context.resource || context.phase || 'general'}`;
    }

    /**
     * 执行重试
     * @param {Error} error - 错误对象
     * @param {Object} context - 错误上下文
     * @param {Object} strategy - 重试策略
     * @param {number} currentRetries - 当前重试次数
     * @returns {Promise<boolean>} 重试是否成功
     */
    async executeRetry(error, context, strategy, currentRetries) {
        const retryKey = this.getRetryKey(context);
        const retryCount = currentRetries + 1;
        
        // 更新重试次数
        this.retryAttempts.set(retryKey, retryCount);

        console.log(`开始第 ${retryCount} 次重试: ${retryKey}`);

        // 触发重试回调
        if (this.onRetry) {
            this.onRetry({
                error,
                context,
                retryCount,
                maxRetries: strategy.maxRetries
            });
        }

        // 计算延迟时间
        const delay = this.calculateBackoffDelay(strategy.backoff, retryCount - 1, strategy);

        if (delay > 0) {
            console.log(`重试延迟: ${delay}ms`);
            await this.delay(delay);
        }

        try {
            // 执行重试操作
            const result = await this.performRetry(context);
            
            if (result.success) {
                console.log(`重试成功: ${retryKey}`);
                
                // 清除重试记录
                this.retryAttempts.delete(retryKey);
                
                // 触发恢复回调
                if (this.onRecovery) {
                    this.onRecovery({
                        context,
                        retryCount,
                        result
                    });
                }
                
                return true;
            } else {
                console.log(`重试失败: ${retryKey}`, result.error);
                
                // 递归重试
                return this.handleError(result.error || error, context);
            }

        } catch (retryError) {
            console.error(`重试执行失败: ${retryKey}`, retryError);
            
            // 递归重试
            return this.handleError(retryError, context);
        }
    }

    /**
     * 执行具体的重试操作
     * @param {Object} context - 错误上下文
     * @returns {Promise<Object>} 重试结果
     */
    async performRetry(context) {
        try {
            switch (context.type) {
                case 'network':
                    return this.retryNetworkOperation(context);
                
                case 'audio':
                    return this.retryAudioOperation(context);
                
                case 'ui':
                    return this.retryUIOperation(context);
                
                case 'skeleton':
                    return this.retrySkeletonOperation(context);
                
                default:
                    return this.retryGenericOperation(context);
            }
        } catch (error) {
            return { success: false, error };
        }
    }

    /**
     * 重试网络操作
     * @param {Object} context - 错误上下文
     * @returns {Promise<Object>} 重试结果
     */
    async retryNetworkOperation(context) {
        // 检查网络状态
        if (!this.isOnline) {
            return { success: false, error: new Error('网络未连接') };
        }

        // 根据具体的网络操作类型进行重试
        if (context.operation === 'fetch' && context.url) {
            try {
                const response = await fetch(context.url, {
                    ...context.options,
                    cache: 'no-cache' // 避免缓存问题
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return { success: true, response };
            } catch (error) {
                return { success: false, error };
            }
        }

        return { success: false, error: new Error('未知的网络操作类型') };
    }

    /**
     * 重试音频操作
     * @param {Object} context - 错误上下文
     * @returns {Promise<Object>} 重试结果
     */
    async retryAudioOperation(context) {
        try {
            if (context.operation === 'load' && context.audioName && window.audioManager) {
                // 重新加载音频
                const config = window.audioManager.getSoundConfig ? 
                    window.audioManager.getSoundConfig(context.audioName) : 
                    context.audioConfig;
                
                if (!config) {
                    return { success: false, error: new Error('音频配置不存在') };
                }

                const result = await window.audioManager.loadSoundLazy(context.audioName, config);
                return { success: result };
                
            } else if (context.operation === 'play' && context.audioName && window.audioManager) {
                // 重新播放音频
                const result = await window.audioManager.playSound(context.audioName, context.volume);
                return { success: result };
            }

            return { success: false, error: new Error('未知的音频操作类型') };
        } catch (error) {
            return { success: false, error };
        }
    }

    /**
     * 重试UI操作
     * @param {Object} context - 错误上下文
     * @returns {Promise<Object>} 重试结果
     */
    async retryUIOperation(context) {
        try {
            if (context.operation === 'init' && context.component) {
                // 重新初始化UI组件
                const initFunction = window[`init${context.component}`];
                if (typeof initFunction === 'function') {
                    await initFunction();
                    return { success: true };
                }
            }

            return { success: false, error: new Error('未知的UI操作类型') };
        } catch (error) {
            return { success: false, error };
        }
    }

    /**
     * 重试骨架屏操作
     * @param {Object} context - 错误上下文
     * @returns {Promise<Object>} 重试结果
     */
    async retrySkeletonOperation(context) {
        // 骨架屏失败通常不重试，直接返回失败
        return { success: false, error: new Error('骨架屏操作不支持重试') };
    }

    /**
     * 重试通用操作
     * @param {Object} context - 错误上下文
     * @returns {Promise<Object>} 重试结果
     */
    async retryGenericOperation(context) {
        try {
            if (context.retryFunction && typeof context.retryFunction === 'function') {
                const result = await context.retryFunction();
                return { success: true, result };
            }

            return { success: false, error: new Error('没有可重试的操作') };
        } catch (error) {
            return { success: false, error };
        }
    }

    /**
     * 计算退避延迟时间
     * @param {string} backoffType - 退避类型
     * @param {number} retryCount - 重试次数
     * @param {Object} strategy - 重试策略
     * @returns {number} 延迟时间（毫秒）
     */
    calculateBackoffDelay(backoffType, retryCount, strategy) {
        const { baseDelay, maxDelay } = strategy;

        switch (backoffType) {
            case 'immediate':
                return 0;
            
            case 'linear':
                return Math.min(baseDelay * (retryCount + 1), maxDelay);
            
            case 'exponential':
                return Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
            
            default:
                return baseDelay;
        }
    }

    /**
     * 执行降级策略
     * @param {Error} error - 错误对象
     * @param {Object} context - 错误上下文
     * @returns {Promise<boolean>} 降级是否成功
     */
    async fallbackStrategy(error, context) {
        console.log(`执行降级策略: ${context.type || 'unknown'}`, error.message);

        const fallbackKey = this.getRetryKey(context);
        
        try {
            let fallbackResult;

            switch (context.type) {
                case 'skeleton':
                    fallbackResult = await this.fallbackSkeleton(context);
                    break;
                
                case 'audio':
                    fallbackResult = await this.fallbackAudio(context);
                    break;
                
                case 'network':
                    fallbackResult = await this.fallbackNetwork(context);
                    break;
                
                case 'ui':
                    fallbackResult = await this.fallbackUI(context);
                    break;
                
                default:
                    fallbackResult = await this.fallbackGeneric(context);
                    break;
            }

            // 记录降级状态
            this.fallbackStates.set(fallbackKey, {
                timestamp: Date.now(),
                context,
                result: fallbackResult
            });

            // 触发降级回调
            if (this.onFallback) {
                this.onFallback({
                    error,
                    context,
                    fallbackResult
                });
            }

            return fallbackResult.success || false;

        } catch (fallbackError) {
            console.error('降级策略执行失败:', fallbackError);
            return false;
        }
    }

    /**
     * 骨架屏降级策略
     * @param {Object} context - 错误上下文
     * @returns {Promise<Object>} 降级结果
     */
    async fallbackSkeleton(context) {
        try {
            // 显示简单的加载指示器替代骨架屏
            const loadingIndicator = document.getElementById('loading-indicator');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'flex';
                loadingIndicator.innerHTML = `
                    <div class="simple-loader">
                        <div class="loader-spinner"></div>
                        <div class="loader-text">正在加载...</div>
                    </div>
                `;
                
                return { success: true, message: '已降级到简单加载指示器' };
            }

            return { success: false, message: '无法显示降级加载指示器' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * 音频降级策略
     * @param {Object} context - 错误上下文
     * @returns {Promise<Object>} 降级结果
     */
    async fallbackAudio(context) {
        try {
            if (context.audioName) {
                // 禁用对应的音频按钮
                const button = document.querySelector(`[data-sound="${context.audioName}"]`);
                if (button) {
                    button.disabled = true;
                    button.classList.add('audio-error');
                    button.title = '音频加载失败';
                    
                    // 添加错误图标
                    const errorIcon = document.createElement('div');
                    errorIcon.className = 'audio-error-icon';
                    errorIcon.innerHTML = '⚠️';
                    button.appendChild(errorIcon);
                }

                return { success: true, message: `音频 ${context.audioName} 已禁用` };
            }

            return { success: false, message: '无法确定要降级的音频' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * 网络降级策略
     * @param {Object} context - 错误上下文
     * @returns {Promise<Object>} 降级结果
     */
    async fallbackNetwork(context) {
        try {
            // 显示离线提示
            this.showOfflineNotification();
            
            // 启用离线模式（如果支持）
            if (this.enableOfflineMode) {
                await this.enableOfflineMode();
            }

            return { success: true, message: '已切换到离线模式' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * UI降级策略
     * @param {Object} context - 错误上下文
     * @returns {Promise<Object>} 降级结果
     */
    async fallbackUI(context) {
        try {
            // 显示错误页面或基本功能界面
            const errorContainer = document.createElement('div');
            errorContainer.className = 'ui-fallback';
            errorContainer.innerHTML = `
                <div class="fallback-message">
                    <h3>界面加载遇到问题</h3>
                    <p>部分功能可能无法正常使用，但基本功能仍然可用。</p>
                    <button onclick="location.reload()" class="retry-button">重新加载页面</button>
                </div>
            `;

            document.body.appendChild(errorContainer);

            return { success: true, message: '已显示UI降级界面' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * 通用降级策略
     * @param {Object} context - 错误上下文
     * @returns {Promise<Object>} 降级结果
     */
    async fallbackGeneric(context) {
        try {
            console.warn('执行通用降级策略');
            return { success: true, message: '已执行通用降级策略' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * 显示离线通知
     */
    showOfflineNotification() {
        const notification = document.createElement('div');
        notification.className = 'offline-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">📶</span>
                <span class="notification-text">网络连接不稳定，部分功能可能受限</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        document.body.appendChild(notification);

        // 自动隐藏通知
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * 处理网络恢复
     */
    handleNetworkRecovery() {
        // 清除离线通知
        const offlineNotifications = document.querySelectorAll('.offline-notification');
        offlineNotifications.forEach(notification => notification.remove());

        // 重新检测网络质量
        this.detectNetworkQuality();

        // 尝试恢复失败的操作
        this.attemptRecovery();
    }

    /**
     * 处理网络断开
     */
    handleNetworkDisconnection() {
        this.showOfflineNotification();
    }

    /**
     * 尝试恢复失败的操作
     */
    async attemptRecovery() {
        console.log('尝试恢复失败的操作...');

        // 获取最近的错误记录
        const recentErrors = this.errorHistory
            .filter(record => Date.now() - new Date(record.timestamp).getTime() < 60000) // 最近1分钟
            .filter(record => record.context.type === 'network');

        for (const errorRecord of recentErrors) {
            try {
                const result = await this.performRetry(errorRecord.context);
                if (result.success) {
                    console.log('恢复成功:', errorRecord.context);
                }
            } catch (error) {
                console.warn('恢复失败:', error);
            }
        }
    }

    /**
     * 延迟函数
     * @param {number} ms - 延迟毫秒数
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 获取错误统计信息
     * @returns {Object} 错误统计
     */
    getErrorStats() {
        const stats = {
            totalErrors: this.errorHistory.length,
            errorsByType: {},
            recentErrors: 0,
            activeRetries: this.retryAttempts.size,
            fallbacksActive: this.fallbackStates.size
        };

        // 统计错误类型
        this.errorHistory.forEach(record => {
            const type = record.context.type || 'unknown';
            stats.errorsByType[type] = (stats.errorsByType[type] || 0) + 1;
        });

        // 统计最近错误（最近5分钟）
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        stats.recentErrors = this.errorHistory.filter(record => 
            new Date(record.timestamp).getTime() > fiveMinutesAgo
        ).length;

        return stats;
    }

    /**
     * 清理过期的错误记录和重试状态
     */
    cleanup() {
        const oneHourAgo = Date.now() - 60 * 60 * 1000;

        // 清理过期的错误记录
        this.errorHistory = this.errorHistory.filter(record => 
            new Date(record.timestamp).getTime() > oneHourAgo
        );

        // 清理过期的降级状态
        for (const [key, state] of this.fallbackStates.entries()) {
            if (state.timestamp < oneHourAgo) {
                this.fallbackStates.delete(key);
            }
        }

        console.log('错误记录清理完成');
    }

    /**
     * 设置回调函数
     * @param {Object} callbacks - 回调函数对象
     */
    setCallbacks(callbacks) {
        if (callbacks.onError) this.onError = callbacks.onError;
        if (callbacks.onRetry) this.onRetry = callbacks.onRetry;
        if (callbacks.onFallback) this.onFallback = callbacks.onFallback;
        if (callbacks.onRecovery) this.onRecovery = callbacks.onRecovery;
    }

    /**
     * 销毁错误恢复管理器
     */
    destroy() {
        // 清理事件监听器
        window.removeEventListener('online', this.handleNetworkRecovery);
        window.removeEventListener('offline', this.handleNetworkDisconnection);

        // 清理数据
        this.errorHistory = [];
        this.retryAttempts.clear();
        this.fallbackStates.clear();

        // 清理回调
        this.onError = null;
        this.onRetry = null;
        this.onFallback = null;
        this.onRecovery = null;

        console.log('ErrorRecoveryManager 已销毁');
    }
}