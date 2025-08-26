/**
 * PerformanceOptimizer - 性能监控和优化工具
 * 监控内存使用、网络请求、DOM操作等性能指标
 */
class PerformanceOptimizer {
    constructor() {
        this.metrics = {
            memory: {},
            timing: {},
            network: {},
            dom: {},
            audio: {}
        };
        
        this.observers = {};
        this.optimizations = [];
        this.isMonitoring = false;
        
        // 初始化性能监控
        this.init();
        
        console.log('PerformanceOptimizer 初始化完成');
    }

    /**
     * 初始化性能监控
     */
    init() {
        this.setupMemoryMonitoring();
        this.setupTimingMonitoring();
        this.setupNetworkMonitoring();
        this.setupDOMMonitoring();
        this.setupAudioOptimizations();
        
        // 开始监控
        this.startMonitoring();
    }

    /**
     * 设置内存监控
     */
    setupMemoryMonitoring() {
        if (!performance.memory) {
            console.warn('当前浏览器不支持内存监控');
            return;
        }

        this.memoryMonitor = {
            interval: null,
            threshold: 50 * 1024 * 1024, // 50MB 阈值
            
            start: () => {
                this.memoryMonitor.interval = setInterval(() => {
                    const memory = performance.memory;
                    this.metrics.memory = {
                        used: memory.usedJSHeapSize,
                        total: memory.totalJSHeapSize,
                        limit: memory.jsHeapSizeLimit,
                        timestamp: Date.now()
                    };
                    
                    // 检查内存使用是否过高
                    if (memory.usedJSHeapSize > this.memoryMonitor.threshold) {
                        this.handleHighMemoryUsage();
                    }
                    
                }, 5000); // 每5秒检查一次
            },
            
            stop: () => {
                if (this.memoryMonitor.interval) {
                    clearInterval(this.memoryMonitor.interval);
                    this.memoryMonitor.interval = null;
                }
            }
        };
    }

    /**
     * 设置时间监控
     */
    setupTimingMonitoring() {
        // 监控页面加载性能
        window.addEventListener('load', () => {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                this.metrics.timing = {
                    dns: navigation.domainLookupEnd - navigation.domainLookupStart,
                    connection: navigation.connectEnd - navigation.connectStart,
                    request: navigation.responseStart - navigation.requestStart,
                    response: navigation.responseEnd - navigation.responseStart,
                    domLoading: navigation.domContentLoadedEventStart - navigation.navigationStart,
                    domComplete: navigation.domComplete - navigation.navigationStart,
                    loadComplete: navigation.loadEventEnd - navigation.navigationStart
                };
            }
        });

        // 监控长任务
        if ('PerformanceObserver' in window) {
            try {
                const longTaskObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        if (entry.duration > 50) { // 超过50ms的任务
                            console.warn('检测到长任务:', {
                                duration: entry.duration,
                                startTime: entry.startTime,
                                name: entry.name
                            });
                            
                            this.optimizeLongTask(entry);
                        }
                    });
                });
                
                longTaskObserver.observe({ entryTypes: ['longtask'] });
                this.observers.longTask = longTaskObserver;
            } catch (error) {
                console.warn('长任务监控不可用:', error);
            }
        }
    }

    /**
     * 设置网络监控
     */
    setupNetworkMonitoring() {
        if ('PerformanceObserver' in window) {
            try {
                const resourceObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
                            this.metrics.network[entry.name] = {
                                duration: entry.duration,
                                size: entry.transferSize,
                                startTime: entry.startTime,
                                timestamp: Date.now()
                            };
                            
                            // 检查慢请求
                            if (entry.duration > 3000) { // 超过3秒
                                console.warn('检测到慢网络请求:', entry.name, entry.duration + 'ms');
                                this.optimizeSlowRequest(entry);
                            }
                        }
                    });
                });
                
                resourceObserver.observe({ entryTypes: ['resource'] });
                this.observers.resource = resourceObserver;
            } catch (error) {
                console.warn('网络监控不可用:', error);
            }
        }
    }

    /**
     * 设置DOM监控
     */
    setupDOMMonitoring() {
        // 监控DOM节点数量
        this.domMonitor = {
            checkInterval: null,
            maxNodes: 2000, // DOM节点数量阈值
            
            start: () => {
                this.domMonitor.checkInterval = setInterval(() => {
                    const nodeCount = document.querySelectorAll('*').length;
                    this.metrics.dom.nodeCount = nodeCount;
                    
                    if (nodeCount > this.domMonitor.maxNodes) {
                        console.warn('DOM节点数量过多:', nodeCount);
                        this.optimizeDOMNodes();
                    }
                }, 10000); // 每10秒检查一次
            },
            
            stop: () => {
                if (this.domMonitor.checkInterval) {
                    clearInterval(this.domMonitor.checkInterval);
                    this.domMonitor.checkInterval = null;
                }
            }
        };

        // 监控DOM操作性能
        this.monitorDOMOperations();
    }

    /**
     * 设置音频优化
     */
    setupAudioOptimizations() {
        // 音频预加载管理
        this.audioOptimizer = {
            preloadedAudios: new Map(),
            maxPreloaded: 5, // 最多预加载5个音频
            
            preloadAudio: (url, priority = 'normal') => {
                if (this.audioOptimizer.preloadedAudios.size >= this.audioOptimizer.maxPreloaded) {
                    // 移除最旧的预加载音频
                    const oldestKey = this.audioOptimizer.preloadedAudios.keys().next().value;
                    const oldestAudio = this.audioOptimizer.preloadedAudios.get(oldestKey);
                    if (oldestAudio.pause) oldestAudio.pause();
                    this.audioOptimizer.preloadedAudios.delete(oldestKey);
                }
                
                const audio = new Audio();
                audio.preload = 'metadata';
                audio.src = url;
                
                this.audioOptimizer.preloadedAudios.set(url, {
                    audio: audio,
                    priority: priority,
                    timestamp: Date.now()
                });
                
                return audio;
            },
            
            clearUnusedAudio: () => {
                const now = Date.now();
                const maxAge = 10 * 60 * 1000; // 10分钟
                
                this.audioOptimizer.preloadedAudios.forEach((audioData, url) => {
                    if (now - audioData.timestamp > maxAge) {
                        if (audioData.audio.pause) audioData.audio.pause();
                        audioData.audio.src = '';
                        this.audioOptimizer.preloadedAudios.delete(url);
                    }
                });
            }
        };

        // 定期清理未使用的音频
        setInterval(() => {
            this.audioOptimizer.clearUnusedAudio();
        }, 5 * 60 * 1000); // 每5分钟清理一次
    }

    /**
     * 开始监控
     */
    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        
        if (this.memoryMonitor) {
            this.memoryMonitor.start();
        }
        
        if (this.domMonitor) {
            this.domMonitor.start();
        }
        
        console.log('性能监控已启动');
    }

    /**
     * 停止监控
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        
        if (this.memoryMonitor) {
            this.memoryMonitor.stop();
        }
        
        if (this.domMonitor) {
            this.domMonitor.stop();
        }
        
        // 清理观察者
        Object.values(this.observers).forEach(observer => {
            if (observer.disconnect) observer.disconnect();
        });
        
        console.log('性能监控已停止');
    }

    /**
     * 处理高内存使用
     */
    handleHighMemoryUsage() {
        console.warn('检测到高内存使用，开始优化...');
        
        // 清理缓存
        this.clearCaches();
        
        // 清理未使用的音频
        this.audioOptimizer.clearUnusedAudio();
        
        // 清理DOM事件监听器
        this.cleanupEventListeners();
        
        // 触发垃圾回收（如果可用）
        if (window.gc) {
            window.gc();
        }
        
        this.optimizations.push({
            type: 'memory',
            action: 'high_usage_cleanup',
            timestamp: Date.now()
        });
    }

    /**
     * 优化长任务
     */
    optimizeLongTask(entry) {
        // 将长任务分解为较小的任务
        if (entry.duration > 100) {
            console.warn('优化长任务:', entry.name);
            
            // 建议使用 setTimeout 分解任务
            this.optimizations.push({
                type: 'timing',
                action: 'break_long_task',
                duration: entry.duration,
                suggestion: '考虑使用 setTimeout 或 requestIdleCallback 分解长任务',
                timestamp: Date.now()
            });
        }
    }

    /**
     * 优化慢请求
     */
    optimizeSlowRequest(entry) {
        console.log('优化慢请求:', entry.name);
        
        // 建议优化策略
        this.optimizations.push({
            type: 'network',
            action: 'slow_request_optimization',
            url: entry.name,
            duration: entry.duration,
            suggestions: [
                '考虑添加请求缓存',
                '检查网络连接',
                '优化服务器响应时间',
                '使用CDN加速'
            ],
            timestamp: Date.now()
        });
    }

    /**
     * 优化DOM节点
     */
    optimizeDOMNodes() {
        console.log('优化DOM节点数量...');
        
        // 移除不可见的元素
        const hiddenElements = document.querySelectorAll('[style*="display: none"], .hidden');
        let removedCount = 0;
        
        hiddenElements.forEach(element => {
            if (!element.dataset.keepAlive) {
                element.remove();
                removedCount++;
            }
        });
        
        if (removedCount > 0) {
            console.log(`已移除 ${removedCount} 个隐藏DOM节点`);
        }
        
        this.optimizations.push({
            type: 'dom',
            action: 'remove_hidden_nodes',
            removedCount: removedCount,
            timestamp: Date.now()
        });
    }

    /**
     * 监控DOM操作性能
     */
    monitorDOMOperations() {
        // 包装常用的DOM方法来监控性能
        const originalAppendChild = Element.prototype.appendChild;
        const originalRemoveChild = Element.prototype.removeChild;
        const originalInsertBefore = Element.prototype.insertBefore;

        Element.prototype.appendChild = function(child) {
            const start = performance.now();
            const result = originalAppendChild.call(this, child);
            const duration = performance.now() - start;
            
            if (duration > 5) { // 超过5ms的DOM操作
                console.warn('慢DOM操作 (appendChild):', duration + 'ms');
            }
            
            return result;
        };

        Element.prototype.removeChild = function(child) {
            const start = performance.now();
            const result = originalRemoveChild.call(this, child);
            const duration = performance.now() - start;
            
            if (duration > 5) {
                console.warn('慢DOM操作 (removeChild):', duration + 'ms');
            }
            
            return result;
        };

        Element.prototype.insertBefore = function(newNode, referenceNode) {
            const start = performance.now();
            const result = originalInsertBefore.call(this, newNode, referenceNode);
            const duration = performance.now() - start;
            
            if (duration > 5) {
                console.warn('慢DOM操作 (insertBefore):', duration + 'ms');
            }
            
            return result;
        };
    }

    /**
     * 清理缓存
     */
    clearCaches() {
        // 清理应用缓存
        if (window.caches) {
            caches.keys().then(names => {
                names.forEach(name => {
                    caches.delete(name);
                });
            });
        }
        
        // 清理本地存储中的缓存项
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.includes('cache_') || key.includes('temp_')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.warn('清理localStorage缓存失败:', error);
        }
    }

    /**
     * 清理事件监听器
     */
    cleanupEventListeners() {
        // 这里可以实现事件监听器的清理逻辑
        // 由于无法直接获取所有事件监听器，建议在应用中维护事件监听器的引用
        console.log('清理未使用的事件监听器...');
        
        this.optimizations.push({
            type: 'memory',
            action: 'cleanup_event_listeners',
            timestamp: Date.now()
        });
    }

    /**
     * 防抖函数
     */
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    /**
     * 节流函数
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * 获取性能报告
     */
    getPerformanceReport() {
        return {
            timestamp: Date.now(),
            metrics: { ...this.metrics },
            optimizations: [...this.optimizations],
            recommendations: this.generateRecommendations()
        };
    }

    /**
     * 生成优化建议
     */
    generateRecommendations() {
        const recommendations = [];
        
        // 内存建议
        if (this.metrics.memory.used && this.metrics.memory.limit) {
            const memoryUsage = (this.metrics.memory.used / this.metrics.memory.limit) * 100;
            if (memoryUsage > 80) {
                recommendations.push({
                    type: 'memory',
                    priority: 'high',
                    message: '内存使用率过高，建议优化内存管理',
                    suggestions: [
                        '清理未使用的变量引用',
                        '减少DOM节点数量',
                        '优化图片和音频资源',
                        '使用对象池管理重复创建的对象'
                    ]
                });
            }
        }
        
        // 时间建议
        if (this.metrics.timing.loadComplete > 5000) {
            recommendations.push({
                type: 'loading',
                priority: 'medium',
                message: '页面加载时间过长',
                suggestions: [
                    '优化关键资源加载顺序',
                    '使用代码分割和懒加载',
                    '压缩和合并静态资源',
                    '使用CDN加速'
                ]
            });
        }
        
        // DOM建议
        if (this.metrics.dom.nodeCount > 1500) {
            recommendations.push({
                type: 'dom',
                priority: 'medium',
                message: 'DOM节点数量过多',
                suggestions: [
                    '使用虚拟滚动优化长列表',
                    '移除不必要的DOM元素',
                    '使用CSS代替DOM结构',
                    '优化组件渲染逻辑'
                ]
            });
        }
        
        return recommendations;
    }

    /**
     * 导出性能数据
     */
    exportPerformanceData() {
        const data = this.getPerformanceReport();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance_report_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * 销毁优化器
     */
    destroy() {
        this.stopMonitoring();
        
        // 清理音频预加载
        this.audioOptimizer.preloadedAudios.forEach((audioData) => {
            if (audioData.audio.pause) audioData.audio.pause();
            audioData.audio.src = '';
        });
        this.audioOptimizer.preloadedAudios.clear();
        
        console.log('PerformanceOptimizer 已销毁');
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceOptimizer;
} else {
    window.PerformanceOptimizer = PerformanceOptimizer;
}

// 自动初始化（如果在浏览器环境中）
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    // 等待DOM加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.performanceOptimizer = new PerformanceOptimizer();
        });
    } else {
        window.performanceOptimizer = new PerformanceOptimizer();
    }
}