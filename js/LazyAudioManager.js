/**
 * LazyAudioManager - 懒加载音频管理器
 * 继承AudioManager，添加按需加载和缓存机制
 */
class LazyAudioManager extends AudioManager {
    constructor() {
        super();
        
        // 懒加载相关状态
        this.loadingStates = new Map(); // 音频加载状态
        this.loadingPromises = new Map(); // 避免重复加载的Promise缓存
        this.retryAttempts = new Map(); // 重试次数记录
        this.soundConfigs = new Map(); // 音频配置缓存
        
        // 配置参数
        this.maxRetries = 3;
        this.loadTimeout = 10000; // 10秒超时
        
        // 回调函数
        this.onLoadingStateChange = null;
        this.onLoadingProgress = null;
        this.onLoadingError = null;
        
        // 错误恢复管理器
        this.errorRecoveryManager = null;
        
        console.log('LazyAudioManager 初始化完成');
    }

    /**
     * 设置音频配置
     * @param {Object} soundConfigs - 音频配置对象
     */
    setSoundConfigs(soundConfigs) {
        Object.entries(soundConfigs).forEach(([name, config]) => {
            this.soundConfigs.set(name, config);
        });
        console.log('音频配置已设置:', Array.from(this.soundConfigs.keys()));
    }

    /**
     * 获取音频配置
     * @param {string} name - 音频名称
     * @returns {Object|null} 音频配置
     */
    getSoundConfig(name) {
        return this.soundConfigs.get(name) || null;
    }

    /**
     * 懒加载单个音频文件
     * @param {string} name - 音频名称
     * @param {Object|string} config - 音频配置
     * @returns {Promise<boolean>} 加载是否成功
     */
    async loadSoundLazy(name, config = null) {
        try {
            // 如果已经加载，直接返回成功
            if (this.isLoaded(name)) {
                return true;
            }
            
            // 如果正在加载，返回现有Promise
            if (this.loadingPromises.has(name)) {
                return await this.loadingPromises.get(name);
            }

            // 获取配置
            const soundConfig = config || this.getSoundConfig(name);
            if (!soundConfig) {
                throw new Error(`音频配置不存在: ${name}`);
            }

            // 创建加载Promise
            const loadingPromise = this.performLazyLoad(name, soundConfig);
            this.loadingPromises.set(name, loadingPromise);
            
            const result = await loadingPromise;
            
            // 清理Promise缓存
            this.loadingPromises.delete(name);
            
            return result;
            
        } catch (error) {
            console.error(`懒加载音频失败 ${name}:`, error);
            this.loadingPromises.delete(name);
            return false;
        }
    }

    /**
     * 执行懒加载
     * @param {string} name - 音频名称
     * @param {Object|string} config - 音频配置
     * @returns {Promise<boolean>} 加载是否成功
     */
    async performLazyLoad(name, config) {
        try {
            console.log(`开始懒加载音频: ${name}`);
            this.updateLoadingState(name, 'loading');
            
            // 确保AudioManager已初始化
            if (!this.isInitialized) {
                await this.init();
            }

            const path = typeof config === 'string' ? config : config.path;
            
            // 添加超时控制
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('加载超时')), this.loadTimeout);
            });
            
            const loadPromise = this.loadSingleAudio(name, path);
            await Promise.race([loadPromise, timeoutPromise]);
            
            this.updateLoadingState(name, 'loaded');
            console.log(`懒加载音频成功: ${name}`);
            return true;
            
        } catch (error) {
            console.error(`懒加载音频失败 ${name}:`, error);
            this.updateLoadingState(name, 'error');
            
            // 使用错误恢复管理器处理错误
            if (this.errorRecoveryManager) {
                const context = {
                    type: 'audio',
                    operation: 'load',
                    audioName: name,
                    audioConfig: config,
                    retryFunction: () => this.performLazyLoad(name, config)
                };
                
                const recovered = await this.errorRecoveryManager.handleError(error, context);
                if (recovered) {
                    this.updateLoadingState(name, 'loaded');
                    return true;
                }
            } else {
                // 回退到原有的重试逻辑
                const retryCount = this.retryAttempts.get(name) || 0;
                if (retryCount < this.maxRetries) {
                    console.log(`重试加载音频 ${name}, 第 ${retryCount + 1} 次`);
                    this.retryAttempts.set(name, retryCount + 1);
                    this.updateLoadingState(name, 'retrying');
                    
                    // 延迟重试
                    await this.delay(Math.pow(2, retryCount) * 1000);
                    return this.performLazyLoad(name, config);
                }
            }
            
            this.handleLoadingError(name, error);
            return false;
        }
    }

    /**
     * 加载单个音频文件
     * @param {string} name - 音频名称
     * @param {string} path - 音频路径
     * @returns {Promise<void>}
     */
    async loadSingleAudio(name, path) {
        try {
            console.log(`获取音频文件: ${path}`);
            
            // 使用fetch获取音频文件
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            console.log(`音频文件下载完成: ${name}, 大小: ${arrayBuffer.byteLength} bytes`);
            
            // 解码音频数据
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.soundBuffers[name] = audioBuffer;
            
            console.log(`音频解码完成: ${name}, 时长: ${audioBuffer.duration.toFixed(2)}s`);
            
        } catch (error) {
            console.error(`加载单个音频失败 ${name}:`, error);
            this.soundBuffers[name] = null;
            throw error;
        }
    }

    /**
     * 播放音效（带懒加载）
     * @param {string} name - 音效名称
     * @param {number} volume - 音量 (0-1)
     * @returns {Promise<boolean>} 播放是否成功
     */
    async playSound(name, volume = this.masterVolume) {
        try {
            // 如果音频未加载，先进行懒加载
            if (!this.isLoaded(name)) {
                console.log(`音频未加载，开始懒加载: ${name}`);
                
                const loaded = await this.loadSoundLazy(name);
                if (!loaded) {
                    console.error(`懒加载失败，无法播放: ${name}`);
                    return false;
                }
            }
            
            // 调用父类的播放方法
            return await super.playSound(name, volume);
            
        } catch (error) {
            console.error(`播放音效失败 ${name}:`, error);
            return false;
        }
    }

    /**
     * 预加载指定音频列表
     * @param {Array<string>} soundNames - 音频名称列表
     * @returns {Promise<Object>} 加载结果统计
     */
    async preloadSounds(soundNames) {
        console.log('开始预加载音频:', soundNames);
        
        const results = await Promise.allSettled(
            soundNames.map(name => this.loadSoundLazy(name))
        );
        
        const successful = results.filter(result => 
            result.status === 'fulfilled' && result.value === true
        ).length;
        
        const failed = results.length - successful;
        
        console.log(`预加载完成: 成功 ${successful}, 失败 ${failed}`);
        
        return {
            total: results.length,
            successful,
            failed,
            results
        };
    }

    /**
     * 获取音频加载状态
     * @param {string} name - 音频名称
     * @returns {string} 加载状态
     */
    getLoadingState(name) {
        const state = this.loadingStates.get(name);
        return state ? state.status : 'idle';
    }

    /**
     * 获取所有加载状态
     * @returns {Object} 所有音频的加载状态
     */
    getAllLoadingStates() {
        const states = {};
        this.loadingStates.forEach((state, name) => {
            states[name] = state.status;
        });
        return states;
    }

    /**
     * 检查音频是否正在加载
     * @param {string} name - 音频名称
     * @returns {boolean} 是否正在加载
     */
    isLoading(name) {
        const state = this.getLoadingState(name);
        return state === 'loading' || state === 'retrying';
    }

    /**
     * 取消音频加载
     * @param {string} name - 音频名称
     */
    cancelLoading(name) {
        if (this.loadingPromises.has(name)) {
            this.loadingPromises.delete(name);
            this.updateLoadingState(name, 'cancelled');
            console.log(`取消加载音频: ${name}`);
        }
    }

    /**
     * 清理未使用的音频缓存
     * @param {Array<string>} keepSounds - 要保留的音频名称列表
     */
    cleanupCache(keepSounds = []) {
        const allSounds = Object.keys(this.soundBuffers);
        const toRemove = allSounds.filter(name => !keepSounds.includes(name));
        
        toRemove.forEach(name => {
            if (this.soundBuffers[name]) {
                delete this.soundBuffers[name];
                this.loadingStates.delete(name);
                this.retryAttempts.delete(name);
                console.log(`清理音频缓存: ${name}`);
            }
        });
        
        console.log(`缓存清理完成，移除 ${toRemove.length} 个音频`);
    }

    /**
     * 更新加载状态
     * @param {string} name - 音频名称
     * @param {string} status - 状态
     */
    updateLoadingState(name, status) {
        const state = {
            status,
            timestamp: Date.now(),
            name
        };
        
        this.loadingStates.set(name, state);
        
        // 触发状态变化回调
        if (this.onLoadingStateChange) {
            this.onLoadingStateChange(name, status, state);
        }
        
        console.log(`音频加载状态更新: ${name} -> ${status}`);
    }

    /**
     * 处理加载错误
     * @param {string} name - 音频名称
     * @param {Error} error - 错误对象
     */
    handleLoadingError(name, error) {
        const errorInfo = {
            name,
            error,
            timestamp: Date.now(),
            retryCount: this.retryAttempts.get(name) || 0
        };
        
        console.error(`音频加载错误 ${name}:`, error);
        
        // 触发错误回调
        if (this.onLoadingError) {
            this.onLoadingError(errorInfo);
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
     * 获取内存使用情况（增强版）
     * @returns {Object} 内存使用信息
     */
    getMemoryInfo() {
        const baseInfo = super.getMemoryInfo();
        
        return {
            ...baseInfo,
            loadingStates: this.loadingStates.size,
            loadingPromises: this.loadingPromises.size,
            retryAttempts: this.retryAttempts.size,
            soundConfigs: this.soundConfigs.size
        };
    }

    /**
     * 销毁LazyAudioManager，释放资源
     */
    destroy() {
        // 取消所有正在进行的加载
        this.loadingPromises.clear();
        
        // 清理状态
        this.loadingStates.clear();
        this.retryAttempts.clear();
        this.soundConfigs.clear();
        
        // 清理回调
        this.onLoadingStateChange = null;
        this.onLoadingProgress = null;
        this.onLoadingError = null;
        this.errorRecoveryManager = null;
        
        // 调用父类销毁方法
        super.destroy();
        
        console.log('LazyAudioManager 已销毁');
    }

    /**
     * 设置回调函数
     * @param {Object} callbacks - 回调函数对象
     */
    setCallbacks(callbacks) {
        if (callbacks.onLoadingStateChange) {
            this.onLoadingStateChange = callbacks.onLoadingStateChange;
        }
        if (callbacks.onLoadingProgress) {
            this.onLoadingProgress = callbacks.onLoadingProgress;
        }
        if (callbacks.onLoadingError) {
            this.onLoadingError = callbacks.onLoadingError;
        }
    }

    /**
     * 设置错误恢复管理器
     * @param {ErrorRecoveryManager} errorRecoveryManager - 错误恢复管理器实例
     */
    setErrorRecoveryManager(errorRecoveryManager) {
        this.errorRecoveryManager = errorRecoveryManager;
        console.log('LazyAudioManager 已设置错误恢复管理器');
    }

    /**
     * 获取加载统计信息
     * @returns {Object} 统计信息
     */
    getLoadingStats() {
        const states = this.getAllLoadingStates();
        const stats = {
            total: Object.keys(states).length,
            loaded: 0,
            loading: 0,
            error: 0,
            idle: 0,
            retrying: 0
        };
        
        Object.values(states).forEach(status => {
            if (stats.hasOwnProperty(status)) {
                stats[status]++;
            }
        });
        
        return stats;
    }
}