# Zjin - 情侣纪念画布

一个基于 Vue 3 + Fabric.js + Supabase 的情侣纪念记录应用，支持在无限画布上创建、排列和管理回忆卡片，配合手绘涂鸦、实时同步等功能。

## 功能概览

### V0.1 - 基础架构
- 邀请码配对登录系统
- 暖色调设计系统（CSS 变量 + Tailwind）
- Vue Router + Pinia 状态管理

### V0.2 - 回忆记录
- 回忆 CRUD（创建、查看、编辑、删除）
- 图片上传（Supabase Storage）
- 时间轴浏览视图
- 分类与标签管理

### V0.3 - 无限画布
- Fabric.js 无限画布，支持平移和缩放
- 回忆卡片渲染（封面图、标题、日期、标签、置顶标记）
- 单击卡片弹出详情预览面板，双击进入编辑
- 右键/长按上下文菜单（置顶、编辑、删除）
- 手绘涂鸦工具（画笔、荧光笔、橡皮擦）
- 涂鸦逐条持久化（Supabase 增量 CRUD + 实时同步）
- 画布内搜索（按标题、内容、标签过滤）
- 双指缩放（触屏设备）
- 伴侣实时同步（回忆 + 涂鸦 Supabase Realtime）
- 撤销/重做（Ctrl+Z / Ctrl+Shift+Z，支持卡片移动和涂鸦操作）
- 自定义确认弹窗（替代浏览器 confirm）
- Composable 架构（useCanvas / usePanZoom / useDrawTools / useCardRenderer / useDrawingPersistence / useHistory）

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Vue 3.5 + TypeScript |
| 构建 | Vite |
| 状态管理 | Pinia 3 |
| 路由 | Vue Router 5 |
| 画布 | Fabric.js 6 |
| 后端 | Supabase（Auth + Database + Storage + Realtime） |
| 样式 | Tailwind CSS 4 + 自定义设计系统 |
| 动画 | GSAP 3 |

## 项目结构

```
src/
├── assets/
│   └── main.css          # 设计系统（配色、圆角、阴影、动画）
├── components/
│   ├── AppLayout.vue          # 应用布局
│   ├── MemoryCard.vue         # 回忆卡片组件（列表/网格视图）
│   ├── MemoryDetailPanel.vue  # 回忆详情底部面板
│   ├── QuickCreatePanel.vue   # 画布快速创建面板
│   ├── CanvasToolbar.vue      # 绘图工具栏
│   ├── CanvasContextMenu.vue  # 右键/长按菜单
│   ├── CanvasSearchBar.vue    # 画布搜索栏
│   └── ConfirmDialog.vue      # 自定义确认弹窗
├── composables/
│   ├── useSupabase.ts          # Supabase 客户端
│   ├── useRealtime.ts          # Realtime 订阅
│   ├── useCanvas.ts            # FabricCanvas 生命周期、坐标转换
│   ├── usePanZoom.ts           # 平移、滚轮缩放、双指缩放
│   ├── useDrawTools.ts         # 画笔/荧光笔/橡皮擦状态管理
│   ├── useCardRenderer.ts      # 卡片增量渲染、动画、搜索
│   ├── useDrawingPersistence.ts # 涂鸦逐条 CRUD + 实时同步
│   └── useHistory.ts           # 撤销/重做栈
├── router/
│   └── index.ts          # 路由配置
├── stores/
│   ├── auth.ts           # 认证状态
│   ├── memory.ts         # 回忆数据 CRUD
│   ├── category.ts       # 分类管理
│   └── media.ts          # 媒体文件管理
├── types/
│   └── index.ts          # TypeScript 类型定义
├── views/
│   ├── LoginView.vue     # 登录页
│   ├── CanvasView.vue    # 无限画布（主视图）
│   ├── TimelineView.vue  # 时间轴视图
│   ├── MemoryFormView.vue # 回忆编辑表单
│   └── StatsView.vue     # 统计页
├── App.vue
└── main.ts
```

## 数据库结构

### memories - 回忆记录
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| couple_id | uuid | 情侣配对 ID |
| title | text | 标题 |
| content | text | 内容 |
| date | date | 回忆日期 |
| category_id | uuid | 分类 |
| canvas_x | float | 画布 X 坐标 |
| canvas_y | float | 画布 Y 坐标 |
| is_pinned | boolean | 是否置顶 |
| bg_color | text | 卡片背景色 |

### canvas_drawings - 画布涂鸦
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| couple_id | uuid | 情侣配对 ID |
| path_data | jsonb | Fabric.js Path JSON |
| sort_order | integer | 排序 |

### media - 媒体文件
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| memory_id | uuid | 关联回忆 |
| url | text | 文件 URL |
| sort_order | integer | 排序 |

## 快速开始

### 环境要求
- Node.js 18+
- Supabase 项目

### 安装依赖
```sh
npm install
```

### 配置环境变量
创建 `.env` 文件：
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 运行数据库迁移
在 Supabase Dashboard 的 SQL Editor 中依次执行 `supabase/migrations/` 下的 SQL 文件。

### 开发模式
```sh
npm run dev
```

### 构建生产版本
```sh
npm run build
```

## 设计规范

### 配色
- 主色调：暖粉 `#F5E6E0` ~ `#E8D0C8`
- 强调色：`#E8A0BF`（粉色）、`#D4A574`（暖棕）
- 文字色：`#4A3728`（深棕）
- 背景色：`#FEFCFB`（暖白）

### 卡片尺寸
- 宽度：240px
- 有图高度：260px（封面 180px + 文字区 80px）
- 无图高度：80px
- 圆角：16px

## 版本历史

### V0.3 - 无限画布
- Fabric.js 无限画布集成
- 卡片拖拽、缩放、平移
- 手绘涂鸦工具
- 上下文菜单操作
- 画布内搜索
- 实时同步
- 撤销/重做
- Composable 架构重构

### V0.2 - 回忆记录
- 回忆 CRUD + 图片上传
- 时间轴视图
- 分类与标签

### V0.1 - 项目初始化
- 登录系统 + 设计系统
- 项目架构搭建
