/**
 * AudioManager - 音频管理核心模块
 * 基于Web Audio API实现音频的加载、播放、停止和音量控制
 */
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.soundBuffers = {};
        this.activeSources = {};
        this.gainNodes = {};
        this.masterVolume = 0.7;
        this.isInitialized = false;
    }

    /**
     * 初始化AudioContext
     * 处理浏览器的自动播放策略
     */
    async init() {
        try {
            // 创建AudioContext，兼容不同浏览器
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                throw new Error('浏览器不支持Web Audio API');
            }

            this.audioContext = new AudioContextClass();
            
            // 不在初始化时强制恢复AudioContext，等待用户交互
            
            this.isInitialized = true;
        } catch (error) {
            console.error('AudioManager初始化失败:', error);
            throw error;
        }
    }

    /**
     * 加载音频文件列表
     * @param {Object} soundList - 音频文件配置对象 {name: path, ...}
     * @returns {Promise} 加载完成的Promise
     */
    async loadSounds(soundList) {
        if (!this.isInitialized) {
            await this.init();
        }

        const loadPromises = Object.entries(soundList).map(async ([name, config]) => {
            try {
                const path = typeof config === 'string' ? config : config.path;
                
                // 使用fetch获取音频文件
                const response = await fetch(path);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const arrayBuffer = await response.arrayBuffer();
                
                // 解码音频数据
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.soundBuffers[name] = audioBuffer;
                
                return { name, success: true };
            } catch (error) {
                console.error(`音频加载失败 ${name}:`, error);
                // 不抛出错误，允许其他音频继续加载
                this.soundBuffers[name] = null;
                return { name, success: false, error: error.message };
            }
        });

        const results = await Promise.all(loadPromises);
        
        // 统计加载结果
        const successCount = results.filter(result => result.success).length;
        const failedResults = results.filter(result => !result.success);
        
        // 如果没有任何音频加载成功，抛出错误
        if (successCount === 0) {
            throw new Error('所有音频文件加载失败');
        }
    }

    /**
     * 播放指定音效
     * @param {string} name - 音效名称
     * @param {number} volume - 音量 (0-1)，可选
     */
    async playSound(name, volume = this.masterVolume) {
        try {
            // 检查AudioContext状态并在需要时恢复
            if (!this.isInitialized) {
                console.error('AudioManager未初始化');
                return false;
            }
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // 检查音频是否存在
            if (!this.soundBuffers[name]) {
                console.error(`音频不存在: ${name}`);
                return false;
            }

            // 如果已在播放，先停止
            if (this.activeSources[name]) {
                this.stopSound(name);
            }

            // 创建音频源节点
            const source = this.audioContext.createBufferSource();
            source.buffer = this.soundBuffers[name];
            source.loop = true; // 设置循环播放

            // 创建音量控制节点
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = Math.max(0, Math.min(1, volume));

            // 连接音频节点
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // 保存节点引用
            this.activeSources[name] = {
                source: source,
                gainNode: gainNode,
                startTime: this.audioContext.currentTime
            };

            // 监听播放结束事件（虽然是循环播放，但可能被手动停止）
            source.onended = () => {
                if (this.activeSources[name] && this.activeSources[name].source === source) {
                    delete this.activeSources[name];
                }
            };

            // 开始播放
            source.start(0);
            return true;

        } catch (error) {
            console.error(`播放音效失败 ${name}:`, error);
            return false;
        }
    }

    /**
     * 停止指定音效
     * @param {string} name - 音效名称
     */
    stopSound(name) {
        try {
            if (this.activeSources[name]) {
                const { source } = this.activeSources[name];
                
                // 创建淡出效果，避免突然停止造成的爆音
                const gainNode = this.activeSources[name].gainNode;
                const currentTime = this.audioContext.currentTime;
                
                gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
                gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.1);
                
                // 延迟停止，等待淡出完成
                setTimeout(() => {
                    try {
                        source.stop();
                    } catch (e) {
                        // 忽略已经停止的错误
                    }
                }, 100);

                delete this.activeSources[name];
                return true;
            }
            return false;
        } catch (error) {
            console.error(`停止音效失败 ${name}:`, error);
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
            const normalizedVolume = Math.max(0, Math.min(1, volume));
            
            if (this.activeSources[name]) {
                const { gainNode } = this.activeSources[name];
                const currentTime = this.audioContext.currentTime;
                
                // 平滑调整音量，避免突变
                gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
                gainNode.gain.linearRampToValueAtTime(normalizedVolume, currentTime + 0.1);
                
                return true;
            }
            return false;
        } catch (error) {
            console.error(`设置音量失败 ${name}:`, error);
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
        Object.keys(this.activeSources).forEach(name => {
            this.setVolume(name, this.masterVolume);
        });
    }

    /**
     * 停止所有音效
     */
    stopAllSounds() {
        const activeNames = Object.keys(this.activeSources);
        activeNames.forEach(name => {
            this.stopSound(name);
        });
    }

    /**
     * 获取当前播放的音效列表
     * @returns {Array} 正在播放的音效名称数组
     */
    getCurrentlyPlaying() {
        return Object.keys(this.activeSources);
    }

    /**
     * 检查指定音效是否正在播放
     * @param {string} name - 音效名称
     * @returns {boolean} 是否正在播放
     */
    isPlaying(name) {
        return !!this.activeSources[name];
    }

    /**
     * 获取音效的播放时长（秒）
     * @param {string} name - 音效名称
     * @returns {number} 播放时长，如果未播放返回0
     */
    getPlayTime(name) {
        if (this.activeSources[name]) {
            return this.audioContext.currentTime - this.activeSources[name].startTime;
        }
        return 0;
    }

    /**
     * 检查音频是否已加载
     * @param {string} name - 音效名称
     * @returns {boolean} 是否已加载
     */
    isLoaded(name) {
        return !!this.soundBuffers[name];
    }

    /**
     * 获取所有已加载的音效名称
     * @returns {Array} 已加载的音效名称数组
     */
    getLoadedSounds() {
        return Object.keys(this.soundBuffers).filter(name => this.soundBuffers[name] !== null);
    }

    /**
     * 销毁AudioManager，释放资源
     */
    destroy() {
        this.stopAllSounds();
        
        // 清理所有音频缓冲区
        Object.keys(this.soundBuffers).forEach(key => {
            this.soundBuffers[key] = null;
        });
        
        if (this.audioContext) {
            // 关闭AudioContext会自动清理所有相关资源
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.soundBuffers = {};
        this.activeSources = {};
        this.gainNodes = {};
        this.isInitialized = false;
    }

    /**
     * 获取内存使用情况（调试用）
     */
    getMemoryInfo() {
        const info = {
            loadedSounds: Object.keys(this.soundBuffers).length,
            activeSources: Object.keys(this.activeSources).length,
            contextState: this.getContextState(),
            isInitialized: this.isInitialized
        };
        
        // 计算音频缓冲区大小（近似）
        let totalBufferSize = 0;
        Object.values(this.soundBuffers).forEach(buffer => {
            if (buffer) {
                totalBufferSize += buffer.length * buffer.numberOfChannels * 4; // 假设32位浮点
            }
        });
        info.approximateBufferSize = Math.round(totalBufferSize / 1024 / 1024 * 100) / 100; // MB
        
        return info;
    }

    /**
     * 获取AudioContext状态
     * @returns {string} AudioContext状态
     */
    getContextState() {
        return this.audioContext ? this.audioContext.state : 'closed';
    }

    /**
     * 恢复AudioContext（处理自动播放策略）
     */
    async resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }
}