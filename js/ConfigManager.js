/**
 * ConfigManager - 配置管理器
 * 负责用户配置的持久化存储、版本管理和数据迁移
 */
class ConfigManager {
    constructor() {
        this.configKey = 'whiteNoiseAppConfig';
        this.settingsKey = 'whiteNoiseSettings'; // 保持兼容性
        this.currentVersion = '2.0.0'; // 升级版本
        this.previousVersion = '1.0.0'; // 原始版本
        
        // 默认配置模板
        this.defaultConfig = {
            version: this.currentVersion,
            timestamp: Date.now(),
            settings: {
                volume: 70,
                playingSounds: [],
                currentMode: 'normal',
                customSounds: {},
                timerDuration: 0,
                settingsPanelVisible: false
            },
            preferences: {
                autoSave: true,
                showNotifications: true,
                animationsEnabled: true,
                theme: 'auto' // 'light', 'dark', 'auto'
            },
            usage: {
                totalSessions: 0,
                totalPlayTime: 0,
                favoriteMode: 'normal',
                lastUsedDate: null,
                customAudioCount: 0
            },
            cache: {
                lastBackgroundIndex: 0,
                recentlyUsedSounds: [],
                quickAccessSounds: []
            }
        };
        
        this.migrationRules = new Map();
        this.setupMigrationRules();
        
        console.log('ConfigManager 初始化完成');
    }

    /**
     * 初始化配置管理器
     */
    async init() {
        try {
            // 检查现有配置
            const existingConfig = this.loadRawConfig();
            
            if (existingConfig) {
                // 检查版本并执行迁移
                const migratedConfig = await this.migrateConfig(existingConfig);
                this.saveConfig(migratedConfig);
                console.log('配置迁移完成:', {
                    from: existingConfig.version || '1.0.0',
                    to: this.currentVersion
                });
                return migratedConfig;
            } else {
                // 首次使用，创建默认配置
                const newConfig = this.createDefaultConfig();
                this.saveConfig(newConfig);
                console.log('创建默认配置');
                return newConfig;
            }
        } catch (error) {
            console.error('ConfigManager 初始化失败:', error);
            // 返回默认配置作为备份
            return this.createDefaultConfig();
        }
    }

    /**
     * 设置迁移规则
     */
    setupMigrationRules() {
        // 从 1.0.0 到 2.0.0 的迁移规则
        this.migrationRules.set('1.0.0->2.0.0', (oldConfig) => {
            const newConfig = this.createDefaultConfig();
            
            // 迁移旧设置
            if (oldConfig.volume !== undefined) {
                newConfig.settings.volume = oldConfig.volume;
            }
            
            if (oldConfig.playingSounds && Array.isArray(oldConfig.playingSounds)) {
                newConfig.settings.playingSounds = oldConfig.playingSounds;
            }
            
            if (oldConfig.currentMode) {
                newConfig.settings.currentMode = oldConfig.currentMode;
            }
            
            if (oldConfig.customSounds && typeof oldConfig.customSounds === 'object') {
                newConfig.settings.customSounds = oldConfig.customSounds;
                newConfig.usage.customAudioCount = Object.keys(oldConfig.customSounds).length;
            }
            
            // 设置使用统计
            newConfig.usage.totalSessions = 1; // 表示这是迁移用户
            newConfig.usage.lastUsedDate = Date.now();
            
            return newConfig;
        });
    }

    /**
     * 创建默认配置
     */
    createDefaultConfig() {
        return JSON.parse(JSON.stringify(this.defaultConfig));
    }

    /**
     * 加载原始配置数据
     */
    loadRawConfig() {
        try {
            // 优先尝试加载新格式配置
            const newConfigStr = localStorage.getItem(this.configKey);
            if (newConfigStr) {
                const config = JSON.parse(newConfigStr);
                return config;
            }
            
            // 回退到旧格式配置
            const oldConfigStr = localStorage.getItem(this.settingsKey);
            if (oldConfigStr) {
                const oldConfig = JSON.parse(oldConfigStr);
                // 标记为旧版本
                oldConfig.version = this.previousVersion;
                return oldConfig;
            }
            
            return null;
        } catch (error) {
            console.error('加载配置失败:', error);
            return null;
        }
    }

    /**
     * 配置迁移
     */
    async migrateConfig(config) {
        if (!config || !config.version) {
            config = { ...config, version: this.previousVersion };
        }
        
        const fromVersion = config.version;
        const toVersion = this.currentVersion;
        
        // 如果版本相同，直接返回
        if (fromVersion === toVersion) {
            return config;
        }
        
        console.log(`开始配置迁移: ${fromVersion} -> ${toVersion}`);
        
        try {
            // 查找迁移规则
            const migrationKey = `${fromVersion}->${toVersion}`;
            const migrationRule = this.migrationRules.get(migrationKey);
            
            if (migrationRule) {
                const migratedConfig = migrationRule(config);
                migratedConfig.version = toVersion;
                migratedConfig.timestamp = Date.now();
                
                // 备份旧配置
                this.backupConfig(config, fromVersion);
                
                return migratedConfig;
            } else {
                console.warn(`未找到迁移规则: ${migrationKey}, 使用默认配置`);
                return this.createDefaultConfig();
            }
        } catch (error) {
            console.error('配置迁移失败:', error);
            return this.createDefaultConfig();
        }
    }

    /**
     * 备份配置
     */
    backupConfig(config, version) {
        try {
            const backupKey = `${this.configKey}_backup_${version}_${Date.now()}`;
            localStorage.setItem(backupKey, JSON.stringify({
                ...config,
                backupInfo: {
                    originalVersion: version,
                    backupTimestamp: Date.now(),
                    reason: 'migration'
                }
            }));
            console.log(`配置已备份: ${backupKey}`);
        } catch (error) {
            console.warn('配置备份失败:', error);
        }
    }

    /**
     * 保存配置
     */
    saveConfig(config) {
        try {
            config.timestamp = Date.now();
            
            // 保存到新格式
            localStorage.setItem(this.configKey, JSON.stringify(config));
            
            // 为了兼容性，也更新旧格式（仅设置部分）
            const legacySettings = {
                volume: config.settings.volume,
                playingSounds: config.settings.playingSounds,
                currentMode: config.settings.currentMode,
                customSounds: config.settings.customSounds
            };
            localStorage.setItem(this.settingsKey, JSON.stringify(legacySettings));
            
            console.log('配置已保存');
            return true;
        } catch (error) {
            console.error('保存配置失败:', error);
            return false;
        }
    }

    /**
     * 加载配置
     */
    loadConfig() {
        try {
            const configStr = localStorage.getItem(this.configKey);
            if (configStr) {
                return JSON.parse(configStr);
            }
            return this.createDefaultConfig();
        } catch (error) {
            console.error('加载配置失败:', error);
            return this.createDefaultConfig();
        }
    }

    /**
     * 更新设置
     */
    updateSettings(newSettings) {
        const config = this.loadConfig();
        config.settings = { ...config.settings, ...newSettings };
        return this.saveConfig(config);
    }

    /**
     * 更新偏好设置
     */
    updatePreferences(newPreferences) {
        const config = this.loadConfig();
        config.preferences = { ...config.preferences, ...newPreferences };
        return this.saveConfig(config);
    }

    /**
     * 更新使用统计
     */
    updateUsageStats(stats) {
        const config = this.loadConfig();
        config.usage = { ...config.usage, ...stats };
        config.usage.lastUsedDate = Date.now();
        return this.saveConfig(config);
    }

    /**
     * 增加会话计数
     */
    incrementSessionCount() {
        const config = this.loadConfig();
        config.usage.totalSessions = (config.usage.totalSessions || 0) + 1;
        config.usage.lastUsedDate = Date.now();
        return this.saveConfig(config);
    }

    /**
     * 更新播放时间
     */
    addPlayTime(minutes) {
        const config = this.loadConfig();
        config.usage.totalPlayTime = (config.usage.totalPlayTime || 0) + minutes;
        return this.saveConfig(config);
    }

    /**
     * 更新最近使用的音效
     */
    updateRecentSounds(soundName) {
        const config = this.loadConfig();
        const recent = config.cache.recentlyUsedSounds || [];
        
        // 移除重复项
        const index = recent.indexOf(soundName);
        if (index > -1) {
            recent.splice(index, 1);
        }
        
        // 添加到开头
        recent.unshift(soundName);
        
        // 限制数量
        config.cache.recentlyUsedSounds = recent.slice(0, 10);
        
        return this.saveConfig(config);
    }

    /**
     * 获取设置
     */
    getSettings() {
        const config = this.loadConfig();
        return config.settings;
    }

    /**
     * 获取偏好设置
     */
    getPreferences() {
        const config = this.loadConfig();
        return config.preferences;
    }

    /**
     * 获取使用统计
     */
    getUsageStats() {
        const config = this.loadConfig();
        return config.usage;
    }

    /**
     * 获取缓存信息
     */
    getCache() {
        const config = this.loadConfig();
        return config.cache;
    }

    /**
     * 重置配置
     */
    resetConfig() {
        try {
            // 备份当前配置
            const currentConfig = this.loadConfig();
            this.backupConfig(currentConfig, currentConfig.version || this.currentVersion);
            
            // 创建新的默认配置
            const newConfig = this.createDefaultConfig();
            this.saveConfig(newConfig);
            
            console.log('配置已重置');
            return newConfig;
        } catch (error) {
            console.error('重置配置失败:', error);
            return null;
        }
    }

    /**
     * 导出配置
     */
    exportConfig() {
        const config = this.loadConfig();
        const exportData = {
            ...config,
            exportInfo: {
                exportTimestamp: Date.now(),
                appVersion: this.currentVersion,
                userAgent: navigator.userAgent
            }
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * 导入配置
     */
    importConfig(configJson) {
        try {
            const importedConfig = JSON.parse(configJson);
            
            // 验证配置格式
            if (!this.validateConfig(importedConfig)) {
                throw new Error('无效的配置格式');
            }
            
            // 备份当前配置
            const currentConfig = this.loadConfig();
            this.backupConfig(currentConfig, 'before_import');
            
            // 迁移导入的配置（如果需要）
            const migratedConfig = await this.migrateConfig(importedConfig);
            
            // 保存配置
            const success = this.saveConfig(migratedConfig);
            
            if (success) {
                console.log('配置导入成功');
                return migratedConfig;
            } else {
                throw new Error('保存配置失败');
            }
        } catch (error) {
            console.error('导入配置失败:', error);
            throw error;
        }
    }

    /**
     * 验证配置格式
     */
    validateConfig(config) {
        if (!config || typeof config !== 'object') {
            return false;
        }
        
        // 检查必要字段
        const requiredFields = ['settings'];
        for (const field of requiredFields) {
            if (!config[field] || typeof config[field] !== 'object') {
                return false;
            }
        }
        
        return true;
    }

    /**
     * 清理旧数据
     */
    cleanupOldData() {
        try {
            const keys = Object.keys(localStorage);
            let removedCount = 0;
            
            keys.forEach(key => {
                // 清理旧的备份文件（保留最近的5个）
                if (key.includes(`${this.configKey}_backup_`)) {
                    const backups = keys
                        .filter(k => k.includes(`${this.configKey}_backup_`))
                        .sort()
                        .reverse();
                    
                    if (backups.indexOf(key) >= 5) {
                        localStorage.removeItem(key);
                        removedCount++;
                    }
                }
            });
            
            if (removedCount > 0) {
                console.log(`清理了 ${removedCount} 个旧备份文件`);
            }
        } catch (error) {
            console.warn('清理旧数据失败:', error);
        }
    }

    /**
     * 获取存储使用情况
     */
    getStorageUsage() {
        try {
            let totalSize = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length;
                }
            }
            
            return {
                totalBytes: totalSize,
                totalMB: (totalSize / 1024 / 1024).toFixed(2),
                configSize: localStorage.getItem(this.configKey)?.length || 0,
                settingsSize: localStorage.getItem(this.settingsKey)?.length || 0
            };
        } catch (error) {
            console.error('获取存储使用情况失败:', error);
            return null;
        }
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigManager;
} else {
    window.ConfigManager = ConfigManager;
}