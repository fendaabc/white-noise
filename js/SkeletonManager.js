/**
 * SkeletonManager - 骨架屏管理器
 * 负责骨架屏的显示、隐藏和动画效果管理
 */
class SkeletonManager {
    constructor() {
        this.skeletonContainer = null;
        this.skeletonElements = new Map();
        this.isVisible = false;
        this.animationFrameId = null;
        this.transitionDuration = 300; // 过渡动画时长(ms)
    }

    /**
     * 初始化骨架屏管理器
     */
    init() {
        this.createSkeletonContainer();
        this.createSkeletonElements();
        console.log('SkeletonManager初始化完成');
    }

    /**
     * 显示骨架屏
     */
    show() {
        try {
            console.log('SkeletonManager.show() 被调用');
            
            if (this.isVisible) {
                console.log('骨架屏已经显示，跳过');
                return;
            }
            
            if (!this.skeletonContainer) {
                console.log('骨架屏容器不存在，开始初始化');
                this.init();
            }
            
            if (this.skeletonContainer) {
                this.skeletonContainer.style.display = 'flex';
                this.skeletonContainer.classList.add('skeleton-visible');
                this.startShimmerAnimation();
                this.isVisible = true;
                console.log('骨架屏已显示');
            } else {
                console.error('骨架屏容器创建失败');
            }
        } catch (error) {
            console.error('SkeletonManager.show() 出错:', error);
        }
    }

    /**
     * 隐藏骨架屏
     * @param {Function} callback - 隐藏完成后的回调函数
     */
    hide(callback = null) {
        try {
            console.log('SkeletonManager.hide() 被调用, isVisible:', this.isVisible);
            
            if (!this.isVisible) {
                console.log('骨架屏已经隐藏，直接执行回调');
                if (callback) callback();
                return;
            }
            
            this.stopShimmerAnimation();
            this.startMorphTransition();
            
            // 等待过渡动画完成后隐藏
            setTimeout(() => {
                try {
                    if (this.skeletonContainer) {
                        this.skeletonContainer.style.display = 'none';
                        this.skeletonContainer.classList.remove('skeleton-visible', 'skeleton-hiding');
                    }
                    this.isVisible = false;
                    
                    if (callback) callback();
                    console.log('骨架屏已隐藏');
                } catch (error) {
                    console.error('隐藏骨架屏时出错:', error);
                    if (callback) callback();
                }
            }, this.transitionDuration);
        } catch (error) {
            console.error('SkeletonManager.hide() 出错:', error);
            if (callback) callback();
        }
    }

    /**
     * 开始变形过渡动画
     */
    startMorphTransition() {
        try {
            if (!this.skeletonContainer) {
                console.warn('骨架屏容器不存在，跳过变形动画');
                return;
            }
            
            console.log('开始骨架屏变形过渡');
            
            // 简化版本：直接添加淡出效果
            this.skeletonContainer.classList.add('skeleton-hiding');
            
        } catch (error) {
            console.error('变形过渡动画出错:', error);
        }
    }

    /**
     * 变形标题元素
     * @param {HTMLElement} element - 标题骨架屏元素
     */
    morphTitleElement(element) {
        element.style.transform = 'scale(1.05)';
        element.style.opacity = '0';
        element.style.transition = 'all 0.3s ease-out';
    }

    /**
     * 变形播放按钮元素
     * @param {HTMLElement} element - 播放按钮骨架屏元素
     */
    morphPlayButtonElement(element) {
        element.style.transform = 'scale(0.95) rotate(5deg)';
        element.style.opacity = '0';
        element.style.transition = 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    }

    /**
     * 变形音效按钮元素
     * @param {HTMLElement} element - 音效按钮骨架屏元素
     */
    morphSoundButtonsElement(element) {
        try {
            if (!element) return;
            
            const items = element.querySelectorAll('.skeleton-grid-item');
            items.forEach((item, index) => {
                if (item) {
                    setTimeout(() => {
                        item.style.transform = 'translateY(-10px) scale(0.9)';
                        item.style.opacity = '0';
                        item.style.transition = 'all 0.3s ease-out';
                    }, index * 50);
                }
            });
        } catch (error) {
            console.error('变形音效按钮元素出错:', error);
        }
    }

    /**
     * 变形控制面板元素
     * @param {HTMLElement} element - 控制面板骨架屏元素
     */
    morphControlsElement(element) {
        element.style.transform = 'translateY(20px)';
        element.style.opacity = '0';
        element.style.transition = 'all 0.5s ease-out';
    }

    /**
     * 创建骨架屏容器
     */
    createSkeletonContainer() {
        // 检查是否已存在骨架屏容器
        this.skeletonContainer = document.getElementById('skeleton-container');
        
        if (!this.skeletonContainer) {
            this.skeletonContainer = document.createElement('div');
            this.skeletonContainer.id = 'skeleton-container';
            this.skeletonContainer.className = 'skeleton-container';
            
            // 插入到body的开头，确保在其他内容之前显示
            document.body.insertBefore(this.skeletonContainer, document.body.firstChild);
        }
    }

    /**
     * 创建骨架屏元素
     */
    createSkeletonElements() {
        try {
            const skeletonConfig = this.getSkeletonConfig();
            
            // 清空现有内容
            this.skeletonContainer.innerHTML = '';
            this.skeletonElements.clear();
            
            // 创建主容器
            const mainContainer = document.createElement('div');
            mainContainer.className = 'skeleton-main-container';
            
            // 创建各个骨架屏元素
            skeletonConfig.elements.forEach(elementConfig => {
                try {
                    const element = this.createSkeletonElement(elementConfig);
                    if (element) {
                        this.skeletonElements.set(elementConfig.id, element);
                        mainContainer.appendChild(element);
                    }
                } catch (error) {
                    console.error(`创建骨架屏元素失败: ${elementConfig.id}`, error);
                }
            });
            
            this.skeletonContainer.appendChild(mainContainer);
            console.log('骨架屏元素创建完成，共创建', this.skeletonElements.size, '个元素');
        } catch (error) {
            console.error('创建骨架屏元素失败:', error);
        }
    }

    /**
     * 创建单个骨架屏元素
     * @param {Object} config - 元素配置
     * @returns {HTMLElement} 创建的骨架屏元素
     */
    createSkeletonElement(config) {
        const element = document.createElement('div');
        element.id = config.id;
        element.className = `skeleton-element skeleton-${config.type}`;
        
        // 设置基本样式
        if (config.width) element.style.width = config.width;
        if (config.height) element.style.height = config.height;
        if (config.diameter) {
            element.style.width = config.diameter;
            element.style.height = config.diameter;
        }
        
        // 处理特殊类型
        switch (config.type) {
            case 'grid':
                this.createGridSkeleton(element, config);
                break;
            case 'circle':
                this.createCircleSkeleton(element, config);
                break;
            case 'text':
                this.createTextSkeleton(element, config);
                break;
            case 'controls':
                this.createControlsSkeleton(element, config);
                break;
        }
        
        // 添加动画类
        if (config.animation) {
            element.classList.add(`skeleton-${config.animation}`);
        }
        
        // 添加入场动画延迟
        if (config.delay) {
            element.style.animationDelay = config.delay;
        }
        
        return element;
    }

    /**
     * 创建网格骨架屏（用于音效按钮）
     * @param {HTMLElement} container - 容器元素
     * @param {Object} config - 配置对象
     */
    createGridSkeleton(container, config) {
        container.classList.add('skeleton-grid');
        
        for (let i = 0; i < config.items; i++) {
            const item = document.createElement('div');
            item.className = 'skeleton-grid-item';
            item.style.width = config.itemWidth;
            item.style.height = config.itemHeight;
            
            // 创建音效按钮的内部结构
            const iconPlaceholder = document.createElement('div');
            iconPlaceholder.className = 'skeleton-sound-icon';
            
            const namePlaceholder = document.createElement('div');
            namePlaceholder.className = 'skeleton-sound-name';
            
            item.appendChild(iconPlaceholder);
            item.appendChild(namePlaceholder);
            
            // 添加延迟动画效果
            if (config.animation === 'shimmer-delayed') {
                item.style.animationDelay = `${i * 0.1}s`;
                iconPlaceholder.style.animationDelay = `${i * 0.1 + 0.05}s`;
                namePlaceholder.style.animationDelay = `${i * 0.1 + 0.1}s`;
            }
            
            container.appendChild(item);
        }
    }

    /**
     * 创建圆形骨架屏（用于播放按钮）
     * @param {HTMLElement} element - 元素
     * @param {Object} config - 配置对象
     */
    createCircleSkeleton(element, config) {
        element.classList.add('skeleton-circle');
        
        // 添加内部播放图标占位符
        const playIcon = document.createElement('div');
        playIcon.className = 'skeleton-play-icon';
        element.appendChild(playIcon);
        
        // 添加呼吸效果的光环
        const halo = document.createElement('div');
        halo.className = 'skeleton-halo';
        element.appendChild(halo);
    }

    /**
     * 创建文本骨架屏
     * @param {HTMLElement} element - 元素
     * @param {Object} config - 配置对象
     */
    createTextSkeleton(element, config) {
        element.classList.add('skeleton-text');
        
        // 如果是标题，添加特殊样式
        if (config.id === 'title-skeleton') {
            element.classList.add('skeleton-title');
            
            // 添加装饰性元素
            const decoration = document.createElement('div');
            decoration.className = 'skeleton-title-decoration';
            element.appendChild(decoration);
        }
    }

    /**
     * 创建控制面板骨架屏
     * @param {HTMLElement} element - 元素
     * @param {Object} config - 配置对象
     */
    createControlsSkeleton(element, config) {
        element.classList.add('skeleton-controls');
        
        // 创建音量控制区域
        const volumeSection = document.createElement('div');
        volumeSection.className = 'skeleton-volume-section';
        
        const volumeLabel = document.createElement('div');
        volumeLabel.className = 'skeleton-volume-label';
        
        const volumeSlider = document.createElement('div');
        volumeSlider.className = 'skeleton-volume-slider';
        
        volumeSection.appendChild(volumeLabel);
        volumeSection.appendChild(volumeSlider);
        
        // 创建定时器控制区域
        const timerSection = document.createElement('div');
        timerSection.className = 'skeleton-timer-section';
        
        const timerLabel = document.createElement('div');
        timerLabel.className = 'skeleton-timer-label';
        
        const timerButtons = document.createElement('div');
        timerButtons.className = 'skeleton-timer-buttons';
        
        // 创建4个定时器按钮占位符
        for (let i = 0; i < 4; i++) {
            const button = document.createElement('div');
            button.className = 'skeleton-timer-button';
            button.style.animationDelay = `${i * 0.05}s`;
            timerButtons.appendChild(button);
        }
        
        timerSection.appendChild(timerLabel);
        timerSection.appendChild(timerButtons);
        
        element.appendChild(volumeSection);
        element.appendChild(timerSection);
    }

    /**
     * 启动微光动画
     */
    startShimmerAnimation() {
        // CSS动画会自动运行，这里主要是为了管理状态
        this.skeletonElements.forEach(element => {
            element.classList.add('skeleton-animated');
        });
    }

    /**
     * 停止微光动画
     */
    stopShimmerAnimation() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        this.skeletonElements.forEach(element => {
            element.classList.remove('skeleton-animated');
        });
    }

    /**
     * 获取骨架屏配置
     * @returns {Object} 骨架屏配置对象
     */
    getSkeletonConfig() {
        return {
            elements: [
                {
                    id: 'title-skeleton',
                    type: 'text',
                    width: '120px',
                    height: '40px',
                    animation: 'shimmer',
                    delay: '0.1s'
                },
                {
                    id: 'play-button-skeleton',
                    type: 'circle',
                    diameter: '120px',
                    animation: 'pulse',
                    delay: '0.3s'
                },
                {
                    id: 'sound-buttons-skeleton',
                    type: 'grid',
                    items: 5,
                    itemWidth: '140px',
                    itemHeight: '100px',
                    animation: 'shimmer-delayed',
                    delay: '0.5s'
                },
                {
                    id: 'controls-skeleton',
                    type: 'controls',
                    width: '100%',
                    height: '160px',
                    animation: 'shimmer',
                    delay: '0.7s'
                }
            ]
        };
    }

    /**
     * 检查是否正在显示
     * @returns {boolean} 是否可见
     */
    isShowing() {
        return this.isVisible;
    }

    /**
     * 销毁骨架屏管理器
     */
    destroy() {
        this.stopShimmerAnimation();
        
        if (this.skeletonContainer && this.skeletonContainer.parentNode) {
            this.skeletonContainer.parentNode.removeChild(this.skeletonContainer);
        }
        
        this.skeletonContainer = null;
        this.skeletonElements.clear();
        this.isVisible = false;
        
        console.log('SkeletonManager已销毁');
    }
}