# 羽球社区 · Badminton Community

🏸 一个纯静态的羽毛球学习社区 · 教学 + 实战 · 原生 JS 无构建 · Made by [KD_klin](https://github.com/KD-klin)

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://kd-klin.github.io/badminton-community/)
[![No Build](https://img.shields.io/badge/build-none-blue)]()
[![Vanilla JS](https://img.shields.io/badge/vanilla-JS-yellow)]()
[![License](https://img.shields.io/badge/license-MIT-lightgrey)]()
[![Made by KD_klin](https://img.shields.io/badge/made%20by-KD__klin-blueviolet)](https://github.com/KD-klin)

---

## 📖 这是什么

把散落在 B 站的羽毛球教学视频，整理成一份**可检索、可收藏、可持续更新**的个人知识库。

没有框架、没有构建、没有依赖。clone 下来，起一个静态服务器就能跑。

> 面向中文羽毛球爱好者，兼顾移动端阅读体验。

---

## ✨ 功能

- 🏸 **两大模块** — 教学（技术拆解）/ 实战（战术解析）
- 🎬 **视频源灵活** — B 站 iframe 嵌入 + 本地 mp4 播放
- 🔍 **全站搜索** — 标题 / 描述 / 标签全文匹配
- 🏷️ **标签筛选** — 点 Chip 过滤，URL 可分享
- ♥ **收藏夹** — localStorage 持久化，导航栏实时计数
- 🕘 **最近浏览** — 自动记录最近 8 条，首页展示
- 🌗 **深色模式** — 跟随系统 + 手动切换，记忆偏好
- 🧭 **面包屑 + 相关推荐** — 详情页形成浏览闭环
- 📤 **分享按钮** — 调用系统分享或复制链接
- 🎨 **苹果风格 UI** — 毛玻璃导航 / 大圆角 / 发丝线 / 克制动效
- 📱 **响应式** — 移动端单列，桌面端双列
- 🚀 **零依赖零构建** — 原生 HTML / CSS / JS（ES Module）

---

## 📸 截图

> 建议截图三张：首页、教学列表、详情页。放到 `docs/screenshots/` 目录。

| 首页 | 教学列表 | 详情页 |
|:---:|:---:|:---:|
| ![Home](docs/screenshots/home.png) | ![Teaching](docs/screenshots/teaching.png) | ![Detail](docs/screenshots/detail.png) |

---

## 🚀 本地运行

ES Module 需要通过 HTTP 协议加载，**不能直接双击 `index.html`**。

```bash
# 方式一：Python
python3 -m http.server 8000

# 方式二：Node
npx serve .

# 方式三：VS Code Live Server 插件
# 右键 index.html → Open with Live Server
```

然后访问 <http://localhost:8000>。

---

## 🗂️ 目录结构

```
badminton-community/
├── index.html              # 唯一入口
├── README.md
├── LICENSE                 # MIT
├── css/
│   ├── base.css            # 设计令牌 + 深色主题 + reset
│   ├── layout.css          # 导航 / 页脚 / 容器 / 网格
│   └── components.css      # 卡片 / 按钮 / 徽章 / 骨架屏
├── js/
│   ├── app.js              # 入口：主题初始化 + 路由注册
│   ├── router.js           # Hash 路由（:param + ?query）
│   ├── store.js            # localStorage：主题 / 收藏 / 最近
│   ├── components/
│   │   └── card.js         # 视频卡片组件
│   ├── data/
│   │   ├── teaching.js     # 教学内容数据
│   │   └── practice.js     # 实战内容数据
│   └── views/
│       ├── home.js
│       ├── teaching.js
│       ├── practice.js
│       ├── detail.js
│       └── favorites.js
├── videos/                 # 本地视频目录
│   └── .gitkeep
└── .github/
    └── workflows/
        └── deploy.yml      # 自动部署到 Pages
```

---

## ➕ 如何新增视频

打开 `js/data/teaching.js` 或 `js/data/practice.js`，在数组末尾追加一条记录即可。

### B 站视频

```javascript
{
  id: 'unique-id',
  title: '标题',
  desc: '一句话简介',
  tags: ['标签1', '标签2'],
  level: '初级',        // 初级 / 中级 / 高级
  duration: '08:24',
  views: 0,
  type: 'bilibili',
  bvid: 'BV1xxxxxxxxx', // 只填 BV 号
  content: '详细介绍……'
}
```

### 本地视频

```javascript
{
  id: 'unique-id',
  title: '标题',
  desc: '一句话简介',
  tags: ['标签'],
  level: '初级',
  duration: '06:18',
  views: 0,
  type: 'local',
  src: 'videos/your-video.mp4',
  content: '详细介绍……'
}
```

刷新页面即可看到，**无需改动任何视图代码**。

---

## 🧩 如何扩展新模块

以新增「装备评测」为例，四步完成：

1. 新建 `js/data/gear.js`，导出 `gearItems` 数组
2. 新建 `js/views/gear.js`，实现 `renderGear(app)`
3. 在 `js/app.js` 中 `register('gear', renderGear)`
4. 在 `index.html` 的 `.site-nav` 中加入：
   ```html
   <a href="#/gear" data-nav="gear">装备</a>
   ```

主题、路由、收藏、搜索等基础设施会自动生效。

---

## 🌐 部署到 GitHub Pages

### 方式一：自动部署（推荐）

项目已包含 `.github/workflows/deploy.yml`，推送到 `main` 分支即自动部署。

第一次部署前：

1. 进入仓库 **Settings → Pages**
2. **Source** 选择 **GitHub Actions**
3. 推送代码，等待 Actions 跑完
4. 访问 `https://<你的用户名>.github.io/badminton-community/`

### 方式二：手动部署

直接把整个项目推到 `gh-pages` 分支，Pages Source 选该分支即可。

### 方式三：Vercel / Netlify

导入仓库，构建命令留空，输出目录填 `.`，一键部署。

---

## 🎨 自定义

所有设计令牌集中在 `css/base.css` 的 `:root` 与 `[data-theme="dark"]`：

```css
:root {
  --color-accent: #0071e3;   /* 换主色 */
  --radius-card: 18px;       /* 换圆角 */
  --space-md: 24px;          /* 换间距 */
}
```

改一处，全站生效。

---

## 🤝 贡献

欢迎提 Issue 和 PR。

- 新增视频 / 修正内容 → 直接改 `js/data/*.js`
- 新功能 → 先在 Issue 里讨论
- 代码风格遵循 [Google HTML/CSS Style Guide](https://google.github.io/styleguide/htmlcssguide.html)
  - 2 空格缩进
  - 标签 / 属性 / 选择器全小写
  - HTTPS 资源优先
  - 布尔属性不赋值

---

## 📄 License

[MIT](LICENSE) © [KD_klin](https://github.com/KD-klin)

---

## 🙏 致谢

- 灵感来自 [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/)
- 视频托管来自 [bilibili](https://www.bilibili.com/)
- 图标使用系统 emoji，无第三方依赖

---

<p align="center">Made with 🏸 by <a href="https://github.com/KD-klin">KD_klin</a></p>
