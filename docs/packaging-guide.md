# 静谧之夜应用打包指南

## 项目概述

这是一个基于Web Audio API的白噪音应用，支持多种环境音效播放。本指南提供将该Web应用打包为各平台原生应用的详细步骤。

## 打包前准备

### 1. 确保项目完整
- 确认所有音频文件已放置在`audio/`目录下
- 确认项目可以在本地服务器正常运行
- 准备应用图标（不同平台有不同尺寸要求）

### 2. 安装必要工具
根据目标平台，需要安装相应的开发工具：
- **iOS**: Xcode (Mac)
- **Android**: Android Studio
- **桌面平台**: Node.js 和 npm

## 各平台打包方案

### 1. iPhone应用 (iOS)

#### 方案A: 使用Capacitor

```bash
# 1. 初始化npm项目（如果尚未初始化）
npm init -y

# 2. 安装Capacitor
npm install @capacitor/core @capacitor/cli

# 3. 初始化Capacitor
npx cap init "静谧之夜" "com.yourdomain.whitenoise" --web-dir .

# 4. 添加iOS平台
npx cap add ios

# 5. 同步项目文件
npx cap sync ios

# 6. 打开Xcode进行进一步配置和打包
npx cap open ios
```

#### Xcode配置步骤
1. 在Xcode中选择你的开发团队
2. 配置应用图标和启动屏幕
3. 确保添加了音频后台播放权限
4. 选择"Product > Archive"进行打包
5. 按照提示完成签名和发布流程

### 2. 安卓应用

#### 使用Capacitor

```bash
# 1. 初始化npm项目（如果尚未初始化）
npm init -y

# 2. 安装Capacitor
npm install @capacitor/core @capacitor/cli

# 3. 初始化Capacitor
npx cap init "静谧之夜" "com.yourdomain.whitenoise" --web-dir .

# 4. 添加Android平台
npx cap add android

# 5. 同步项目文件
npx cap sync android

# 6. 打开Android Studio进行进一步配置和打包
npx cap open android
```

#### Android Studio配置步骤
1. 配置应用图标
2. 在`AndroidManifest.xml`中添加音频后台播放权限
3. 构建签名APK或AAB
4. 按照提示完成发布流程

### 3. Mac应用

#### 方案A: 使用Electron

```bash
# 1. 初始化npm项目（如果尚未初始化）
npm init -y

# 2. 安装Electron和打包工具
npm install electron electron-packager --save-dev

# 3. 创建main.js文件（Electron主进程）
# 在项目根目录创建main.js文件，内容如下：
```

创建`main.js`文件内容：
```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');
  // 打开开发者工具
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

继续执行打包命令：
```bash
# 4. 打包Mac应用
npx electron-packager . "静谧之夜" --platform=darwin --arch=x64 --out=dist
```

### 4. Windows应用

#### 使用Electron

```bash
# 1. 初始化npm项目（如果尚未初始化）
npm init -y

# 2. 安装Electron和打包工具
npm install electron electron-packager --save-dev

# 3. 创建main.js文件（同上Mac应用部分）

# 4. 打包Windows应用
npx electron-packager . "静谧之夜" --platform=win32 --arch=x64 --out=dist
```

## 高级配置

### 音频后台播放权限

#### iOS
在`Info.plist`中添加：
```xml
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
</array>
```

#### Android
在`AndroidManifest.xml`中添加：
```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

## 常见问题解答

1. **打包后音频无法播放？**
   - 检查音频文件路径是否正确
   - 确认已添加必要的音频权限
   - 对于移动平台，确保在后台模式下也能播放音频

2. **应用图标不显示？**
   - 检查图标文件路径和尺寸是否符合平台要求
   - 确保在打包配置中正确引用了图标文件

3. **移动应用安装后闪退？**
   - 检查是否有未处理的JavaScript错误
   - 确认所有依赖文件都已正确打包

4. **如何签名应用以便发布到应用商店？**
   - iOS: 在Xcode中配置开发者证书和描述文件
   - Android: 在Android Studio中生成签名密钥并配置

## 总结

本指南提供了将静谧之夜Web应用打包为各平台原生应用的详细步骤。根据您的需求，选择适合的平台和工具进行打包。如果遇到问题，请参考常见问题解答或查阅相关工具的官方文档。