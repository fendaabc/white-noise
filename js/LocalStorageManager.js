/**
 * LocalStorageManager - 本地存储管理器
 * 处理自定义音频文件的本地存储、路径管理和数据持久化
 */
class LocalStorageManager {
    constructor() {
        this.storagePrefix = 'whiteNoise_';
        this.audioDataPrefix = 'audioData_';
        this.configKey = 'customAudioConfig';
        this.versionKey = 'storageVersion';
        this.currentVersion = '2.0.0';
        
        // 存储配额和限制
        this.maxFileSize = 10 * 1024 * 1024; // 10MB per file
        this.maxTotalSize = 50 * 1024 * 1024; // 50MB total storage
        
        // 支持的音频格式
        this.supportedFormats = [
            'audio/mpeg', 'audio/mp3',
            'audio/wav', 'audio/wave',
            'audio/mp4', 'audio/m4a',
            'audio/ogg', 'audio/webm',
            'audio/flac', 'audio/aac'
        ];
        
        console.log('LocalStorageManager 初始化完成');
    }

    /**
     * 初始化存储管理器
     */
    async init() {
        try {
            // 检查存储配额
            await this.checkStorageQuota();
            
            // 检查版本并进行数据迁移
            await this.checkVersionAndMigrate();
            
            // 清理过期或损坏的数据
            await this.cleanupInvalidData();
            
            console.log('LocalStorageManager 初始化成功');
            return true;
        } catch (error) {
            console.error('LocalStorageManager 初始化失败:', error);
            return false;
        }
    }

    /**
     * 检查浏览器存储配额
     */
    async checkStorageQuota() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                const usedMB = Math.round((estimate.usage || 0) / 1024 / 1024);
                const quotaMB = Math.round((estimate.quota || 0) / 1024 / 1024);
                
                console.log(`存储配额: 已使用 ${usedMB}MB / 总计 ${quotaMB}MB`);
                
                if (estimate.usage && estimate.quota) {
                    const usagePercent = (estimate.usage / estimate.quota) * 100;
                    if (usagePercent > 80) {
                        console.warn('存储空间即将耗尽，建议清理数据');
                        return { warning: true, usagePercent };
                    }
                }
                
                return { success: true, usage: estimate.usage, quota: estimate.quota };
            } catch (error) {
                console.warn('无法获取存储配额信息:', error);
                return { success: false };
            }
        }
        
        return { success: false, reason: '浏览器不支持存储配额检查' };
    }

    /**
     * 检查版本并进行数据迁移
     */
    async checkVersionAndMigrate() {
        const storedVersion = localStorage.getItem(this.storagePrefix + this.versionKey);
        
        if (!storedVersion) {
            // 首次使用，设置版本
            localStorage.setItem(this.storagePrefix + this.versionKey, this.currentVersion);
            console.log('首次使用，设置存储版本:', this.currentVersion);
        } else if (storedVersion !== this.currentVersion) {
            // 需要数据迁移
            console.log(`检测到版本变更: ${storedVersion} -> ${this.currentVersion}`);
            await this.migrateData(storedVersion, this.currentVersion);
            localStorage.setItem(this.storagePrefix + this.versionKey, this.currentVersion);
        }
    }

    /**
     * 数据迁移
     */
    async migrateData(fromVersion, toVersion) {
        console.log(`开始数据迁移: ${fromVersion} -> ${toVersion}`);
        
        try {
            // 这里可以添加具体的迁移逻辑
            // 例如：重新组织数据结构、清理废弃字段等
            
            if (fromVersion < '2.0.0') {
                // 从1.x版本迁移到2.0版本的逻辑
                await this.migrateFromV1ToV2();
            }
            
            console.log('数据迁移完成');
        } catch (error) {
            console.error('数据迁移失败:', error);
            throw error;
        }
    }

    /**
     * 从V1迁移到V2
     */
    async migrateFromV1ToV2() {
        // 迁移旧版本的自定义音频配置
        const oldConfig = localStorage.getItem('customSounds');
        if (oldConfig) {
            try {
                const parsed = JSON.parse(oldConfig);
                await this.saveConfig(parsed);
                localStorage.removeItem('customSounds'); // 删除旧配置
                console.log('V1自定义音频配置已迁移');
            } catch (error) {
                console.warn('迁移V1配置失败:', error);
            }
        }
    }

    /**
     * 清理无效数据
     */
    async cleanupInvalidData() {
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            if (key && key.startsWith(this.storagePrefix + this.audioDataPrefix)) {
                try {
                    const data = localStorage.getItem(key);
                    if (!data || data.length < 100) {
                        // 数据太小，可能已损坏
                        keysToRemove.push(key);
                    }
                } catch (error) {
                    // 无法解析的数据
                    keysToRemove.push(key);
                }
            }
        }
        
        // 删除无效数据
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log('清理无效数据:', key);
        });
        
        if (keysToRemove.length > 0) {
            console.log(`清理完成，删除了 ${keysToRemove.length} 个无效条目`);
        }
    }

    /**
     * 验证音频文件
     */
    validateAudioFile(file) {
        const errors = [];
        
        // 检查文件类型
        if (!this.supportedFormats.includes(file.type)) {
            errors.push(`不支持的文件格式: ${file.type}`);
        }
        
        // 检查文件大小
        if (file.size > this.maxFileSize) {
            const sizeMB = Math.round(file.size / 1024 / 1024);
            const maxMB = Math.round(this.maxFileSize / 1024 / 1024);
            errors.push(`文件过大: ${sizeMB}MB (最大: ${maxMB}MB)`);
        }
        
        // 检查文件名
        if (!file.name || file.name.length === 0) {
            errors.push('文件名不能为空');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 存储音频文件
     */
    async storeAudioFile(soundName, file) {
        return new Promise((resolve, reject) => {
            // 验证文件
            const validation = this.validateAudioFile(file);
            if (!validation.valid) {
                reject(new Error(`文件验证失败: ${validation.errors.join(', ')}`));
                return;
            }

            // 检查是否超出总存储限制
            const currentUsage = this.calculateCurrentUsage();
            if (currentUsage + file.size > this.maxTotalSize) {
                const currentMB = Math.round(currentUsage / 1024 / 1024);
                const fileMB = Math.round(file.size / 1024 / 1024);
                const maxMB = Math.round(this.maxTotalSize / 1024 / 1024);
                reject(new Error(`存储空间不足: 当前使用 ${currentMB}MB，文件大小 ${fileMB}MB，总限制 ${maxMB}MB`));
                return;
            }

            // 使用FileReader读取文件
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const arrayBuffer = event.target.result;
                    const base64Data = this.arrayBufferToBase64(arrayBuffer);
                    
                    // 生成存储键名
                    const storageKey = this.generateStorageKey(soundName);
                    
                    // 创建存储对象
                    const audioData = {
                        fileName: file.name,
                        fileType: file.type,
                        fileSize: file.size,
                        base64Data: base64Data,
                        timestamp: Date.now(),
                        version: this.currentVersion
                    };
                    
                    // 存储到localStorage
                    localStorage.setItem(storageKey, JSON.stringify(audioData));
                    
                    // 更新配置
                    this.updateSoundConfig(soundName, {
                        type: 'local',
                        storageKey: storageKey,
                        fileName: file.name,
                        fileType: file.type,
                        fileSize: file.size,
                        timestamp: Date.now()
                    });
                    
                    console.log(`音频文件已存储: ${soundName} (${file.name})`);
                    
                    resolve({
                        soundName,
                        fileName: file.name,
                        fileSize: file.size,
                        storageKey,
                        blobUrl: this.createBlobUrl(soundName)
                    });
                    
                } catch (error) {
                    console.error('存储音频文件失败:', error);
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('文件读取失败'));
            };
            
            // 读取为ArrayBuffer
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * 获取音频文件的Blob URL
     */
    createBlobUrl(soundName) {
        try {
            const storageKey = this.generateStorageKey(soundName);
            const dataStr = localStorage.getItem(storageKey);
            
            if (!dataStr) {
                throw new Error(`音频数据未找到: ${soundName}`);
            }
            
            const audioData = JSON.parse(dataStr);
            const binaryData = this.base64ToArrayBuffer(audioData.base64Data);
            const blob = new Blob([binaryData], { type: audioData.fileType });
            
            return URL.createObjectURL(blob);
            
        } catch (error) {
            console.error('创建Blob URL失败:', error);
            return null;
        }
    }

    /**
     * 删除音频文件
     */
    deleteAudioFile(soundName) {
        try {
            const storageKey = this.generateStorageKey(soundName);
            
            // 删除音频数据
            localStorage.removeItem(storageKey);
            
            // 更新配置
            this.removeSoundConfig(soundName);
            
            console.log(`音频文件已删除: ${soundName}`);
            return true;
            
        } catch (error) {
            console.error('删除音频文件失败:', error);
            return false;
        }
    }

    /**
     * 获取所有自定义音频配置
     */
    getCustomSoundsConfig() {
        try {
            const configKey = this.storagePrefix + this.configKey;
            const configStr = localStorage.getItem(configKey);
            
            if (!configStr) {
                return {};
            }
            
            return JSON.parse(configStr);
            
        } catch (error) {
            console.error('获取自定义音频配置失败:', error);
            return {};
        }
    }

    /**
     * 保存配置
     */
    saveConfig(config) {
        try {
            const configKey = this.storagePrefix + this.configKey;
            localStorage.setItem(configKey, JSON.stringify(config));
            return true;
        } catch (error) {
            console.error('保存配置失败:', error);
            return false;
        }
    }

    /**
     * 更新单个音效配置
     */
    updateSoundConfig(soundName, config) {
        const currentConfig = this.getCustomSoundsConfig();
        currentConfig[soundName] = config;
        return this.saveConfig(currentConfig);
    }

    /**
     * 删除音效配置
     */
    removeSoundConfig(soundName) {
        const currentConfig = this.getCustomSoundsConfig();
        delete currentConfig[soundName];
        return this.saveConfig(currentConfig);
    }

    /**
     * 生成存储键名
     */
    generateStorageKey(soundName) {
        return this.storagePrefix + this.audioDataPrefix + soundName;
    }

    /**
     * 计算当前使用的存储空间
     */
    calculateCurrentUsage() {
        let totalSize = 0;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.storagePrefix)) {
                const data = localStorage.getItem(key);
                if (data) {
                    totalSize += data.length * 2; // UTF-16编码，每个字符2字节
                }
            }
        }
        
        return totalSize;
    }

    /**
     * 获取存储使用情况
     */
    getStorageUsage() {
        const usage = this.calculateCurrentUsage();
        const usageMB = Math.round(usage / 1024 / 1024 * 100) / 100;
        const maxMB = Math.round(this.maxTotalSize / 1024 / 1024);
        const usagePercent = Math.round((usage / this.maxTotalSize) * 100);
        
        return {
            usage,
            usageMB,
            maxMB,
            usagePercent,
            remaining: this.maxTotalSize - usage
        };
    }

    /**
     * 清理所有数据
     */
    clearAllData() {
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.storagePrefix)) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
        
        console.log(`清理完成，删除了 ${keysToRemove.length} 个数据项`);
        return keysToRemove.length;
    }

    // ========== 工具方法 ==========

    /**
     * ArrayBuffer转Base64
     */
    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        
        return btoa(binary);
    }

    /**
     * Base64转ArrayBuffer
     */
    base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        return bytes.buffer;
    }

    /**
     * 获取文件扩展名
     */
    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    /**
     * 格式化文件大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 销毁管理器
     */
    destroy() {
        // 清理可能的内存引用
        console.log('LocalStorageManager已销毁');
    }
}
