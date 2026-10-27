# YoungJump · 本地漫画阅读器

免费、无需注册的本地漫画阅读器。所有数据仅保存在你的设备本地，不上传任何服务器。

## 功能特性

- **本地导入**：支持导入图片（JPG/PNG/WebP/GIF/BMP）与 ZIP/CBZ 压缩包，自动按文件名排序分页
- **书架管理**：封面缩略图、网格展示、长按弹出操作菜单
- **双模式阅读**：滚动模式 / 翻页模式，支持上下、左右翻页方向
- **手势交互**：点击翻页、双击放大、双指缩放、自动翻页
- **阅读记忆**：自动记录进度，下次从上次位置继续
- **书签 / 收藏 / 历史**：三类独立管理
- **标签 / 作者**：编辑漫画元信息，按标签、作者搜索
- **搜索**：按标题、作者、标签搜索，保留搜索历史
- **主题**：浅色 / 深色 / 跟随系统，可自由切换
- **PWA 支持**：可安装到主屏幕，离线可用

## 使用方法

### 方式一：直接部署（推荐）

把整个 `youngjump` 目录部署到任意静态服务器即可。需要 HTTPS 才能使用 PWA 的 Service Worker 离线缓存。

本地预览：

```bash
cd youngjump
npx serve .        # 或任意静态服务器
```

### 方式二：本地运行

```bash
cd youngjump
python -m http.server 8080
# 浏览器打开 http://localhost:8080
```

## 技术栈

纯前端实现：HTML + CSS + 原生 JavaScript (ES Modules)

- 数据存储：IndexedDB（漫画页面二进制数据）+ localStorage（书签、搜索历史）
- ZIP 解压：JSZip
- 离线缓存：Service Worker

## 目录结构

```
youngjump/
├── index.html          # 应用入口
├── manifest.json       # PWA 清单
├── sw.js               # Service Worker（离线缓存）
├── css/
│   └── style.css       # 设计系统（双主题）
├── js/
│   ├── app.js          # 主应用（路由、书架、搜索、我的）
│   ├── reader.js       # 阅读器（翻页、手势、缩放）
│   ├── storage.js      # 数据层（IndexedDB 封装）
│   ├── ui.js           # UI 组件（图标、Toast、弹层）
│   └── jszip.min.js    # ZIP 解压库
└── assets/
    ├── icon-192.png    # 应用图标
    ├── icon-512.png
    └── icon.svg
```

## 说明

- 本应用为原创设计，名称 "YoungJump" 及图标为独立品牌标识，不涉及任何第三方商标。
- 数据隐私：漫画文件与阅读记录全部保存在浏览器本地 IndexedDB，清除浏览器数据即清除全部内容。
