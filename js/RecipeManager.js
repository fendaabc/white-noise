/**
 * RecipeManager - 学习配方管理器
 * 负责保存、加载、删除和应用学习配方
 */
class RecipeManager {
    constructor() {
        this.recipes = new Map(); // 存储配方
        this.currentRecipe = null; // 当前正在编辑的配方
        this.localStorageKey = 'whitenoise_recipes';
        
        // DOM 元素引用
        this.elements = {};
        
        // 初始化完成标志
        this.initialized = false;
        
        console.log('RecipeManager 初始化');
    }

    /**
     * 初始化配方管理器
     */
    async init() {
        try {
            // 获取DOM元素
            this.initializeElements();
            
            // 绑定事件监听器
            this.bindEventListeners();
            
            // 加载已保存的配方
            await this.loadRecipes();
            
            // 初始化UI状态
            this.updateUI();
            
            this.initialized = true;
            console.log('RecipeManager 初始化完成');
            
            return true;
        } catch (error) {
            console.error('RecipeManager 初始化失败:', error);
            return false;
        }
    }

    /**
     * 初始化DOM元素引用
     */
    initializeElements() {
        // 配方控制按钮
        this.elements.saveButton = document.getElementById('save-recipe-btn');
        this.elements.listButton = document.getElementById('recipe-list-btn');
        
        // 保存配方弹窗
        this.elements.saveModal = document.getElementById('save-recipe-modal');
        this.elements.closeSaveModal = document.getElementById('close-save-modal');
        this.elements.currentMixPreview = document.getElementById('current-mix-preview');
        this.elements.currentTimerPreview = document.getElementById('current-timer-preview');
        this.elements.recipeNameInput = document.getElementById('recipe-name');
        this.elements.confirmSaveButton = document.getElementById('confirm-save-recipe');
        this.elements.cancelSaveButton = document.getElementById('cancel-save-recipe');
        
        // 配方列表弹窗
        this.elements.listModal = document.getElementById('recipe-list-modal');
        this.elements.closeListModal = document.getElementById('close-list-modal');
        this.elements.recipeListContainer = document.getElementById('recipe-list-container');
        this.elements.closeListButton = document.getElementById('close-recipe-list');
        
        // 验证必要元素
        const requiredElements = [
            'saveButton', 'listButton', 'saveModal', 'listModal',
            'currentMixPreview', 'recipeNameInput', 'confirmSaveButton'
        ];
        
        for (const elementKey of requiredElements) {
            if (!this.elements[elementKey]) {
                throw new Error(`必要的DOM元素未找到: ${elementKey}`);
            }
        }
    }

    /**
     * 绑定事件监听器
     */
    bindEventListeners() {
        // 保存配方按钮
        this.elements.saveButton.addEventListener('click', () => {
            this.showSaveModal();
        });
        
        // 配方列表按钮
        this.elements.listButton.addEventListener('click', () => {
            this.showListModal();
        });
        
        // 保存弹窗事件
        this.elements.closeSaveModal?.addEventListener('click', () => {
            this.hideSaveModal();
        });
        
        this.elements.cancelSaveButton.addEventListener('click', () => {
            this.hideSaveModal();
        });
        
        this.elements.confirmSaveButton.addEventListener('click', () => {
            this.saveCurrentRecipe();
        });
        
        // 配方名称输入框事件
        this.elements.recipeNameInput.addEventListener('input', () => {
            this.validateRecipeForm();
        });
        
        this.elements.recipeNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.elements.confirmSaveButton.disabled) {
                this.saveCurrentRecipe();
            }
        });
        
        // 列表弹窗事件
        this.elements.closeListModal?.addEventListener('click', () => {
            this.hideListModal();
        });
        
        this.elements.closeListButton?.addEventListener('click', () => {
            this.hideListModal();
        });
        
        // 点击遮罩关闭弹窗
        this.elements.saveModal.addEventListener('click', (e) => {
            if (e.target === this.elements.saveModal) {
                this.hideSaveModal();
            }
        });
        
        this.elements.listModal.addEventListener('click', (e) => {
            if (e.target === this.elements.listModal) {
                this.hideListModal();
            }
        });
        
        // ESC键关闭弹窗
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.elements.saveModal.style.display !== 'none') {
                    this.hideSaveModal();
                } else if (this.elements.listModal.style.display !== 'none') {
                    this.hideListModal();
                }
            }
        });
    }

    /**
     * 从localStorage加载配方
     */
    async loadRecipes() {
        try {
            const saved = localStorage.getItem(this.localStorageKey);
            if (saved) {
                const recipesData = JSON.parse(saved);
                this.recipes.clear();
                
                // 转换为Map结构
                for (const [id, recipe] of Object.entries(recipesData)) {
                    this.recipes.set(id, {
                        ...recipe,
                        createdAt: new Date(recipe.createdAt)
                    });
                }
                
                console.log(`已加载 ${this.recipes.size} 个配方`);
            }
        } catch (error) {
            console.error('加载配方失败:', error);
            this.recipes.clear();
        }
    }

    /**
     * 保存配方到localStorage
     */
    async saveRecipes() {
        try {
            const recipesObj = {};
            for (const [id, recipe] of this.recipes) {
                recipesObj[id] = {
                    ...recipe,
                    createdAt: recipe.createdAt.toISOString()
                };
            }
            
            localStorage.setItem(this.localStorageKey, JSON.stringify(recipesObj));
            console.log(`已保存 ${this.recipes.size} 个配方`);
        } catch (error) {
            console.error('保存配方失败:', error);
            throw error;
        }
    }

    /**
     * 更新UI状态
     */
    updateUI() {
        // 更新保存按钮状态
        const canSave = this.canSaveCurrentState();
        this.elements.saveButton.disabled = !canSave;
        
        if (canSave) {
            this.elements.saveButton.title = '保存当前混音配方';
        } else {
            this.elements.saveButton.title = '需要播放至少一个音效才能保存配方';
        }
    }

    /**
     * 检查当前状态是否可以保存为配方
     */
    canSaveCurrentState() {
        // 需要至少有一个音效在播放
        return window.appState && 
               window.appState.playingSounds && 
               window.appState.playingSounds.size > 0;
    }

    /**
     * 获取当前的混音状态
     */
    getCurrentMixState() {
        if (!window.appState || !window.audioManager) {
            return null;
        }
        
        const mixState = {
            sounds: {},
            timerDuration: 0,
            mode: window.appState.currentMode || 'normal'
        };
        
        // 收集当前播放的音效和音量
        for (const soundKey of window.appState.playingSounds) {
            const volume = window.audioManager.getSoundVolume ? 
                          window.audioManager.getSoundVolume(soundKey) : 
                          window.appState.volume;
            
            mixState.sounds[soundKey] = {
                volume: Math.round(volume)
            };
        }
        
        // 获取定时器状态
        if (window.timerManager && window.appState.timerActive) {
            mixState.timerDuration = window.timerManager.getOriginalDuration ? 
                                   window.timerManager.getOriginalDuration() : 
                                   window.appState.timerDuration;
        }
        
        return mixState;
    }

    /**
     * 显示保存配方弹窗
     */
    showSaveModal() {
        const mixState = this.getCurrentMixState();
        if (!mixState || Object.keys(mixState.sounds).length === 0) {
            this.showNotification('请先播放至少一个音效', 'warning');
            return;
        }
        
        // 更新混音预览
        this.updateMixPreview(mixState);
        
        // 清空输入框
        this.elements.recipeNameInput.value = '';
        this.validateRecipeForm();
        
        // 显示弹窗
        this.elements.saveModal.style.display = 'flex';
        
        // 聚焦到输入框
        setTimeout(() => {
            this.elements.recipeNameInput.focus();
        }, 100);
    }

    /**
     * 隐藏保存配方弹窗
     */
    hideSaveModal() {
        this.elements.saveModal.style.display = 'none';
        this.elements.recipeNameInput.value = '';
    }

    /**
     * 更新混音预览
     */
    updateMixPreview(mixState) {
        // 清空预览容器
        this.elements.currentMixPreview.innerHTML = '';
        
        // 获取当前模式的配置
        const soundConfig = mixState.mode === 'campus' ? 
                          window.campusSoundConfig : 
                          window.soundConfig;
        
        if (!soundConfig) {
            this.elements.currentMixPreview.innerHTML = '<p>无法获取音效配置</p>';
            return;
        }
        
        // 显示混音组合
        for (const [soundKey, soundData] of Object.entries(mixState.sounds)) {
            const config = soundConfig[soundKey];
            if (!config) continue;
            
            const mixItem = document.createElement('div');
            mixItem.className = 'mix-item';
            mixItem.innerHTML = `
                <div class="mix-item-info">
                    <span class="mix-item-icon">${config.icon || '🎵'}</span>
                    <span class="mix-item-name">${config.name || soundKey}</span>
                </div>
                <span class="mix-item-volume">${soundData.volume}%</span>
            `;
            
            this.elements.currentMixPreview.appendChild(mixItem);
        }
        
        // 如果没有音效，显示提示
        if (Object.keys(mixState.sounds).length === 0) {
            this.elements.currentMixPreview.innerHTML = '<p>当前没有播放任何音效</p>';
        }
        
        // 更新定时器预览
        if (mixState.timerDuration > 0) {
            const minutes = Math.floor(mixState.timerDuration / 60);
            this.elements.currentTimerPreview.textContent = `定时器：${minutes}分钟`;
        } else {
            this.elements.currentTimerPreview.textContent = '定时器：未设置';
        }
    }

    /**
     * 验证配方表单
     */
    validateRecipeForm() {
        const name = this.elements.recipeNameInput.value.trim();
        const isValid = name.length > 0 && name.length <= 20;
        
        this.elements.confirmSaveButton.disabled = !isValid;
        
        return isValid;
    }

    /**
     * 保存当前配方
     */
    async saveCurrentRecipe() {
        if (!this.validateRecipeForm()) {
            return;
        }
        
        const name = this.elements.recipeNameInput.value.trim();
        const mixState = this.getCurrentMixState();
        
        if (!mixState || Object.keys(mixState.sounds).length === 0) {
            this.showNotification('当前没有可保存的混音状态', 'error');
            return;
        }
        
        try {
            // 生成唯一ID
            const id = 'recipe_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // 创建配方对象
            const recipe = {
                id,
                name,
                mixState,
                createdAt: new Date(),
                usageCount: 0
            };
            
            // 保存到内存
            this.recipes.set(id, recipe);
            
            // 保存到localStorage
            await this.saveRecipes();
            
            // 关闭弹窗
            this.hideSaveModal();
            
            // 显示成功提示
            this.showNotification(`配方 "${name}" 已保存`, 'success');
            
            console.log('配方保存成功:', recipe);
            
        } catch (error) {
            console.error('保存配方失败:', error);
            this.showNotification('保存配方失败，请重试', 'error');
        }
    }

    /**
     * 显示配方列表弹窗
     */
    showListModal() {
        this.updateRecipeList();
        this.elements.listModal.style.display = 'flex';
    }

    /**
     * 隐藏配方列表弹窗
     */
    hideListModal() {
        this.elements.listModal.style.display = 'none';
    }

    /**
     * 更新配方列表
     */
    updateRecipeList() {
        const container = this.elements.recipeListContainer;
        container.innerHTML = '';
        
        if (this.recipes.size === 0) {
            // 显示空状态
            container.innerHTML = `
                <div class="recipe-empty">
                    <div class="recipe-empty-icon">📝</div>
                    <div class="recipe-empty-text">还没有保存任何学习配方</div>
                    <div class="recipe-empty-hint">创建混音后点击"保存配方"来保存您的配置</div>
                </div>
            `;
            return;
        }
        
        // 按创建时间倒序排列
        const sortedRecipes = Array.from(this.recipes.values())
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        // 生成配方列表项
        for (const recipe of sortedRecipes) {
            const recipeElement = this.createRecipeListItem(recipe);
            container.appendChild(recipeElement);
        }
    }

    /**
     * 创建配方列表项
     */
    createRecipeListItem(recipe) {
        const item = document.createElement('div');
        item.className = 'recipe-item';
        
        // 配方信息
        const info = document.createElement('div');
        info.className = 'recipe-info';
        
        const name = document.createElement('div');
        name.className = 'recipe-name';
        name.textContent = recipe.name;
        
        const created = document.createElement('div');
        created.className = 'recipe-created';
        created.textContent = `创建于 ${recipe.createdAt.toLocaleDateString()} ${recipe.createdAt.toLocaleTimeString()}`;
        
        info.appendChild(name);
        info.appendChild(created);
        
        // 配方内容
        const content = document.createElement('div');
        content.className = 'recipe-content';
        
        const mixDiv = document.createElement('div');
        mixDiv.className = 'recipe-mix';
        
        // 显示音效组合
        const soundConfig = recipe.mixState.mode === 'campus' ? 
                          window.campusSoundConfig : 
                          window.soundConfig;
        
        for (const [soundKey, soundData] of Object.entries(recipe.mixState.sounds)) {
            const config = soundConfig?.[soundKey];
            if (!config) continue;
            
            const soundSpan = document.createElement('span');
            soundSpan.className = 'recipe-sound';
            soundSpan.innerHTML = `
                <span>${config.icon || '🎵'}</span>
                <span>${config.name || soundKey} ${soundData.volume}%</span>
            `;
            
            mixDiv.appendChild(soundSpan);
        }
        
        content.appendChild(mixDiv);
        
        // 显示定时器信息
        if (recipe.mixState.timerDuration > 0) {
            const timerSpan = document.createElement('span');
            timerSpan.className = 'recipe-timer';
            timerSpan.innerHTML = `
                <span>⏰</span>
                <span>${Math.floor(recipe.mixState.timerDuration / 60)}分钟</span>
            `;
            content.appendChild(timerSpan);
        }
        
        // 操作按钮
        const actions = document.createElement('div');
        actions.className = 'recipe-actions';
        
        const applyButton = document.createElement('button');
        applyButton.className = 'recipe-action-btn primary';
        applyButton.textContent = '应用';
        applyButton.onclick = (e) => {
            e.stopPropagation();
            this.applyRecipe(recipe);
        };
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'recipe-action-btn danger';
        deleteButton.textContent = '删除';
        deleteButton.onclick = (e) => {
            e.stopPropagation();
            this.deleteRecipe(recipe.id);
        };
        
        actions.appendChild(applyButton);
        actions.appendChild(deleteButton);
        
        // 组装项目
        item.appendChild(info);
        item.appendChild(content);
        item.appendChild(actions);
        
        // 点击整个项目也可以应用配方
        item.addEventListener('click', () => {
            this.applyRecipe(recipe);
        });
        
        return item;
    }

    /**
     * 应用配方
     */
    async applyRecipe(recipe) {
        try {
            console.log('应用配方:', recipe);
            
            // 先停止所有当前播放的音效
            if (window.audioManager && window.audioManager.stopAll) {
                await window.audioManager.stopAll();
            }
            
            // 切换到配方对应的模式
            if (recipe.mixState.mode && window.modeManager) {
                await window.modeManager.switchMode(recipe.mixState.mode);
            }
            
            // 等待模式切换完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 应用音效和音量
            for (const [soundKey, soundData] of Object.entries(recipe.mixState.sounds)) {
                if (window.audioManager && window.audioManager.playSound) {
                    await window.audioManager.playSound(soundKey);
                    
                    // 设置音量
                    if (window.audioManager.setSoundVolume) {
                        window.audioManager.setSoundVolume(soundKey, soundData.volume);
                    }
                }
            }
            
            // 应用定时器
            if (recipe.mixState.timerDuration > 0 && window.timerManager) {
                const minutes = Math.floor(recipe.mixState.timerDuration / 60);
                if (window.timerManager.startTimer) {
                    window.timerManager.startTimer(minutes);
                }
            }
            
            // 更新使用次数
            recipe.usageCount = (recipe.usageCount || 0) + 1;
            await this.saveRecipes();
            
            // 关闭弹窗
            this.hideListModal();
            
            // 显示成功提示
            this.showNotification(`已应用配方 "${recipe.name}"`, 'success');
            
            console.log('配方应用成功');
            
        } catch (error) {
            console.error('应用配方失败:', error);
            this.showNotification('应用配方失败，请重试', 'error');
        }
    }

    /**
     * 删除配方
     */
    async deleteRecipe(recipeId) {
        const recipe = this.recipes.get(recipeId);
        if (!recipe) {
            return;
        }
        
        // 确认删除
        const confirmed = await this.showConfirmDialog(
            '确认删除',
            `确定要删除配方 "${recipe.name}" 吗？此操作无法撤销。`
        );
        
        if (!confirmed) {
            return;
        }
        
        try {
            // 从内存中删除
            this.recipes.delete(recipeId);
            
            // 保存到localStorage
            await this.saveRecipes();
            
            // 更新列表显示
            this.updateRecipeList();
            
            // 显示成功提示
            this.showNotification(`配方 "${recipe.name}" 已删除`, 'success');
            
            console.log('配方删除成功:', recipeId);
            
        } catch (error) {
            console.error('删除配方失败:', error);
            this.showNotification('删除配方失败，请重试', 'error');
        }
    }

    /**
     * 显示确认对话框
     */
    async showConfirmDialog(title, message) {
        return new Promise((resolve) => {
            const result = confirm(`${title}\n\n${message}`);
            resolve(result);
        });
    }

    /**
     * 显示通知消息
     */
    showNotification(message, type = 'info') {
        // 使用现有的通知系统
        if (window.notificationManager && window.notificationManager.show) {
            window.notificationManager.show(message, type);
        } else {
            // 降级方案
            console.log(`[${type.toUpperCase()}] ${message}`);
            
            // 简单的临时通知显示
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 10000;
                font-size: 14px;
                max-width: 300px;
            `;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }
    }

    /**
     * 获取配方统计信息
     */
    getStatistics() {
        return {
            totalRecipes: this.recipes.size,
            totalUsage: Array.from(this.recipes.values())
                .reduce((sum, recipe) => sum + (recipe.usageCount || 0), 0),
            mostUsedRecipe: Array.from(this.recipes.values())
                .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))[0] || null
        };
    }

    /**
     * 导出配方数据
     */
    exportRecipes() {
        const data = {};
        for (const [id, recipe] of this.recipes) {
            data[id] = {
                ...recipe,
                createdAt: recipe.createdAt.toISOString()
            };
        }
        
        return JSON.stringify(data, null, 2);
    }

    /**
     * 导入配方数据
     */
    async importRecipes(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            let importCount = 0;
            
            for (const [id, recipeData] of Object.entries(data)) {
                // 验证数据结构
                if (recipeData.name && recipeData.mixState && recipeData.createdAt) {
                    this.recipes.set(id, {
                        ...recipeData,
                        createdAt: new Date(recipeData.createdAt)
                    });
                    importCount++;
                }
            }
            
            // 保存到localStorage
            await this.saveRecipes();
            
            console.log(`成功导入 ${importCount} 个配方`);
            return importCount;
            
        } catch (error) {
            console.error('导入配方失败:', error);
            throw error;
        }
    }

    /**
     * 清理过期或无效的配方
     */
    async cleanupRecipes() {
        let cleanedCount = 0;
        
        for (const [id, recipe] of this.recipes) {
            // 检查配方是否有效
            if (!recipe.name || !recipe.mixState || !recipe.createdAt) {
                this.recipes.delete(id);
                cleanedCount++;
                continue;
            }
            
            // 检查是否太老（可选的清理策略）
            const ageInDays = (Date.now() - recipe.createdAt.getTime()) / (1000 * 60 * 60 * 24);
            if (ageInDays > 365 && (recipe.usageCount || 0) === 0) {
                // 删除超过一年且从未使用的配方
                this.recipes.delete(id);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            await this.saveRecipes();
            console.log(`清理了 ${cleanedCount} 个无效配方`);
        }
        
        return cleanedCount;
    }

    /**
     * 销毁管理器
     */
    destroy() {
        // 移除事件监听器
        // 注意：这里应该移除所有添加的事件监听器
        // 为了简化，只清理主要状态
        
        this.recipes.clear();
        this.elements = {};
        this.initialized = false;
        
        console.log('RecipeManager 已销毁');
    }
}

// 导出到全局作用域
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RecipeManager;
} else {
    window.RecipeManager = RecipeManager;
}