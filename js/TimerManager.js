/**
 * TimerManager - 定时器管理模块
 * 提供定时器的设置、取消和状态查询功能
 */
class TimerManager {
    constructor() {
        this.activeTimer = null;
        this.startTime = null;
        this.duration = 0; // 持续时间（毫秒）
        this.callback = null;
        this.updateInterval = null;
        this.onUpdate = null; // 更新回调函数
    }

    /**
     * 启动定时器
     * @param {number} minutes - 定时器时长（分钟）
     * @param {Function} callback - 定时器到期时的回调函数
     * @param {Function} onUpdate - 定时器更新时的回调函数（可选）
     * @returns {boolean} 是否成功启动
     */
    start(minutes, callback, onUpdate = null) {
        try {
            // 验证参数
            if (!minutes || minutes <= 0) {
                console.error('定时器时长必须大于0');
                return false;
            }

            if (typeof callback !== 'function') {
                console.error('回调函数无效');
                return false;
            }

            // 取消现有定时器
            this.cancel();

            // 设置定时器参数
            this.duration = minutes * 60 * 1000; // 转换为毫秒
            this.startTime = Date.now();
            this.callback = callback;
            this.onUpdate = onUpdate;

            // 设置主定时器
            this.activeTimer = setTimeout(() => {
                this.onTimerExpired();
            }, this.duration);

            // 设置更新间隔（每秒更新一次）
            if (this.onUpdate) {
                this.updateInterval = setInterval(() => {
                    this.updateStatus();
                }, 1000);
            }

            console.log(`定时器已启动: ${minutes}分钟`);
            return true;

        } catch (error) {
            console.error('启动定时器失败:', error);
            return false;
        }
    }

    /**
     * 取消定时器
     * @returns {boolean} 是否成功取消
     */
    cancel() {
        try {
            let wasCancelled = false;

            // 清除主定时器
            if (this.activeTimer) {
                clearTimeout(this.activeTimer);
                this.activeTimer = null;
                wasCancelled = true;
            }

            // 清除更新间隔
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }

            // 重置状态
            this.startTime = null;
            this.duration = 0;
            this.callback = null;
            this.onUpdate = null;

            if (wasCancelled) {
                console.log('定时器已取消');
            }

            return wasCancelled;

        } catch (error) {
            console.error('取消定时器失败:', error);
            return false;
        }
    }

    /**
     * 检查定时器是否活动
     * @returns {boolean} 定时器是否活动
     */
    isActive() {
        return this.activeTimer !== null;
    }

    /**
     * 获取剩余时间（毫秒）
     * @returns {number} 剩余时间，如果定时器未活动返回0
     */
    getRemainingTime() {
        if (!this.isActive() || !this.startTime) {
            return 0;
        }

        const elapsed = Date.now() - this.startTime;
        const remaining = Math.max(0, this.duration - elapsed);
        return remaining;
    }

    /**
     * 获取剩余时间（格式化字符串）
     * @returns {string} 格式化的剩余时间 "MM:SS"
     */
    getRemainingTimeFormatted() {
        const remainingMs = this.getRemainingTime();
        const totalSeconds = Math.ceil(remainingMs / 1000);
        
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * 获取已经过的时间（毫秒）
     * @returns {number} 已过时间，如果定时器未活动返回0
     */
    getElapsedTime() {
        if (!this.isActive() || !this.startTime) {
            return 0;
        }

        return Date.now() - this.startTime;
    }

    /**
     * 获取总时长（毫秒）
     * @returns {number} 总时长
     */
    getTotalDuration() {
        return this.duration;
    }

    /**
     * 获取进度百分比
     * @returns {number} 进度百分比 (0-100)
     */
    getProgress() {
        if (!this.isActive() || this.duration === 0) {
            return 0;
        }

        const elapsed = this.getElapsedTime();
        return Math.min(100, (elapsed / this.duration) * 100);
    }

    /**
     * 获取定时器状态信息
     * @returns {Object} 状态信息对象
     */
    getStatus() {
        return {
            isActive: this.isActive(),
            remainingTime: this.getRemainingTime(),
            remainingTimeFormatted: this.getRemainingTimeFormatted(),
            elapsedTime: this.getElapsedTime(),
            totalDuration: this.getTotalDuration(),
            progress: this.getProgress(),
            startTime: this.startTime
        };
    }

    /**
     * 设置更新回调函数
     * @param {Function} callback - 更新回调函数
     */
    setUpdateCallback(callback) {
        this.onUpdate = callback;
        
        // 如果定时器正在运行且之前没有更新间隔，则启动更新间隔
        if (this.isActive() && !this.updateInterval && callback) {
            this.updateInterval = setInterval(() => {
                this.updateStatus();
            }, 1000);
        }
    }

    /**
     * 暂停定时器（保留剩余时间）
     * @returns {boolean} 是否成功暂停
     */
    pause() {
        if (!this.isActive()) {
            return false;
        }

        try {
            // 计算剩余时间
            const remaining = this.getRemainingTime();
            
            // 清除当前定时器
            clearTimeout(this.activeTimer);
            clearInterval(this.updateInterval);
            
            // 保存状态但不重置
            this.duration = remaining;
            this.startTime = null; // 标记为暂停状态
            this.activeTimer = null;
            this.updateInterval = null;

            console.log('定时器已暂停');
            return true;

        } catch (error) {
            console.error('暂停定时器失败:', error);
            return false;
        }
    }

    /**
     * 恢复暂停的定时器
     * @returns {boolean} 是否成功恢复
     */
    resume() {
        if (this.isActive() || this.duration <= 0 || !this.callback) {
            return false;
        }

        try {
            // 重新启动定时器
            this.startTime = Date.now();
            
            this.activeTimer = setTimeout(() => {
                this.onTimerExpired();
            }, this.duration);

            // 恢复更新间隔
            if (this.onUpdate) {
                this.updateInterval = setInterval(() => {
                    this.updateStatus();
                }, 1000);
            }

            console.log('定时器已恢复');
            return true;

        } catch (error) {
            console.error('恢复定时器失败:', error);
            return false;
        }
    }

    /**
     * 延长定时器时间
     * @param {number} additionalMinutes - 要添加的分钟数
     * @returns {boolean} 是否成功延长
     */
    extend(additionalMinutes) {
        if (!this.isActive() || additionalMinutes <= 0) {
            return false;
        }

        try {
            const additionalMs = additionalMinutes * 60 * 1000;
            this.duration += additionalMs;

            // 重新设置定时器
            clearTimeout(this.activeTimer);
            const remaining = this.getRemainingTime();
            
            this.activeTimer = setTimeout(() => {
                this.onTimerExpired();
            }, remaining);

            console.log(`定时器已延长 ${additionalMinutes} 分钟`);
            return true;

        } catch (error) {
            console.error('延长定时器失败:', error);
            return false;
        }
    }

    /**
     * 定时器到期处理
     * @private
     */
    onTimerExpired() {
        console.log('定时器到期');
        
        const callback = this.callback;
        
        // 清理定时器状态
        this.cancel();
        
        // 执行回调函数
        if (callback) {
            try {
                callback();
            } catch (error) {
                console.error('定时器回调执行失败:', error);
            }
        }
    }

    /**
     * 更新状态（内部使用）
     * @private
     */
    updateStatus() {
        if (this.onUpdate && this.isActive()) {
            try {
                this.onUpdate(this.getStatus());
            } catch (error) {
                console.error('定时器状态更新失败:', error);
            }
        }
    }

    /**
     * 销毁定时器管理器
     */
    destroy() {
        this.cancel();
        console.log('TimerManager已销毁');
    }
}