/**
 * 白噪音应用自动化测试套件
 * 涵盖所有核心功能模块的自动化测试
 */

class AutomatedTestSuite {
    constructor() {
        this.testResults = [];
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;
        this.startTime = null;
        this.endTime = null;
        
        console.log('🧪 自动化测试套件初始化完成');
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        this.startTime = Date.now();
        console.log('🚀 开始执行自动化测试...');
        
        try {
            // 基础环境测试
            await this.runEnvironmentTests();
            
            // 音频管理器测试
            await this.runAudioManagerTests();
            
            // 配置管理器测试
            await this.runConfigManagerTests();
            
            // 本地存储管理器测试
            await this.runLocalStorageTests();
            
            // 模式管理器测试
            await this.runModeManagerTests();
            
            // 通知管理器测试
            await this.runNotificationTests();
            
            // 音效按钮生成器测试
            await this.runSoundButtonTests();
            
            // 用户交互测试
            await this.runUserInteractionTests();
            
            // 错误处理测试
            await this.runErrorHandlingTests();
            
            // 性能测试
            await this.runPerformanceTests();
            
            this.endTime = Date.now();
            this.generateTestReport();
            
        } catch (error) {
            console.error('❌ 测试执行失败:', error);
            this.logTestResult('测试执行', false, `测试套件执行失败: ${error.message}`);
        }
    }

    /**
     * 基础环境测试
     */
    async runEnvironmentTests() {
        console.log('🔍 执行基础环境测试...');
        
        // 测试全局变量
        this.assert('window对象存在', typeof window !== 'undefined');
        this.assert('document对象存在', typeof document !== 'undefined');
        this.assert('localStorage可用', typeof localStorage !== 'undefined');
        
        // 测试必要的API
        this.assert('File API支持', typeof File !== 'undefined');
        this.assert('FileReader API支持', typeof FileReader !== 'undefined');
        this.assert('Blob API支持', typeof Blob !== 'undefined');
        this.assert('URL.createObjectURL支持', typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function');
        this.assert('Audio API支持', typeof Audio !== 'undefined');
        this.assert('fetch API支持', typeof fetch !== 'undefined');
        
        // 测试CSS选择器API
        this.assert('querySelector支持', typeof document.querySelector === 'function');
        this.assert('querySelectorAll支持', typeof document.querySelectorAll === 'function');
        
        // 测试事件API
        this.assert('addEventListener支持', typeof document.addEventListener === 'function');
        this.assert('自定义事件支持', typeof CustomEvent !== 'undefined');
    }

    /**
     * 音频管理器测试
     */
    async runAudioManagerTests() {
        console.log('🎵 执行音频管理器测试...');
        
        try {
            // 测试类定义
            this.assert('UniversalAudioManager类存在', typeof UniversalAudioManager !== 'undefined');
            
            // 创建实例
            const audioManager = new UniversalAudioManager();
            this.assert('AudioManager实例创建成功', audioManager instanceof UniversalAudioManager);
            
            // 测试初始化
            await audioManager.init();
            this.assert('AudioManager初始化成功', true);
            
            // 测试基本方法
            this.assert('setCurrentMode方法存在', typeof audioManager.setCurrentMode === 'function');
            this.assert('setModeConfigs方法存在', typeof audioManager.setModeConfigs === 'function');
            this.assert('setCustomSound方法存在', typeof audioManager.setCustomSound === 'function');
            this.assert('isCustomSound方法存在', typeof audioManager.isCustomSound === 'function');
            
            // 测试模式设置
            audioManager.setCurrentMode('normal');
            this.assert('模式设置为normal', audioManager.getCurrentMode() === 'normal');
            
            audioManager.setCurrentMode('campus');
            this.assert('模式设置为campus', audioManager.getCurrentMode() === 'campus');
            
            // 测试自定义音频设置
            audioManager.setCustomSound('test', {
                type: 'local',
                path: 'blob:test',
                fileName: 'test.mp3'
            });
            this.assert('自定义音频设置成功', audioManager.isCustomSound('test'));
            
        } catch (error) {
            this.logTestResult('AudioManager测试', false, error.message);
        }
    }

    /**
     * 配置管理器测试
     */
    async runConfigManagerTests() {
        console.log('⚙️ 执行配置管理器测试...');
        
        try {
            // 测试类定义
            this.assert('ConfigManager类存在', typeof ConfigManager !== 'undefined');
            
            // 创建实例
            const configManager = new ConfigManager();
            this.assert('ConfigManager实例创建成功', configManager instanceof ConfigManager);
            
            // 测试初始化
            const config = await configManager.init();
            this.assert('ConfigManager初始化成功', config && typeof config === 'object');
            this.assert('配置包含必要字段', config.version && config.settings);
            
            // 测试设置更新
            const testSettings = {
                volume: 85,
                currentMode: 'campus',
                customSounds: { test: { type: 'local' } }
            };
            const updateResult = configManager.updateSettings(testSettings);
            this.assert('设置更新成功', updateResult);
            
            // 测试设置读取
            const savedSettings = configManager.getSettings();
            this.assert('设置读取成功', savedSettings && savedSettings.volume === 85);
            
            // 测试使用统计
            configManager.incrementSessionCount();
            configManager.addPlayTime(30);
            configManager.updateRecentSounds('waves');
            
            const usage = configManager.getUsageStats();
            this.assert('使用统计功能正常', usage && usage.totalSessions > 0);
            
            // 测试配置验证
            this.assert('有效配置验证通过', configManager.validateConfig(config));
            this.assert('无效配置验证失败', !configManager.validateConfig(null));
            this.assert('无效配置验证失败', !configManager.validateConfig({}));
            
        } catch (error) {
            this.logTestResult('ConfigManager测试', false, error.message);
        }
    }

    /**
     * 本地存储管理器测试
     */
    async runLocalStorageTests() {
        console.log('💾 执行本地存储管理器测试...');
        
        try {
            // 测试类定义
            this.assert('LocalStorageManager类存在', typeof LocalStorageManager !== 'undefined');
            
            // 创建实例
            const storageManager = new LocalStorageManager();
            this.assert('LocalStorageManager实例创建成功', storageManager instanceof LocalStorageManager);
            
            // 测试初始化
            await storageManager.init();
            this.assert('LocalStorageManager初始化成功', true);
            
            // 测试文件验证
            const validFile = {
                type: 'audio/mp3',
                size: 1024 * 1024, // 1MB
                name: 'test.mp3'
            };
            const validation = storageManager.validateAudioFile(validFile);
            this.assert('有效音频文件验证通过', validation.valid);
            
            const invalidFile = {
                type: 'image/jpeg',
                size: 50 * 1024 * 1024, // 50MB
                name: 'test.jpg'
            };
            const invalidValidation = storageManager.validateAudioFile(invalidFile);
            this.assert('无效文件验证失败', !invalidValidation.valid);
            
            // 测试配置保存和读取
            const testConfig = {
                testSound: {
                    type: 'local',
                    fileName: 'test.mp3',
                    fileSize: 1024,
                    timestamp: Date.now()
                }
            };
            
            const saveResult = storageManager.saveConfig(testConfig);
            this.assert('配置保存成功', saveResult);
            
            const loadedConfig = storageManager.getCustomSoundsConfig();
            this.assert('配置读取成功', loadedConfig.testSound && loadedConfig.testSound.fileName === 'test.mp3');
            
            // 测试存储使用情况
            const usage = storageManager.getStorageUsage();
            this.assert('存储使用情况获取成功', usage && typeof usage.usageMB === 'number');
            
            // 清理测试数据
            storageManager.deleteAudioFile('testSound');
            
        } catch (error) {
            this.logTestResult('LocalStorageManager测试', false, error.message);
        }
    }

    /**
     * 模式管理器测试
     */
    async runModeManagerTests() {
        console.log('🔄 执行模式管理器测试...');
        
        try {
            // 测试类定义
            this.assert('ModeManager类存在', typeof ModeManager !== 'undefined');
            
            // 创建实例
            const modeManager = new ModeManager();
            this.assert('ModeManager实例创建成功', modeManager instanceof ModeManager);
            
            // 测试基本方法
            this.assert('getCurrentMode方法存在', typeof modeManager.getCurrentMode === 'function');
            this.assert('setModeChangeCallback方法存在', typeof modeManager.setModeChangeCallback === 'function');
            this.assert('setCustomAudioCallback方法存在', typeof modeManager.setCustomAudioCallback === 'function');
            
            // 测试默认模式
            this.assert('默认模式为normal', modeManager.getCurrentMode() === 'normal');
            
            // 测试回调设置
            let callbackTriggered = false;
            modeManager.setModeChangeCallback((newMode, oldMode) => {
                callbackTriggered = true;
            });
            this.assert('模式变更回调设置成功', typeof modeManager.onModeChange === 'function');
            
        } catch (error) {
            this.logTestResult('ModeManager测试', false, error.message);
        }
    }

    /**
     * 通知管理器测试
     */
    async runNotificationTests() {
        console.log('🔔 执行通知管理器测试...');
        
        try {
            // 测试类定义
            this.assert('NotificationManager类存在', typeof NotificationManager !== 'undefined');
            
            // 创建实例
            const notificationManager = new NotificationManager();
            this.assert('NotificationManager实例创建成功', notificationManager instanceof NotificationManager);
            
            // 测试基本方法
            this.assert('showSuccess方法存在', typeof notificationManager.showSuccess === 'function');
            this.assert('showError方法存在', typeof notificationManager.showError === 'function');
            this.assert('showWarning方法存在', typeof notificationManager.showWarning === 'function');
            this.assert('showInfo方法存在', typeof notificationManager.showInfo === 'function');
            this.assert('showLoading方法存在', typeof notificationManager.showLoading === 'function');
            
            // 测试通知创建
            const successId = notificationManager.showSuccess('测试成功消息');
            this.assert('成功通知创建', typeof successId === 'string');
            
            const errorId = notificationManager.showError('测试错误消息');
            this.assert('错误通知创建', typeof errorId === 'string');
            
            // 测试通知管理
            this.assert('通知数量管理', notificationManager.notifications.size >= 2);
            
            // 测试专用方法
            this.assert('文件上传错误方法存在', typeof notificationManager.showFileUploadError === 'function');
            this.assert('音频播放错误方法存在', typeof notificationManager.showAudioPlayError === 'function');
            this.assert('网络错误方法存在', typeof notificationManager.showNetworkError === 'function');
            
            // 清理通知
            notificationManager.clearAll();
            
        } catch (error) {
            this.logTestResult('NotificationManager测试', false, error.message);
        }
    }

    /**
     * 音效按钮生成器测试
     */
    async runSoundButtonTests() {
        console.log('🎛️ 执行音效按钮生成器测试...');
        
        try {
            // 测试类定义
            this.assert('SoundButtonGenerator类存在', typeof SoundButtonGenerator !== 'undefined');
            
            // 创建实例
            const buttonGenerator = new SoundButtonGenerator();
            this.assert('SoundButtonGenerator实例创建成功', buttonGenerator instanceof SoundButtonGenerator);
            
            // 测试基本方法
            this.assert('setCurrentMode方法存在', typeof buttonGenerator.setCurrentMode === 'function');
            this.assert('setCustomSounds方法存在', typeof buttonGenerator.setCustomSounds === 'function');
            this.assert('generateButtons方法存在', typeof buttonGenerator.generateButtons === 'function');
            this.assert('updateButtonStates方法存在', typeof buttonGenerator.updateButtonStates === 'function');
            
            // 测试模式设置
            buttonGenerator.setCurrentMode('normal');
            this.assert('模式设置成功', buttonGenerator.currentMode === 'normal');
            
            // 测试配置获取
            const config = buttonGenerator.getCurrentModeConfig();
            this.assert('配置获取成功', config && typeof config === 'object');
            
            // 测试自定义音频设置
            const customSounds = {
                customTest: {
                    type: 'local',
                    fileName: 'custom.mp3'
                }
            };
            buttonGenerator.setCustomSounds(customSounds);
            this.assert('自定义音频设置成功', buttonGenerator.isCustomSound('customTest'));
            
        } catch (error) {
            this.logTestResult('SoundButtonGenerator测试', false, error.message);
        }
    }

    /**
     * 用户交互测试
     */
    async runUserInteractionTests() {
        console.log('👆 执行用户交互测试...');
        
        try {
            // 测试DOM元素存在性
            const requiredElements = [
                'play-pause-btn',
                'sound-selector',
                'volume-slider',
                'normal-mode-btn',
                'campus-mode-btn'
            ];
            
            requiredElements.forEach(elementId => {
                const element = document.getElementById(elementId);
                this.assert(`${elementId}元素存在`, element !== null);
            });
            
            // 测试事件绑定能力
            const testElement = document.createElement('button');
            let eventTriggered = false;
            
            testElement.addEventListener('click', () => {
                eventTriggered = true;
            });
            
            // 模拟点击事件
            testElement.click();
            this.assert('事件绑定和触发正常', eventTriggered);
            
            // 测试CSS类操作
            testElement.classList.add('test-class');
            this.assert('CSS类添加成功', testElement.classList.contains('test-class'));
            
            testElement.classList.remove('test-class');
            this.assert('CSS类移除成功', !testElement.classList.contains('test-class'));
            
        } catch (error) {
            this.logTestResult('用户交互测试', false, error.message);
        }
    }

    /**
     * 错误处理测试
     */
    async runErrorHandlingTests() {
        console.log('⚠️ 执行错误处理测试...');
        
        try {
            // 测试全局错误处理器
            let globalErrorHandled = false;
            
            const originalHandler = window.onerror;
            window.onerror = () => {
                globalErrorHandled = true;
                return true;
            };
            
            // 恢复原始处理器
            window.onerror = originalHandler;
            this.assert('全局错误处理器可设置', true);
            
            // 测试Promise错误处理
            let promiseErrorHandled = false;
            
            const originalPromiseHandler = window.onunhandledrejection;
            window.onunhandledrejection = () => {
                promiseErrorHandled = true;
            };
            
            // 恢复原始处理器
            window.onunhandledrejection = originalPromiseHandler;
            this.assert('Promise错误处理器可设置', true);
            
            // 测试try-catch错误处理
            try {
                throw new Error('测试错误');
            } catch (error) {
                this.assert('try-catch错误处理正常', error.message === '测试错误');
            }
            
        } catch (error) {
            this.logTestResult('错误处理测试', false, error.message);
        }
    }

    /**
     * 性能测试
     */
    async runPerformanceTests() {
        console.log('⚡ 执行性能测试...');
        
        try {
            // 测试performance API
            this.assert('performance API可用', typeof performance !== 'undefined');
            this.assert('performance.now可用', typeof performance.now === 'function');
            
            // 测试DOM操作性能
            const startTime = performance.now();
            
            // 创建100个DOM元素
            const fragment = document.createDocumentFragment();
            for (let i = 0; i < 100; i++) {
                const div = document.createElement('div');
                div.textContent = `Test Element ${i}`;
                fragment.appendChild(div);
            }
            
            const endTime = performance.now();
            const domOperationTime = endTime - startTime;
            
            this.assert('DOM操作性能正常', domOperationTime < 100); // 应该在100ms内完成
            
            // 测试内存使用（如果可用）
            if (performance.memory) {
                const memoryInfo = performance.memory;
                this.assert('内存使用信息可获取', 
                    typeof memoryInfo.usedJSHeapSize === 'number' &&
                    typeof memoryInfo.totalJSHeapSize === 'number'
                );
            }
            
            // 测试localStorage性能
            const localStorageStartTime = performance.now();
            
            for (let i = 0; i < 10; i++) {
                localStorage.setItem(`test_${i}`, JSON.stringify({ data: `test_data_${i}` }));
            }
            
            for (let i = 0; i < 10; i++) {
                localStorage.getItem(`test_${i}`);
            }
            
            // 清理测试数据
            for (let i = 0; i < 10; i++) {
                localStorage.removeItem(`test_${i}`);
            }
            
            const localStorageEndTime = performance.now();
            const localStorageTime = localStorageEndTime - localStorageStartTime;
            
            this.assert('localStorage性能正常', localStorageTime < 50); // 应该在50ms内完成
            
        } catch (error) {
            this.logTestResult('性能测试', false, error.message);
        }
    }

    /**
     * 断言方法
     */
    assert(testName, condition, errorMessage = '') {
        this.totalTests++;
        
        if (condition) {
            this.passedTests++;
            this.logTestResult(testName, true);
        } else {
            this.failedTests++;
            this.logTestResult(testName, false, errorMessage);
        }
    }

    /**
     * 记录测试结果
     */
    logTestResult(testName, passed, errorMessage = '') {
        const result = {
            name: testName,
            passed: passed,
            error: errorMessage,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        
        if (passed) {
            console.log(`✅ ${testName}`);
        } else {
            console.error(`❌ ${testName}: ${errorMessage}`);
        }
    }

    /**
     * 生成测试报告
     */
    generateTestReport() {
        const duration = this.endTime - this.startTime;
        const successRate = Math.round((this.passedTests / this.totalTests) * 100);
        
        console.log('\n📊 自动化测试报告');
        console.log('='.repeat(50));
        console.log(`测试开始时间: ${new Date(this.startTime).toLocaleString()}`);
        console.log(`测试结束时间: ${new Date(this.endTime).toLocaleString()}`);
        console.log(`测试总耗时: ${duration}ms`);
        console.log(`总测试数: ${this.totalTests}`);
        console.log(`通过测试: ${this.passedTests}`);
        console.log(`失败测试: ${this.failedTests}`);
        console.log(`成功率: ${successRate}%`);
        console.log('='.repeat(50));
        
        if (this.failedTests > 0) {
            console.log('\n❌ 失败的测试:');
            this.testResults
                .filter(result => !result.passed)
                .forEach(result => {
                    console.log(`- ${result.name}: ${result.error}`);
                });
        }
        
        // 生成HTML报告
        this.generateHTMLReport();
        
        return {
            totalTests: this.totalTests,
            passedTests: this.passedTests,
            failedTests: this.failedTests,
            successRate: successRate,
            duration: duration,
            results: this.testResults
        };
    }

    /**
     * 生成HTML测试报告
     */
    generateHTMLReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.totalTests,
                passed: this.passedTests,
                failed: this.failedTests,
                successRate: Math.round((this.passedTests / this.totalTests) * 100),
                duration: this.endTime - this.startTime
            },
            results: this.testResults
        };
        
        // 将报告保存到localStorage，供测试页面读取
        try {
            localStorage.setItem('automated_test_report', JSON.stringify(report));
            console.log('📄 HTML测试报告已生成并保存到localStorage');
        } catch (error) {
            console.error('保存测试报告失败:', error);
        }
    }
}

// 导出测试套件类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutomatedTestSuite;
} else {
    window.AutomatedTestSuite = AutomatedTestSuite;
}

// 自动运行测试（如果在浏览器环境中且页面加载完成）
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // 延迟执行，确保所有模块都加载完成
        setTimeout(() => {
            if (window.location.search.includes('autotest=true')) {
                const testSuite = new AutomatedTestSuite();
                testSuite.runAllTests();
            }
        }, 1000);
    });
}