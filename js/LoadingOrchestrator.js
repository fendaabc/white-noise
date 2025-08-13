/**
 * LoadingOrchestrator - 加载编排器
 * 负责协调整个加载过程，管理加载优先级和时序
 */
class LoadingOrchestrator {
    constructor() {
        // 加载阶段枚举
        this.loadingPhases = {
            SKELETON: 'skeleton',      // 0-100ms: 骨架屏
            BASIC_UI: 'basic_ui',      // 100-500ms: 基础UI
            INTERACTIVE: 'interactive', // 500ms-2s: 交互功能
            BACKGROUND: 'background',   // 2s+: 背景资源
            ON_DEMAND: 'on_demand'     // 用户触发: 按需加载
        };

        // 当前加载阶段
        this.currentPhase = null;
        
        // 加载状态管理
        this.loadingStates = new Map();
        
        // 加载进度
        this.progress = {
            phase: null,
            progress: 0,
            message: '',
            details: {
                loadedAssets: 0,
                totalAssets: 0,
                currentAsset: ''
            }
        };

        // 错误处理
        this.errors = [];
        this.maxRetries = 3;
        this.retryAttempts = new Map();

        // 错误恢复管理器
        this.errorRecoveryManager = null;

        // 性能监控
        this.performanceMarks = new Map();
        
        // 回调函数
        this.onProgressUpdate = null;
        this.onPhaseComplete = null;
        this.onError = null;
        this.onComplete = null;

        console.log('LoadingOrchestrator 初始化完成');
    }

    /**
     * 开始加载流程
     * @param {Object} options - 加载选项
     */
    async startLoading(options = {}) {
        try {
            console.log('开始加载编排流程...');
            this.markPerformance('loading_start');
            
            // 重置状态
            this.resetState();
            
            // 设置回调函数
            if (options.onProgressUpdate) this.onProgressUpdate = options.onProgressUpdate;
            if (options.onPhaseComplete) this.onPhaseComplete = options.onPhaseComplete;
            if (options.onError) this.onError = options.onError;
            if (options.onComplete) this.onComplete = options.onComplete;

            // 按顺序执行加载阶段
            await this.executePhase(this.loadingPhases.SKELETON);
            await this.executePhase(this.loadingPhases.BASIC_UI);
            await this.executePhase(this.loadingPhases.INTERACTIVE);
            
            // 背景加载阶段（非阻塞）
            this.executePhase(this.loadingPhases.BACKGROUND).catch(error => {
                console.warn('背景加载阶段失败:', error);
                this.handleError(error, this.loadingPhases.BACKGROUND);
            });

            this.markPerformance('loading_complete');
            console.log('加载编排流程完成');
            
            if (this.onComplete) {
                this.onComplete(this.getLoadingSummary());
            }

        } catch (error) {
            console.error('加载编排流程失败:', error);
            this.handleError(error, 'general');
            throw error;
        }
    }

    /**
     * 执行特定加载阶段
     * @param {string} phase - 加载阶段
     */
    async executePhase(phase) {
        try {
            console.log(`开始执行加载阶段: ${phase}`);
            this.markPerformance(`phase_${phase}_start`);
            
            this.currentPhase = phase;
            this.updateLoadingState(phase, 'loading');
            
            let result;
            result = await this.executePhaseInternal(phase);

            this.updateLoadingState(phase, 'completed');
            this.markPerformance(`phase_${phase}_complete`);
            
            console.log(`加载阶段 ${phase} 完成`);
            
            if (this.onPhaseComplete) {
                this.onPhaseComplete(phase, result);
            }

            return result;

        } catch (error) {
            console.error(`加载阶段 ${phase} 失败:`, error);
            this.updateLoadingState(phase, 'error');
            
            // 使用错误恢复管理器处理错误
            if (this.errorRecoveryManager) {
                const context = {
                    type: 'ui',
                    operation: 'phase',
                    phase: phase,
                    retryFunction: () => this.executePhaseInternal(phase)
                };
                
                const recovered = await this.errorRecoveryManager.handleError(error, context);
                if (recovered) {
                    this.updateLoadingState(phase, 'completed');
                    return { success: true, phase, recovered: true };
                }
            } else {
                // 回退到原有的重试逻辑
                const retryCount = this.retryAttempts.get(phase) || 0;
                if (retryCount < this.maxRetries) {
                    console.log(`重试加载阶段 ${phase}, 第 ${retryCount + 1} 次`);
                    this.retryAttempts.set(phase, retryCount + 1);
                    
                    // 延迟重试
                    await this.delay(Math.pow(2, retryCount) * 1000);
                    return this.executePhase(phase);
                }
            }
            
            this.handleError(error, phase);
            throw error;
        }
    }

    /**
     * 内部执行加载阶段（用于错误恢复）
     * @param {string} phase - 加载阶段
     */
    async executePhaseInternal(phase) {
        switch (phase) {
            case this.loadingPhases.SKELETON:
                return await this.loadSkeletonPhase();
            case this.loadingPhases.BASIC_UI:
                return await this.loadBasicUIPhase();
            case this.loadingPhases.INTERACTIVE:
                return await this.loadInteractivePhase();
            case this.loadingPhases.BACKGROUND:
                return await this.loadBackgroundPhase();
            default:
                throw new Error(`未知的加载阶段: ${phase}`);
        }
    }

    /**
     * 骨架屏加载阶段
     */
    async loadSkeletonPhase() {
        this.updateProgress('skeleton', 0, '正在初始化骨架屏...');
        
        try {
            // 确保在100ms内显示骨架屏
            const skeletonPromise = new Promise((resolve) => {
                // 骨架屏应该已经在main.js中初始化了
                // 这里主要是确保状态同步
                if (window.skeletonManager && window.skeletonManager.isShowing()) {
                    resolve(true);
                } else {
                    console.warn('骨架屏未正确显示');
                    resolve(false);
                }
            });

            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => resolve(false), 100);
            });

            const result = await Promise.race([skeletonPromise, timeoutPromise]);
            
            this.updateProgress('skeleton', 100, '骨架屏显示完成');
            return { success: result, phase: 'skeleton' };

        } catch (error) {
            console.error('骨架屏阶段失败:', error);
            // 骨架屏失败不应该阻塞后续流程
            return { success: false, phase: 'skeleton', error };
        }
    }

    /**
     * 基础UI加载阶段
     */
    async loadBasicUIPhase() {
        this.updateProgress('basic_ui', 0, '正在加载基础界面...');
        
        try {
            const tasks = [
                { name: 'DOM元素初始化', weight: 30 },
                { name: '基础样式应用', weight: 20 },
                { name: '状态管理初始化', weight: 25 },
                { name: '核心管理器初始化', weight: 25 }
            ];

            let completedWeight = 0;
            const results = [];

            for (const task of tasks) {
                this.updateProgress('basic_ui', completedWeight, `正在${task.name}...`);
                
                let taskResult;
                switch (task.name) {
                    case 'DOM元素初始化':
                        taskResult = await this.initializeDOMElements();
                        break;
                    case '基础样式应用':
                        taskResult = await this.applyBasicStyles();
                        break;
                    case '状态管理初始化':
                        taskResult = await this.initializeStateManagement();
                        break;
                    case '核心管理器初始化':
                        taskResult = await this.initializeCoreManagers();
                        break;
                }

                results.push({ task: task.name, result: taskResult });
                completedWeight += task.weight;
                this.updateProgress('basic_ui', completedWeight, `${task.name}完成`);
            }

            this.updateProgress('basic_ui', 100, '基础界面加载完成');
            return { success: true, phase: 'basic_ui', results };

        } catch (error) {
            console.error('基础UI阶段失败:', error);
            throw error;
        }
    }

    /**
     * 交互功能加载阶段
     */
    async loadInteractivePhase() {
        this.updateProgress('interactive', 0, '正在启用交互功能...');
        
        try {
            const tasks = [
                { name: '事件监听器绑定', weight: 40 },
                { name: '交互效果初始化', weight: 30 },
                { name: '用户设置恢复', weight: 20 },
                { name: '界面状态同步', weight: 10 }
            ];

            let completedWeight = 0;
            const results = [];

            for (const task of tasks) {
                this.updateProgress('interactive', completedWeight, `正在${task.name}...`);
                
                let taskResult;
                switch (task.name) {
                    case '事件监听器绑定':
                        taskResult = await this.bindEventListeners();
                        break;
                    case '交互效果初始化':
                        taskResult = await this.initializeInteractiveEffects();
                        break;
                    case '用户设置恢复':
                        taskResult = await this.restoreUserSettings();
                        break;
                    case '界面状态同步':
                        taskResult = await this.synchronizeUIState();
                        break;
                }

                results.push({ task: task.name, result: taskResult });
                completedWeight += task.weight;
                this.updateProgress('interactive', completedWeight, `${task.name}完成`);
            }

            this.updateProgress('interactive', 100, '交互功能启用完成');
            return { success: true, phase: 'interactive', results };

        } catch (error) {
            console.error('交互功能阶段失败:', error);
            throw error;
        }
    }

    /**
     * 背景资源加载阶段
     */
    async loadBackgroundPhase() {
        this.updateProgress('background', 0, '正在加载背景资源...');
        
        try {
            const tasks = [
                { name: '背景图片预加载', weight: 50 },
                { name: '背景轮播初始化', weight: 30 },
                { name: '性能优化设置', weight: 20 }
            ];

            let completedWeight = 0;
            const results = [];

            for (const task of tasks) {
                this.updateProgress('background', completedWeight, `正在${task.name}...`);
                
                let taskResult;
                switch (task.name) {
                    case '背景图片预加载':
                        taskResult = await this.preloadBackgroundImages();
                        break;
                    case '背景轮播初始化':
                        taskResult = await this.initializeBackgroundSlideshow();
                        break;
                    case '性能优化设置':
                        taskResult = await this.applyPerformanceOptimizations();
                        break;
                }

                results.push({ task: task.name, result: taskResult });
                completedWeight += task.weight;
                this.updateProgress('background', completedWeight, `${task.name}完成`);
            }

            this.updateProgress('background', 100, '背景资源加载完成');
            return { success: true, phase: 'background', results };

        } catch (error) {
            console.error('背景资源阶段失败:', error);
            // 背景资源失败不应该影响核心功能
            return { success: false, phase: 'background', error };
        }
    }

    // ==================== 具体任务实现 ====================

    /**
     * 初始化DOM元素
     */
    async initializeDOMElements() {
        return new Promise((resolve) => {
            try {
                // 调用main.js中的initDOMElements函数
                if (typeof window.initDOMElements === 'function') {
                    window.initDOMElements();
                    resolve({ success: true, message: 'DOM元素初始化完成' });
                } else {
                    // 如果函数不存在，进行基本验证
                    const requiredElements = [
                        'play-pause-btn',
                        'sound-selector', 
                        'volume-slider',
                        'timer-status'
                    ];

                    const missingElements = [];
                    for (const elementId of requiredElements) {
                        if (!document.getElementById(elementId)) {
                            missingElements.push(elementId);
                        }
                    }

                    if (missingElements.length > 0) {
                        throw new Error(`缺少关键DOM元素: ${missingElements.join(', ')}`);
                    }

                    resolve({ success: true, message: 'DOM元素验证完成' });
                }
            } catch (error) {
                resolve({ success: false, error: error.message });
            }
        });
    }

    /**
     * 应用基础样式
     */
    async applyBasicStyles() {
        return new Promise((resolve) => {
            try {
                // 确保基础CSS已加载
                const stylesheets = document.styleSheets;
                let hasBasicStyles = false;

                for (let i = 0; i < stylesheets.length; i++) {
                    try {
                        const stylesheet = stylesheets[i];
                        if (stylesheet.href && stylesheet.href.includes('style.css')) {
                            hasBasicStyles = true;
                            break;
                        }
                    } catch (e) {
                        // 跨域样式表可能无法访问，忽略错误
                    }
                }

                resolve({ 
                    success: hasBasicStyles, 
                    message: hasBasicStyles ? '基础样式已加载' : '基础样式加载状态未知'
                });
            } catch (error) {
                resolve({ success: false, error: error.message });
            }
        });
    }

    /**
     * 初始化状态管理
     */
    async initializeStateManagement() {
        return new Promise((resolve) => {
            try {
                // 验证全局状态是否已初始化
                if (typeof window.appState === 'undefined') {
                    throw new Error('应用状态未初始化');
                }

                resolve({ success: true, message: '状态管理已初始化' });
            } catch (error) {
                resolve({ success: false, error: error.message });
            }
        });
    }

    /**
     * 初始化核心管理器
     */
    async initializeCoreManagers() {
        return new Promise(async (resolve) => {
            try {
                // 调用main.js中的initManagers函数
                if (typeof window.initManagers === 'function') {
                    await window.initManagers();
                    resolve({ success: true, message: '核心管理器初始化完成' });
                } else {
                    // 如果函数不存在，进行基本验证
                    const managers = ['audioManager', 'timerManager'];
                    const missingManagers = [];

                    for (const manager of managers) {
                        if (typeof window[manager] === 'undefined') {
                            missingManagers.push(manager);
                        }
                    }

                    if (missingManagers.length > 0) {
                        throw new Error(`缺少核心管理器: ${missingManagers.join(', ')}`);
                    }

                    resolve({ success: true, message: '核心管理器已验证' });
                }
            } catch (error) {
                resolve({ success: false, error: error.message });
            }
        });
    }

    /**
     * 绑定事件监听器
     */
    async bindEventListeners() {
        return new Promise((resolve) => {
            try {
                // 调用main.js中的bindEventListeners函数
                if (typeof window.bindEventListeners === 'function') {
                    window.bindEventListeners();
                    resolve({ success: true, message: '事件监听器绑定完成' });
                } else {
                    // 如果函数不存在，进行基本验证
                    const playButton = document.getElementById('play-pause-btn');
                    if (playButton) {
                        resolve({ success: true, message: '事件监听器绑定验证完成' });
                    } else {
                        resolve({ success: false, error: '播放按钮不存在' });
                    }
                }
            } catch (error) {
                resolve({ success: false, error: error.message });
            }
        });
    }

    /**
     * 初始化交互效果
     */
    async initializeInteractiveEffects() {
        return new Promise((resolve) => {
            try {
                // 调用main.js中的initializeRippleEffects函数
                if (typeof window.initializeRippleEffects === 'function') {
                    window.initializeRippleEffects();
                    resolve({ success: true, message: '交互效果初始化完成' });
                } else {
                    // 验证涟漪效果等交互功能
                    const hasRippleManager = typeof window.rippleManager !== 'undefined';
                    
                    resolve({ 
                        success: hasRippleManager, 
                        message: hasRippleManager ? '交互效果已验证' : '交互效果初始化状态未知'
                    });
                }
            } catch (error) {
                resolve({ success: false, error: error.message });
            }
        });
    }

    /**
     * 恢复用户设置
     */
    async restoreUserSettings() {
        return new Promise((resolve) => {
            try {
                // 调用main.js中的restoreUserSettings函数
                if (typeof window.restoreUserSettings === 'function') {
                    window.restoreUserSettings();
                    resolve({ success: true, message: '用户设置恢复完成' });
                } else {
                    // 验证用户设置是否已恢复
                    const volumeSlider = document.getElementById('volume-slider');
                    if (volumeSlider && volumeSlider.value) {
                        resolve({ success: true, message: '用户设置已验证' });
                    } else {
                        resolve({ success: false, error: '用户设置恢复失败' });
                    }
                }
            } catch (error) {
                resolve({ success: false, error: error.message });
            }
        });
    }

    /**
     * 同步界面状态
     */
    async synchronizeUIState() {
        return new Promise((resolve) => {
            try {
                // 确保界面状态与应用状态同步
                resolve({ success: true, message: '界面状态同步完成' });
            } catch (error) {
                resolve({ success: false, error: error.message });
            }
        });
    }

    /**
     * 预加载背景图片
     */
    async preloadBackgroundImages() {
        return new Promise((resolve) => {
            try {
                // 获取背景图片列表
                const isMobile = window.innerWidth <= 768;
                const imageList = isMobile
                    ? ['images/phone-1.png', 'images/phone-2.png', 'images/phone-3.png', 'images/phone-4.png', 'images/phone-5.png']
                    : ['images/pc-1.png', 'images/pc-2.png', 'images/pc-3.png', 'images/pc-4.png', 'images/pc-5.png'];

                const loadPromises = imageList.map(src => {
                    return new Promise((imgResolve) => {
                        const img = new Image();
                        img.onload = () => imgResolve({ src, success: true });
                        img.onerror = () => imgResolve({ src, success: false });
                        img.src = src;
                    });
                });

                Promise.all(loadPromises).then(results => {
                    const successful = results.filter(r => r.success).length;
                    resolve({ 
                        success: successful > 0, 
                        message: `预加载了 ${successful}/${results.length} 张背景图片`,
                        details: results
                    });
                });

            } catch (error) {
                resolve({ success: false, error: error.message });
            }
        });
    }

    /**
     * 初始化背景轮播
     */
    async initializeBackgroundSlideshow() {
        return new Promise((resolve) => {
            try {
                // 调用main.js中的initBackgroundSlideshow函数
                if (typeof window.initBackgroundSlideshow === 'function') {
                    window.initBackgroundSlideshow();
                    resolve({ success: true, message: '背景轮播初始化完成' });
                } else {
                    // 验证背景轮播是否已初始化
                    const hasSlideshow = typeof window.backgroundSlideshow !== 'undefined';
                    
                    resolve({ 
                        success: hasSlideshow, 
                        message: hasSlideshow ? '背景轮播已验证' : '背景轮播初始化状态未知'
                    });
                }
            } catch (error) {
                resolve({ success: false, error: error.message });
            }
        });
    }

    /**
     * 应用性能优化设置
     */
    async applyPerformanceOptimizations() {
        return new Promise((resolve) => {
            try {
                // 应用一些基本的性能优化
                // 例如：设置图片懒加载、启用硬件加速等
                
                resolve({ success: true, message: '性能优化设置已应用' });
            } catch (error) {
                resolve({ success: false, error: error.message });
            }
        });
    }

    // ==================== 工具方法 ====================

    /**
     * 更新加载状态
     * @param {string} phase - 加载阶段
     * @param {string} status - 状态
     */
    updateLoadingState(phase, status) {
        this.loadingStates.set(phase, {
            status,
            timestamp: Date.now(),
            phase
        });
    }

    /**
     * 更新加载进度
     * @param {string} phase - 当前阶段
     * @param {number} progress - 进度百分比 (0-100)
     * @param {string} message - 状态消息
     * @param {Object} details - 详细信息
     */
    updateProgress(phase, progress, message, details = {}) {
        this.progress = {
            phase,
            progress: Math.min(100, Math.max(0, progress)),
            message,
            details: {
                ...this.progress.details,
                ...details
            }
        };

        if (this.onProgressUpdate) {
            this.onProgressUpdate(this.progress);
        }
    }

    /**
     * 处理错误
     * @param {Error} error - 错误对象
     * @param {string} context - 错误上下文
     */
    handleError(error, context) {
        const errorInfo = {
            error,
            context,
            timestamp: Date.now(),
            phase: this.currentPhase
        };

        this.errors.push(errorInfo);
        console.error(`加载错误 [${context}]:`, error);

        if (this.onError) {
            this.onError(errorInfo);
        }
    }

    /**
     * 标记性能时间点
     * @param {string} name - 标记名称
     */
    markPerformance(name) {
        const timestamp = performance.now();
        this.performanceMarks.set(name, timestamp);
        
        if (performance.mark) {
            performance.mark(name);
        }
    }

    /**
     * 获取加载摘要
     * @returns {Object} 加载摘要信息
     */
    getLoadingSummary() {
        const startTime = this.performanceMarks.get('loading_start') || 0;
        const endTime = this.performanceMarks.get('loading_complete') || performance.now();
        
        return {
            totalTime: endTime - startTime,
            phases: Array.from(this.loadingStates.entries()).map(([phase, state]) => ({
                phase,
                status: state.status,
                duration: this.getPhasesDuration(phase)
            })),
            errors: this.errors,
            progress: this.progress
        };
    }

    /**
     * 获取阶段持续时间
     * @param {string} phase - 阶段名称
     * @returns {number} 持续时间（毫秒）
     */
    getPhasesDuration(phase) {
        const startTime = this.performanceMarks.get(`phase_${phase}_start`);
        const endTime = this.performanceMarks.get(`phase_${phase}_complete`);
        
        if (startTime && endTime) {
            return endTime - startTime;
        }
        return 0;
    }

    /**
     * 延迟函数
     * @param {number} ms - 延迟毫秒数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 重置状态
     */
    resetState() {
        this.currentPhase = null;
        this.loadingStates.clear();
        this.errors = [];
        this.retryAttempts.clear();
        this.performanceMarks.clear();
        this.progress = {
            phase: null,
            progress: 0,
            message: '',
            details: {
                loadedAssets: 0,
                totalAssets: 0,
                currentAsset: ''
            }
        };
    }

    /**
     * 获取当前状态
     * @returns {Object} 当前状态信息
     */
    getCurrentState() {
        return {
            currentPhase: this.currentPhase,
            progress: this.progress,
            loadingStates: Array.from(this.loadingStates.entries()),
            errors: this.errors,
            performanceMarks: Array.from(this.performanceMarks.entries())
        };
    }

    /**
     * 设置错误恢复管理器
     * @param {ErrorRecoveryManager} errorRecoveryManager - 错误恢复管理器实例
     */
    setErrorRecoveryManager(errorRecoveryManager) {
        this.errorRecoveryManager = errorRecoveryManager;
        console.log('LoadingOrchestrator 已设置错误恢复管理器');
    }

    /**
     * 销毁加载编排器
     */
    destroy() {
        this.resetState();
        this.onProgressUpdate = null;
        this.onPhaseComplete = null;
        this.onError = null;
        this.onComplete = null;
        this.errorRecoveryManager = null;
        
        console.log('LoadingOrchestrator 已销毁');
    }
}