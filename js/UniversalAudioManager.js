/**
 * UniversalAudioManager - 统一音频管理器
 * 支持HLS流媒体和标准音频文件的统一播放管理
 * 兼容现有HlsAudioManager接口，扩展自定义音频支持
 */
class UniversalAudioManager {
    constructor() {
        // 继承HlsAudioManager的核心功能
        this.audioElements = new Map(); // HTML5 Audio元素
        this.hlsPlayers = new Map(); // HLS播放器实例
        this.activeSources = new Map(); // 当前播放的音频源
        this.soundConfigs = new Map(); // 音频配置
        this.masterVolume = 0.7;
        this.isInitialized = false;
        this.loadingStates = new Map();
        this.crossOrigin = null;
        this.debug = false;
        
        // HLS支持
        this.hlsJsLoaded = false;
        this.hlsJsLoadPromise = null;
        
        // 新增：模式管理
        this.currentMode = 'normal'; // 'normal' | 'campus'
        this.modeConfigs = new Map(); // 不同模式的音效配置
        
        // 新增：自定义音频管理
        this.customSounds = new Map(); // 自定义音频配置
        this.standardAudioElements = new Map(); // 标准音频元素
        
        // 错误处理和回调
        this.onLoadingStateChange = null;
        this.onLoadingProgress = null;
        this.onLoadingError = null;
        this.errorRecoveryManager = null;
        
        console.log('UniversalAudioManager 构造函数完成');
    }

    /**
     * 初始化音频管理器
     */
    async init() {
        try {
            // 检查浏览器对HLS的支持
            const hlsSupport = this.checkHlsSupport();
            
            if (!hlsSupport.supported || !hlsSupport.canPlayHLS) {
                console.log('浏览器不支持原生HLS，将加载hls.js库');
                await this.loadHlsJs();
            }
            
            // 初始化默认模式配置
            this.initializeModeConfigs();
            
            this.isInitialized = true;
            console.log('UniversalAudioManager初始化成功');
        } catch (error) {
            console.error('UniversalAudioManager初始化失败:', error);
            throw error;
        }
    }

    /**
     * 初始化模式配置
     */
    initializeModeConfigs() {
        // 常规模式配置（现有配置）
        this.modeConfigs.set('normal', new Map());
        
        // 校园模式配置
        this.modeConfigs.set('campus', new Map());
    }

    /**
     * 设置当前模式
     * @param {string} mode - 模式名称 ('normal' | 'campus')
     */
    setCurrentMode(mode) {
        if (!this.modeConfigs.has(mode)) {
            console.warn(`未知模式: ${mode}`);
            return false;
        }
        
        const previousMode = this.currentMode;
        this.currentMode = mode;
        
        console.log(`模式切换: ${previousMode} -> ${mode}`);
        return true;
    }

    /**
     * 获取当前模式
     */
    getCurrentMode() {
        return this.currentMode;
    }

    /**
     * 设置指定模式的音频配置
     * @param {string} mode - 模式名称
     * @param {Object} configs - 音频配置对象
     */
    setModeConfigs(mode, configs) {
        if (!this.modeConfigs.has(mode)) {
            this.modeConfigs.set(mode, new Map());
        }
        
        const modeConfig = this.modeConfigs.get(mode);
        modeConfig.clear();
        
        Object.entries(configs).forEach(([name, config]) => {
            modeConfig.set(name, {
                ...config,
                type: config.type || 'hls' // 默认为HLS类型
            });
        });
        
        console.log(`${mode}模式音频配置已设置:`, Array.from(modeConfig.keys()));
    }

    /**
     * 设置音频配置（兼容原接口）
     * @param {Object} configs - 音频配置对象
     */
    setSoundConfigs(configs) {
        this.setModeConfigs('normal', configs);
        
        // 保持兼容性
        this.soundConfigs.clear();
        Object.entries(configs).forEach(([name, config]) => {
            this.soundConfigs.set(name, config);
        });
    }

    /**
     * 获取当前模式的音效信息
     * @param {string} soundName - 音效名称
     * @returns {Object|null} 音效配置信息
     */
    getSoundInfo(soundName) {
        // 首先检查是否有自定义音频
        if (this.customSounds.has(soundName)) {
            const customConfig = this.customSounds.get(soundName);
            if (customConfig.type === 'local') {
                return {
                    path: customConfig.path,
                    type: 'standard',
                    name: customConfig.fileName || soundName,
                    isCustom: true
                };
            }
        }

        // 获取当前模式的配置
        const currentModeConfig = this.modeConfigs.get(this.currentMode);
        if (currentModeConfig && currentModeConfig.has(soundName)) {
            return {
                ...currentModeConfig.get(soundName),
                isCustom: false
            };
        }

        // 回退到兼容配置
        if (this.soundConfigs.has(soundName)) {
            return {
                ...this.soundConfigs.get(soundName),
                type: 'hls',
                isCustom: false
            };
        }

        return null;
    }

    /**
     * 设置自定义音频
     * @param {string} soundName - 音效名称
     * @param {Object} config - 自定义音频配置
     */
    setCustomSound(soundName, config) {
        this.customSounds.set(soundName, config);
        console.log(`自定义音频已设置: ${soundName}`, config);
    }

    /**
     * 移除自定义音频
     * @param {string} soundName - 音效名称
     */
    removeCustomSound(soundName) {
        const result = this.customSounds.delete(soundName);
        if (result) {
            console.log(`自定义音频已移除: ${soundName}`);
        }
        return result;
    }

    /**
     * 检查是否为自定义音频
     * @param {string} soundName - 音效名称
     */
    isCustomSound(soundName) {
        return this.customSounds.has(soundName) && 
               this.customSounds.get(soundName).type === 'local';
    }

    /**
     * 播放音频（统一入口）
     * @param {string} soundName - 音效名称
     * @param {number} volume - 音量 (0-1)
     * @returns {Promise<boolean>} 播放是否成功
     */
    async playSound(soundName, volume = this.masterVolume) {
        try {
            const soundInfo = this.getSoundInfo(soundName);
            if (!soundInfo) {
                console.warn(`音效不存在: ${soundName}`);
                return false;
            }

            // 停止当前播放的同名音效
            if (this.activeSources.has(soundName)) {
                this.stopSound(soundName);
            }

            let audio = this.audioElements.get(soundName);
            if (!audio) {
                audio = new Audio();
                audio.loop = true;
                audio.crossOrigin = this.crossOrigin;
                this.audioElements.set(soundName, audio);
            }

            // 根据音频类型进行不同处理
            if (soundInfo.type === 'hls') {
                return await this.playHlsAudio(soundName, audio, soundInfo, volume);
            } else {
                return await this.playStandardAudio(soundName, audio, soundInfo, volume);
            }

        } catch (error) {
            console.error(`播放音效失败: ${soundName}`, error);
            if (this.onLoadingError) {
                this.onLoadingError({
                    name: soundName,
                    error,
                    timestamp: Date.now(),
                    context: 'playSound'
                });
            }
            return false;
        }
    }

    /**
     * 播放HLS音频
     * @private
     */
    async playHlsAudio(soundName, audio, soundInfo, volume) {
        // 如果需要，加载HLS
        if (!this.hlsPlayers.has(soundName)) {
            if (audio.canPlayType('application/vnd.apple.mpegurl')) {
                // 原生HLS支持
                audio.src = soundInfo.path;
            } else if (window.Hls && window.Hls.isSupported()) {
                // 使用hls.js
                const hls = new window.Hls({
                    enableWorker: false,
                    lowLatencyMode: false,
                    backBufferLength: 90
                });
                hls.loadSource(soundInfo.path);
                hls.attachMedia(audio);
                this.hlsPlayers.set(soundName, hls);
            } else {
                console.error(`HLS不受支持且无法加载hls.js: ${soundName}`);
                return false;
            }
        }

        audio.volume = volume;
        await audio.play();
        this.activeSources.set(soundName, { audio, type: 'hls' });
        return true;
    }

    /**
     * 播放标准音频
     * @private
     */
    async playStandardAudio(soundName, audio, soundInfo, volume) {
        // 确保移除可能存在的HLS实例
        if (this.hlsPlayers.has(soundName)) {
            this.hlsPlayers.get(soundName).destroy();
            this.hlsPlayers.delete(soundName);
        }

        // 直接设置src
        if (audio.src !== soundInfo.path) {
            audio.src = soundInfo.path;
        }

        audio.volume = volume;
        await audio.play();
        this.activeSources.set(soundName, { audio, type: 'standard' });
        return true;
    }

    /**
     * 停止播放音频
     * @param {string} soundName - 音效名称
     */
    stopSound(soundName) {
        if (this.activeSources.has(soundName)) {
            const { audio } = this.activeSources.get(soundName);
            audio.pause();
            audio.currentTime = 0;
            this.activeSources.delete(soundName);
        }
    }

    /**
     * 停止所有音频
     */
    stopAllSounds() {
        for (const [soundName] of this.activeSources) {
            this.stopSound(soundName);
        }
    }

    /**
     * 设置主音量
     * @param {number} volume - 音量 (0-1)
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        
        // 更新所有正在播放的音频音量
        for (const [soundName, { audio }] of this.activeSources) {
            audio.volume = this.masterVolume;
        }
    }

    /**
     * 获取当前正在播放的音效列表
     * @returns {Array<string>} 正在播放的音效名称列表
     */
    getPlayingSounds() {
        return Array.from(this.activeSources.keys());
    }

    /**
     * 检查指定音效是否正在播放
     * @param {string} soundName - 音效名称
     * @returns {boolean} 是否正在播放
     */
    isPlaying(soundName) {
        return this.activeSources.has(soundName);
    }

    // ========== 以下方法保持与HlsAudioManager的兼容性 ==========

    /**
     * 加载hls.js库
     */
    async loadHlsJs() {
        if (this.hlsJsLoaded) {
            return Promise.resolve();
        }
        
        if (this.hlsJsLoadPromise) {
            return this.hlsJsLoadPromise;
        }
        
        this.hlsJsLoadPromise = new Promise((resolve, reject) => {
            if (window.Hls) {
                this.hlsJsLoaded = true;
                console.log('检测到hls.js已加载');
                resolve();
                return;
            }
            
            console.log('正在加载hls.js库...');
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
            script.async = true;
            
            script.onload = () => {
                if (window.Hls && window.Hls.isSupported()) {
                    this.hlsJsLoaded = true;
                    console.log('hls.js加载成功，支持HLS播放');
                    resolve();
                } else {
                    const error = new Error('hls.js加载成功但不支持当前浏览器');
                    console.error(error);
                    reject(error);
                }
            };
            
            script.onerror = () => {
                const error = new Error('hls.js加载失败');
                console.error(error);
                reject(error);
            };
            
            document.head.appendChild(script);
        });
        
        return this.hlsJsLoadPromise;
    }

    /**
     * 检查浏览器HLS支持
     */
    checkHlsSupport() {
        const audio = document.createElement('audio');
        const canPlayHLS = audio.canPlayType('application/vnd.apple.mpegurl') !== '';
        const canPlayMSE = !!window.MediaSource;
        const userAgent = navigator.userAgent;
        
        const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
        const isChrome = /Chrome/.test(userAgent);
        const isFirefox = /Firefox/.test(userAgent);
        const isEdge = /Edge/.test(userAgent);
        
        let supported = false;
        let reason = '';
        
        if (isSafari) {
            supported = canPlayHLS;
            reason = canPlayHLS ? 'Safari原生HLS支持' : 'Safari不支持HLS';
        } else if (isChrome || isFirefox || isEdge) {
            supported = canPlayHLS || canPlayMSE;
            reason = canPlayHLS ? '原生HLS支持' : (canPlayMSE ? 'MSE支持' : '不支持HLS');
        } else {
            supported = canPlayHLS;
            reason = canPlayHLS ? '可能支持HLS' : '可能不支持HLS';
        }
        
        return {
            supported,
            reason,
            canPlayHLS,
            canPlayMSE,
            browser: { isSafari, isChrome, isFirefox, isEdge, userAgent }
        };
    }

    /**
     * 加载所有音频文件（兼容原接口）
     */
    async loadSounds(soundList) {
        console.log('开始加载音频文件...', Object.keys(soundList));
        
        const loadPromises = Object.entries(soundList).map(async ([name, config]) => {
            try {
                console.log(`加载音频: ${name} -> ${config.path}`);
                await this.loadSingleAudio(name, config.path);
                return { name, success: true };
            } catch (error) {
                console.error(`加载音频失败 ${name}:`, error);
                return { name, success: false, error: error.message };
            }
        });

        const results = await Promise.all(loadPromises);
        
        const successCount = results.filter(result => result.success).length;
        const failedResults = results.filter(result => !result.success);
        
        console.log(`音频加载完成，成功加载 ${successCount}/${Object.keys(soundList).length} 个文件`);
        
        if (failedResults.length > 0) {
            console.warn('以下音频加载失败:', failedResults);
        }
    }

    /**
     * 加载单个音频文件
     */
    async loadSingleAudio(name, path) {
        // 预加载逻辑，创建audio元素但不播放
        const audio = new Audio();
        audio.crossOrigin = this.crossOrigin;
        audio.loop = true;
        audio.preload = 'metadata';
        
        return new Promise((resolve, reject) => {
            audio.addEventListener('loadedmetadata', () => {
                this.audioElements.set(name, audio);
                resolve();
            });
            
            audio.addEventListener('error', () => {
                reject(new Error(`加载失败: ${path}`));
            });
            
            audio.src = path;
        });
    }

    /**
     * 设置错误恢复管理器
     */
    setErrorRecoveryManager(manager) {
        this.errorRecoveryManager = manager;
    }

    /**
     * 设置回调函数
     */
    setCallbacks(callbacks) {
        this.onLoadingStateChange = callbacks.onLoadingStateChange;
        this.onLoadingProgress = callbacks.onLoadingProgress;
        this.onLoadingError = callbacks.onLoadingError;
    }

    /**
     * 销毁管理器
     */
    destroy() {
        // 停止所有播放
        this.stopAllSounds();
        
        // 销毁HLS实例
        for (const [name, hls] of this.hlsPlayers) {
            try {
                hls.destroy();
            } catch (error) {
                console.warn(`销毁HLS实例失败: ${name}`, error);
            }
        }
        
        // 清理资源
        this.audioElements.clear();
        this.hlsPlayers.clear();
        this.activeSources.clear();
        this.soundConfigs.clear();
        this.modeConfigs.clear();
        this.customSounds.clear();
        this.standardAudioElements.clear();
        
        console.log('UniversalAudioManager已销毁');
    }
}