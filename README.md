# 白噪音网站 🌧️

一个基于Web Audio API的白噪音网站，提供多种环境音效的播放功能，帮助用户放松身心、提高专注力。

## ✨ 功能特性

- 🎵 **多种音效**: 雨声、海浪声、篝火声、森林声、咖啡厅环境音
- 🎛️ **音量控制**: 实时调节音量，支持静音
- ⏰ **定时器**: 支持15分、30分、60分预设定时器，以及自定义时长
- 📱 **响应式设计**: 适配各种屏幕尺寸，移动端友好
- 🎨 **极简设计**: 柔和的色彩搭配，营造放松氛围
- ⌨️ **键盘快捷键**: 支持空格键播放/暂停等快捷操作
- 💾 **设置保存**: 自动保存用户的音量和音效偏好
- 🔄 **无缝循环**: 音效无缝循环播放，不间断体验

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd white-noise-website
```

### 2. 准备音频文件

在 `audio/` 目录中放置以下音频文件：
- `rain.mp3` - 雨声
- `waves.mp3` - 海浪声
- `fire.mp3` - 篝火声
- `forest.mp3` - 森林声
- `cafe.mp3` - 咖啡厅声

详细说明请查看 [audio/README.md](audio/README.md)

### 3. 启动服务

由于浏览器的安全策略，需要通过HTTP服务器访问：

```bash
# 使用Python (推荐)
python -m http.server 8000

# 或使用Node.js
npx http-server

# 或使用PHP
php -S localhost:8000
```

### 4. 访问网站

打开浏览器访问 `http://localhost:8000`

## 🎮 使用说明

### 基本操作

1. **播放/暂停**: 点击中央的播放按钮或按空格键
2. **选择音效**: 点击下方的音效图标
3. **调节音量**: 点击设置按钮，拖动音量滑块
4. **设置定时器**: 在设置面板中选择定时器时长

### 键盘快捷键

- `空格键`: 播放/暂停
- `1-5`: 快速选择音效
- `Ctrl/Cmd + S`: 打开/关闭设置面板
- `Esc`: 关闭设置面板

## 🏗️ 项目结构

```
white-noise-website/
├── index.html              # 主HTML文件
├── css/
│   └── style.css          # 样式文件
├── js/
│   ├── AudioManager.js    # 音频管理模块
│   ├── TimerManager.js    # 定时器管理模块
│   └── main.js           # 主控制逻辑
├── audio/                 # 音频文件目录
│   ├── README.md         # 音频文件说明
│   ├── rain.mp3
│   ├── waves.mp3
│   ├── fire.mp3
│   ├── forest.mp3
│   └── cafe.mp3
└── README.md             # 项目说明
```

## 🛠️ 技术栈

- **前端**: 原生JavaScript (ES6+)
- **音频处理**: Web Audio API
- **样式**: CSS3 (Flexbox, Grid, Animations)
- **存储**: localStorage
- **兼容性**: 现代浏览器 (Chrome 66+, Firefox 60+, Safari 11.1+, Edge 79+)

## 🔧 核心模块

### AudioManager
负责音频的加载、播放、停止和音量控制：
- 基于Web Audio API实现
- 支持多音源管理
- 平滑的音量调节和淡入淡出效果
- 完善的错误处理

### TimerManager  
提供定时器功能：
- 支持多种时长设置
- 实时显示剩余时间
- 支持暂停、恢复、延长等操作

### 主控制器 (main.js)
协调各模块间的交互：
- 事件绑定和处理
- 状态管理
- 用户设置保存
- UI更新

## 🎨 设计特色

- **极简主义**: 减少视觉干扰，突出核心功能
- **柔和色调**: 使用低饱和度颜色，营造放松氛围  
- **流畅动画**: 平滑的过渡效果和悬停反馈
- **响应式布局**: 适配各种设备和屏幕尺寸

## 🔍 浏览器兼容性

| 浏览器 | 最低版本 | 说明 |
|--------|----------|------|
| Chrome | 66+ | 完全支持 |
| Firefox | 60+ | 完全支持 |
| Safari | 11.1+ | 完全支持 |
| Edge | 79+ | 完全支持 |

## 📝 开发说明

### 本地开发

1. 修改代码后刷新浏览器即可看到效果
2. 使用浏览器开发者工具进行调试
3. 查看控制台输出了解应用状态

### 添加新音效

1. 在 `js/main.js` 中的 `soundConfig` 对象添加新配置
2. 在 `index.html` 中添加对应的按钮元素
3. 在 `audio/` 目录中放置音频文件

### 自定义样式

修改 `css/style.css` 中的CSS变量来调整颜色主题：

```css
:root {
    --primary-color: #6B73FF;
    --secondary-color: #9AA0FF;
    --background-color: #F8F9FA;
    /* ... */
}
```

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- 感谢所有提供免费音频资源的创作者
- 感谢Web Audio API让音频处理变得简单
- 感谢所有测试和反馈的用户

---

**享受宁静的时光** 🧘‍♀️# larry-noise-app
