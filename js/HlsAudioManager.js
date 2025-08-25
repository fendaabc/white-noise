/**
 * HlsAudioManager - HLS流媒体音频管理器
 * 基于HTML5 Audio和hls.js实现HLS音频流播放
 * 支持流式加载，减少初始加载时间和内存占用
 */
class HlsAudioManager {
    constructor() {
        this.audioElements = new Map(); // 存储HTML5 Audio元素
        this.hlsPlayers = new Map(); // 存储HLS播放器实例
        this.activeSources = new Map(); // 当前播放的音频源
        this.soundConfigs = new Map(); // 音频配置
        this.masterVolume = 0.7;
        this.isInitialized = false;
        this.loadingStates = new Map();
        this.crossOrigin = null; // 设置为null，避免跨域问题
        this.debug = false; // 关闭调试模式
        
        // hls.js相关
        this.hlsJsLoaded = false;
        this.hlsJsLoadPromise = null;
        
        // 错误处理
        this.onLoadingStateChange = null;
        this.onLoadingProgress = null;
        this.onLoadingError = null;
        this.errorRecoveryManager = null;
        
        console.log('HlsAudioManager 构造函数完成');
    }

    /**
     * 初始化HLS音频管理器
     */
    async init() {
        try {
            // 检查浏览器对HLS的支持
            const hlsSupport = this.checkHlsSupport();
            
            if (!hlsSupport.supported || !hlsSupport.canPlayHLS) {
                console.log('浏览器不支持原生HLS，将加载hls.js库');
                await this.loadHlsJs();
            }
            
            this.isInitialized = true;
            console.log('HlsAudioManager初始化成功');
        } catch (error) {
            console.error('HlsAudioManager初始化失败:', error);
            throw error;
        }
    }
    
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
            // 检查是否已经加载
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
     * @returns {Object} 支持信息
     */
    checkHlsSupport() {
        const audio = document.createElement('audio');
        const canPlayHLS = audio.canPlayType('application/vnd.apple.mpegurl') !== '';
        const canPlayMSE = !!window.MediaSource;
        const userAgent = navigator.userAgent;
        
        // 检查浏览器类型
        const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
        const isChrome = /Chrome/.test(userAgent);
        const isFirefox = /Firefox/.test(userAgent);
        const isEdge = /Edge/.test(userAgent);
        
        let supported = false;
        let reason = '';
        
        if (isSafari) {
            // Safari 对 HLS 有原生支持
            supported = canPlayHLS;
            reason = canPlayHLS ? 'Safari原生HLS支持' : 'Safari不支持HLS';
        } else if (isChrome || isFirefox || isEdge) {
            // 其他浏览器可能需要MSE或直接支持
            supported = canPlayHLS || canPlayMSE;
            reason = canPlayHLS ? '原生HLS支持' : (canPlayMSE ? 'MSE支持' : '不支持HLS');
        } else {
            // 其他浏览器，尝试直接支持
            supported = canPlayHLS;
            reason = canPlayHLS ? '可能支持HLS' : '可能不支持HLS';
        }
        
        const result = {
            supported,
            reason,
            canPlayHLS,
            canPlayMSE,
            browser: {
                isSafari,
                isChrome,
                isFirefox,
                isEdge,
                userAgent
            }
        };
        
        console.log('HLS支持检查结果:', result);
        return result;
    }

    /**
     * 设置音频配置
     * @param {Object} configs - 音频配置对象
     */
    setSoundConfigs(configs) {
        this.soundConfigs.clear();
        Object.entries(configs).forEach(([name, config]) => {
            this.soundConfigs.set(name, config);
        });
        console.log('HLS音频配置已设置:', Array.from(this.soundConfigs.keys()));
    }

    /**
     * 加载所有音频文件（兼容原接口）
     * @param {Object} soundList - 音频配置列表
     */
    async loadSounds(soundList) {
        console.log('开始加载HLS音频文件...', Object.keys(soundList));
        
        const loadPromises = Object.entries(soundList).map(async ([name, config]) => {
            try {
                console.log(`加载音频: ${name} -> ${config.path}`);
                await this.loadSingleAudio(name, config.path);
                return { name, success: true };
            } catch (error) {
                console.error(`加载HLS音频失败 ${name}:`, error);
                return { name, success: false, error: error.message };
            }
        });

        const results = await Promise.all(loadPromises);
        
        // 统计加载结果
        const successCount = results.filter(result => result.success).length;
        const failedResults = results.filter(result => !result.success);
        
        console.log(`HLS音频加载完成，成功加载 ${successCount}/${Object.keys(soundList).length} 个文件`);
        
        if (failedResults.length > 0) {
            console.warn('以下HLS音频加载失败:', failedResults);
            
            // 触发加载错误回调
            failedResults.forEach(result => {
                if (this.onLoadingError) {
                    this.onLoadingError({
                        name: result.name,
                        error: new Error(result.error),
                        timestamp: Date.now(),
                        context: 'loadSounds'
                    });
                }
            });
        }
        
        // 如果没有任何音频加载成功，抛出错误
        if (successCount === 0) {
            throw new Error('所有HLS音频文件加载失败');
        }
        
        return results;
    }

    /**
     * 设置错误恢复管理器（兼容性方法）
     * @param {Object} manager - 错误恢复管理器
     */
    setErrorRecoveryManager(manager) {
        this.errorRecoveryManager = manager;
        console.log('HLS音频管理器已设置错误恢复管理器');
    }

    /**
     * 设置回调函数（兼容性方法）
     * @param {Object} callbacks - 回调函数对象
     */
    setCallbacks(callbacks) {
        this.onLoadingStateChange = callbacks.onLoadingStateChange;
        this.onLoadingProgress = callbacks.onLoadingProgress;
        this.onLoadingError = callbacks.onLoadingError;
        console.log('HLS音频管理器回调已设置');
    }

    /**
     * 加载单个HLS音频流
     * @param {string} name - 音频名称
     * @param {string} hlsUrl - HLS播放列表URL
     */
    async loadSingleAudio(name, hlsUrl) {
        return new Promise((resolve, reject) => {
            try {
                console.log(`开始加载HLS音频: ${name} from ${hlsUrl}`);
                
                // 更新加载状态
                this.updateLoadingState(name, 'loading');
                
                // 创建Audio元素
                const audio = new Audio();
                audio.crossOrigin = this.crossOrigin;
                audio.preload = 'metadata';
                audio.loop = true;
                
                // 检查是否需要使用hls.js
                const needsHlsJs = !this.canPlayHlsNatively();
                
                if (needsHlsJs && window.Hls && window.Hls.isSupported()) {
                    // 使用hls.js
                    this.setupHlsJs(name, audio, hlsUrl, resolve, reject);
                } else {
                    // 使用原生支持
                    this.setupNativeHls(name, audio, hlsUrl, resolve, reject);
                }
                
            } catch (error) {
                console.error(`创建HLS音频元素失败 ${name}:`, error);
                this.updateLoadingState(name, 'error');
                reject(error);
            }
        });
    }
    
    /**
     * 检查是否可以原生播放HLS
     */
    canPlayHlsNatively() {
        const audio = document.createElement('audio');
        return audio.canPlayType('application/vnd.apple.mpegurl') !== '';
    }
    
    /**
     * 设置hls.js播放器
     */
    setupHlsJs(name, audio, hlsUrl, resolve, reject) {
        const hls = new window.Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: false,
            // 调整缓冲策略
            maxBufferLength: 30, // 保持缓冲区最多30秒
            maxMaxBufferLength: 120, // 内存中最多保留120秒的数据
            maxBufferSize: 60 * 1000 * 1000, // 60MB缓冲区大小
            maxBufferHole: 0.5, // 允许最大空洞0.5秒
            // 调整加载超时
            fragLoadingTimeOut: 20000, // 切片加载超时20秒
            manifestLoadingTimeOut: 10000, // 清单加载超时10秒
            levelLoadingTimeOut: 10000, // 级别加载超时10秒
            // 启动时加载的切片数量
            startFragPrefetch: true, // 开启启动时预取
            maxLoadingDelay: 4, // 最大加载延迟
            startLevel: -1, // 自动选择起始级别
            capLevelToPlayerSize: false, // 不限制级别到播放器尺寸
            // 重试策略优化
            fragLoadingMaxRetry: 4, // 切片加载最大重试4次
            manifestLoadingMaxRetry: 3, // 清单加载最大重试3次
            levelLoadingMaxRetry: 4 // 级别加载最大重试4次
        });
        
        // 设置超时机制
        const loadTimeout = setTimeout(() => {
            hls.destroy();
            const error = new Error(`HLS音频加载超时: ${name}`);
            console.error(error);
            this.updateLoadingState(name, 'error');
            reject(error);
        }, 15000); // 增加到15秒
        
        let manifestLoaded = false;
        
        // 监听hls.js事件
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            manifestLoaded = true;
            clearTimeout(loadTimeout);
            this.updateLoadingState(name, 'loaded');
            resolve();
        });
        
        let recoveryAttempts = 0;
        const maxRecoveryAttempts = 3;
        
        hls.on(window.Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                let canRecover = false;
                let errorMessage = 'HLS播放错误';
                
                switch (data.type) {
                    case window.Hls.ErrorTypes.NETWORK_ERROR:
                        errorMessage = `HLS网络错误: ${data.details}`;
                        if (recoveryAttempts < maxRecoveryAttempts) {
                            recoveryAttempts++;
                            hls.startLoad();
                            canRecover = true;
                        }
                        break;
                    case window.Hls.ErrorTypes.MEDIA_ERROR:
                        errorMessage = `HLS媒体错误: ${data.details}`;
                        if (recoveryAttempts < maxRecoveryAttempts) {
                            recoveryAttempts++;
                            hls.recoverMediaError();
                            canRecover = true;
                        }
                        break;
                    default:
                        errorMessage = `HLS未知错误: ${data.details}`;
                        break;
                }
                
                if (!canRecover) {
                    clearTimeout(loadTimeout);
                    const error = new Error(`${errorMessage}: ${name}`);
                    console.error(error);
                    this.updateLoadingState(name, 'error');
                    
                    hls.destroy();
                    reject(error);
                }
            }
        });
        
        // 监听音频事件
        audio.addEventListener('error', (e) => {
            if (!manifestLoaded) {
                clearTimeout(loadTimeout);
                let errorMessage = 'HTML5音频加载失败';
                
                if (audio.error) {
                    switch (audio.error.code) {
                        case 1:
                            errorMessage = 'MEDIA_ERR_ABORTED - 播放被中止';
                            break;
                        case 2:
                            errorMessage = 'MEDIA_ERR_NETWORK - 网络错误';
                            break;
                        case 3:
                            errorMessage = 'MEDIA_ERR_DECODE - 解码错误';
                            break;
                        case 4:
                            errorMessage = 'MEDIA_ERR_SRC_NOT_SUPPORTED - 格式不支持，将尝试重新初始化hls.js';
                            // 对于格式不支持的错误，尝试重新加载hls.js
                            this.retryWithFreshHlsJs(name, hlsUrl).then(resolve).catch(reject);
                            return;
                        default:
                            errorMessage = `未知媒体错误: ${audio.error.code}`;
                    }
                }
                
                const error = new Error(`${errorMessage}: ${name}`);
                console.error(error);
                this.updateLoadingState(name, 'error');
                hls.destroy();
                reject(error);
            }
        });
        
        // 加载HLS源
        try {
            hls.loadSource(hlsUrl);
            hls.attachMedia(audio);
        } catch (error) {
            clearTimeout(loadTimeout);
            console.error(`HLS加载失败: ${name}`, error);
            this.updateLoadingState(name, 'error');
            hls.destroy();
            reject(error);
            return;
        }
        
        // 存储引用
        this.audioElements.set(name, audio);
        this.hlsPlayers.set(name, hls);
    }
    
    /**
     * 设置原生HLS播放
     */
    setupNativeHls(name, audio, hlsUrl, resolve, reject) {
        // 设置超时机制
        const loadTimeout = setTimeout(() => {
            const error = new Error(`HLS音频加载超时: ${name}`);
            console.error(error);
            this.updateLoadingState(name, 'error');
            reject(error);
        }, 10000);
        
        // 监听事件
        audio.addEventListener('canplay', () => {
            clearTimeout(loadTimeout);
            this.updateLoadingState(name, 'loaded');
            resolve();
        });
        
        audio.addEventListener('error', (e) => {
            clearTimeout(loadTimeout);
            let errorMessage = 'Unknown error';
            
            if (audio.error) {
                switch (audio.error.code) {
                    case 1:
                        errorMessage = 'MEDIA_ERR_ABORTED - 播放被中止';
                        break;
                    case 2:
                        errorMessage = 'MEDIA_ERR_NETWORK - 网络错误';
                        break;
                    case 3:
                        errorMessage = 'MEDIA_ERR_DECODE - 解码错误';
                        break;
                    case 4:
                        errorMessage = 'MEDIA_ERR_SRC_NOT_SUPPORTED - 格式不支持';
                        break;
                    default:
                        errorMessage = `错误代码: ${audio.error.code}`;
                }
            }
            
            const error = new Error(`HLS音频加载失败: ${name} - ${errorMessage}`);
            console.error(error);
            this.updateLoadingState(name, 'error');
            reject(error);
        });
        
        // 存储Audio元素
        this.audioElements.set(name, audio);
        
        // 设置音频源并开始加载
        audio.src = hlsUrl;
        audio.load();
    }
    
    /**
     * 使用全新的hls.js实例重试加载
     * @param {string} name - 音频名称
     * @param {string} hlsUrl - HLS URL
     * @returns {Promise} 加载Promise
     */
    async retryWithFreshHlsJs(name, hlsUrl) {
        return new Promise((resolve, reject) => {
            console.log(`使用全新hls.js实例重试加载: ${name}`);
            
            // 清理之前的实例
            if (this.hlsPlayers.has(name)) {
                const oldHls = this.hlsPlayers.get(name);
                try {
                    oldHls.destroy();
                } catch (e) {
                    console.warn(`清理旧hls.js实例失败: ${name}`, e);
                }
                this.hlsPlayers.delete(name);
            }
            
            if (this.audioElements.has(name)) {
                this.audioElements.delete(name);
            }
            
            // 等待一小段时间后重试
            setTimeout(() => {
                try {
                    const newAudio = new Audio();
                    newAudio.crossOrigin = this.crossOrigin;
                    newAudio.preload = 'metadata';
                    newAudio.loop = true;
                    
                    this.setupHlsJs(name, newAudio, hlsUrl, resolve, reject);
                } catch (error) {
                    console.error(`重试setupHlsJs失败: ${name}`, error);
                    reject(error);
                }
            }, 500);
        });
    }

    /**
     * 播放指定音效
     * @param {string} name - 音效名称
     * @param {number} volume - 音量 (0-1)
     * @returns {boolean} 是否播放成功
     */
    async playSound(name, volume = this.masterVolume) {
        try {
            if (!this.audioElements.has(name)) {
                console.error(`HLS音频不存在: ${name}`);
                return false;
            }

            const audio = this.audioElements.get(name);
            console.log(`当前音频状态 ${name}:`, {
                readyState: audio.readyState,
                networkState: audio.networkState,
                error: audio.error,
                src: audio.src
            });
            
            // 检查音频是否已准备好
            if (audio.readyState < 2) { // HAVE_CURRENT_DATA
                console.log(`音频尚未准备好，等待加载: ${name}`);
                
                // 等待音频准备好
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        audio.removeEventListener('canplay', onCanPlay);
                        audio.removeEventListener('error', onError);
                        audio.removeEventListener('loadeddata', onLoadedData);
                        reject(new Error(`音频加载超时: ${name}`));
                    }, 8000); // 增加到8秒超时
                    
                    const onCanPlay = () => {
                        console.log(`音频可以播放: ${name}`);
                        clearTimeout(timeout);
                        audio.removeEventListener('canplay', onCanPlay);
                        audio.removeEventListener('error', onError);
                        audio.removeEventListener('loadeddata', onLoadedData);
                        resolve();
                    };
                    
                    const onLoadedData = () => {
                        console.log(`音频数据加载完成: ${name}`);
                        if (audio.readyState >= 2) {
                            onCanPlay();
                        }
                    };
                    
                    const onError = (e) => {
                        console.error(`音频加载错误事件: ${name}`, e, audio.error);
                        clearTimeout(timeout);
                        audio.removeEventListener('canplay', onCanPlay);
                        audio.removeEventListener('error', onError);
                        audio.removeEventListener('loadeddata', onLoadedData);
                        reject(new Error(`音频加载错误: ${name} - ${audio.error ? audio.error.message : 'Unknown error'}`));
                    };
                    
                    audio.addEventListener('canplay', onCanPlay);
                    audio.addEventListener('loadeddata', onLoadedData);
                    audio.addEventListener('error', onError);
                    
                    // 如果已经可以播放，立即resolve
                    if (audio.readyState >= 2) {
                        onCanPlay();
                    }
                });
            }
            
            // 如果已在播放，先停止
            if (this.isPlaying(name)) {
                this.stopSound(name);
                // 等待停止完成
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            // 设置音量
            const normalizedVolume = Math.max(0, Math.min(1, volume));
            audio.volume = normalizedVolume;
            
            // 重置播放位置
            audio.currentTime = 0;
            
            // 开始播放
            console.log(`尝试播放HLS音效: ${name}, 音量: ${normalizedVolume}`);
            await audio.play();
            
            // 记录为活跃音源
            this.activeSources.set(name, {
                audio: audio,
                startTime: Date.now()
            });

            console.log(`开始播放HLS音效: ${name}`);
            return true;

        } catch (error) {
            console.error(`播放HLS音效失败 ${name}:`, error);
            
            // 触发错误回调
            if (this.onLoadingError) {
                this.onLoadingError({
                    name,
                    error,
                    timestamp: Date.now(),
                    context: 'playSound'
                });
            }
            
            return false;
        }
    }

    /**
     * 停止指定音效
     * @param {string} name - 音效名称
     * @returns {boolean} 是否停止成功
     */
    stopSound(name) {
        try {
            if (!this.audioElements.has(name)) {
                return false;
            }

            const audio = this.audioElements.get(name);
            
            // 创建淡出效果
            const fadeOutDuration = 100; // 100ms淡出
            const startVolume = audio.volume;
            const fadeStep = startVolume / 10;
            
            let currentStep = 0;
            const fadeInterval = setInterval(() => {
                currentStep++;
                const newVolume = Math.max(0, startVolume - (fadeStep * currentStep));
                audio.volume = newVolume;
                
                if (currentStep >= 10 || newVolume <= 0) {
                    clearInterval(fadeInterval);
                    audio.pause();
                    audio.currentTime = 0;
                    this.activeSources.delete(name);
                    console.log(`停止播放HLS音效: ${name}`);
                }
            }, fadeOutDuration / 10);

            return true;
        } catch (error) {
            console.error(`停止HLS音效失败 ${name}:`, error);
            return false;
        }
    }

    /**
     * 设置指定音效的音量
     * @param {string} name - 音效名称
     * @param {number} volume - 音量值 (0-1)
     */
    setVolume(name, volume) {
        try {
            if (!this.audioElements.has(name)) {
                return false;
            }

            const normalizedVolume = Math.max(0, Math.min(1, volume));
            const audio = this.audioElements.get(name);
            audio.volume = normalizedVolume;
            
            console.log(`设置HLS音效音量 ${name}: ${normalizedVolume}`);
            return true;
        } catch (error) {
            console.error(`设置HLS音量失败 ${name}:`, error);
            return false;
        }
    }

    /**
     * 设置主音量
     * @param {number} volume - 主音量值 (0-1)
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        
        // 更新所有正在播放的音效音量
        for (const [name] of this.activeSources) {
            this.setVolume(name, this.masterVolume);
        }
        
        console.log(`设置HLS主音量: ${this.masterVolume}`);
    }

    /**
     * 停止所有音效
     */
    stopAllSounds() {
        const activeNames = Array.from(this.activeSources.keys());
        activeNames.forEach(name => {
            this.stopSound(name);
        });
        console.log('停止所有HLS音效');
    }

    /**
     * 检查指定音效是否正在播放
     * @param {string} name - 音效名称
     * @returns {boolean} 是否正在播放
     */
    isPlaying(name) {
        if (!this.audioElements.has(name)) {
            return false;
        }
        
        const audio = this.audioElements.get(name);
        return !audio.paused && !audio.ended;
    }

    /**
     * 获取当前播放的音效列表
     * @returns {Array} 正在播放的音效名称数组
     */
    getCurrentlyPlaying() {
        return Array.from(this.activeSources.keys()).filter(name => this.isPlaying(name));
    }

    /**
     * 检查音频是否已加载
     * @param {string} name - 音效名称
     * @returns {boolean} 是否已加载
     */
    isLoaded(name) {
        if (!this.audioElements.has(name)) {
            return false;
        }
        
        const audio = this.audioElements.get(name);
        return audio.readyState >= 3; // HAVE_FUTURE_DATA or better
    }

    /**
     * 获取所有已加载的音效名称
     * @returns {Array} 已加载的音效名称数组
     */
    getLoadedSounds() {
        const loaded = [];
        for (const [name, audio] of this.audioElements) {
            if (audio.readyState >= 3) {
                loaded.push(name);
            }
        }
        return loaded;
    }

    /**
     * 预缓冲指定音效
     * 这会触发hls.js开始加载音频切片，但不会播放
     * @param {string} name - 音效名称
     */
    prebufferSound(name) {
        if (!this.audioElements.has(name)) {
            console.warn(`[预缓冲] 音频尚未加载，无法预缓冲: ${name}`);
            return;
        }

        const audio = this.audioElements.get(name);
        const hls = this.hlsPlayers.get(name);

        // 如果hls实例存在，并且媒体已附加，可以开始加载
        if (hls && hls.media === audio) {
            console.log(`[预缓冲] 开始主动加载数据: ${name}`);
            try {
                hls.startLoad(); // 明确指令hls.js开始下载切片
                
                // 设置音量为0并进行短暂的预加载
                const originalVolume = audio.volume;
                audio.volume = 0;
                
                // 尝试短暂播放以触发数据加载，然后立即暂停
                const prebufferPlay = async () => {
                    try {
                        await audio.play();
                        // 等待一个很短的时间让数据开始缓冲
                        setTimeout(() => {
                            audio.pause();
                            audio.currentTime = 0;
                            audio.volume = originalVolume;
                            console.log(`[预缓冲] 预加载完成: ${name}`);
                        }, 100); // 100ms后暂停
                    } catch (playError) {
                        // 如果播放失败（比如需要用户交互），就只进行加载操作
                        audio.volume = originalVolume;
                        console.log(`[预缓冲] 无法播放，但已触发加载: ${name}`);
                    }
                };
                
                // 在下一个tick执行，避免阻塞当前执行
                setTimeout(prebufferPlay, 0);
                
            } catch (error) {
                console.warn(`[预缓冲] hls.startLoad 失败: ${name}`, error);
            }
        } else if (this.canPlayHlsNatively()) {
            // 对于原生支持HLS的浏览器（如Safari），调用load()
            console.log(`[预缓冲] 使用原生load()加载数据: ${name}`);
            try {
                audio.load();
                
                // 同样进行短暂的预播放
                const originalVolume = audio.volume;
                audio.volume = 0;
                
                const prebufferPlay = async () => {
                    try {
                        await audio.play();
                        setTimeout(() => {
                            audio.pause();
                            audio.currentTime = 0;
                            audio.volume = originalVolume;
                            console.log(`[预缓冲] 原生预加载完成: ${name}`);
                        }, 100);
                    } catch (playError) {
                        audio.volume = originalVolume;
                        console.log(`[预缓冲] 原生无法播放，但已触发加载: ${name}`);
                    }
                };
                
                setTimeout(prebufferPlay, 0);
                
            } catch (error) {
                console.warn(`[预缓冲] 原生 load() 失败: ${name}`, error);
            }
        }
    }

    /**
     * 更新加载状态
     * @param {string} name - 音频名称
     * @param {string} status - 状态 ('loading', 'loaded', 'error')
     */
    updateLoadingState(name, status) {
        this.loadingStates.set(name, {
            status,
            timestamp: Date.now()
        });
        console.log(`HLS音频加载状态更新: ${name} -> ${status}`);
    }

    /**
     * 获取内存使用情况
     * @returns {Object} 内存使用信息
     */
    getMemoryInfo() {
        const info = {
            loadedSounds: this.audioElements.size,
            activeSources: this.activeSources.size,
            isInitialized: this.isInitialized,
            loadingStates: this.loadingStates.size
        };
        
        return info;
    }

    /**
     * 恢复音频上下文（兼容性方法，HLS不需要特殊处理）
     */
    async resumeContext() {
        console.log('HLS音频不需要恢复上下文');
        return Promise.resolve();
    }

    /**
     * 获取上下文状态（兼容性方法）
     */
    getContextState() {
        return 'running'; // HLS始终可用
    }

    /**
     * 销毁管理器，释放资源
     */
    destroy() {
        console.log('销毁HlsAudioManager...');
        
        // 停止所有播放
        this.stopAllSounds();
        
        // 释放所有hls.js实例
        for (const [name, hls] of this.hlsPlayers) {
            try {
                hls.destroy();
                console.log(`释放hls.js实例: ${name}`);
            } catch (error) {
                console.warn(`释放hls.js实例失败: ${name}`, error);
            }
        }
        
        // 释放所有Audio元素
        for (const [name, audio] of this.audioElements) {
            audio.pause();
            audio.src = '';
            audio.load(); // 清理缓存
        }
        
        // 清理数据
        this.audioElements.clear();
        this.hlsPlayers.clear();
        this.activeSources.clear();
        this.soundConfigs.clear();
        this.loadingStates.clear();
        this.isInitialized = false;
        
        console.log('HlsAudioManager已销毁，资源已释放');
    }
    
    /**
     * 测试单个音频播放（调试用）
     * @param {string} name - 音频名称  
     * @param {string} url - HLS URL
     */
    async testAudio(name, url) {
        console.log(`\n=== 测试音频: ${name} ===`);
        console.log(`URL: ${url}`);
        
        try {
            // 加载音频
            console.log('1. 开始加载...');
            await this.loadSingleAudio(name, url);
            console.log('2. 加载成功');
            
            // 播放音频
            console.log('3. 开始播放...');
            const playResult = await this.playSound(name, 0.5);
            console.log('4. 播放结果:', playResult);
            
            // 等待2秒后停止
            setTimeout(() => {
                console.log('5. 停止播放');
                this.stopSound(name);
                console.log('=== 测试结束 ===\n');
            }, 2000);
            
        } catch (error) {
            console.error(`测试失败: ${name}`, error);
        }
    }
}

// 暴露到全局作用域（如果需要）
if (typeof window !== 'undefined') {
    window.HlsAudioManager = HlsAudioManager;
}