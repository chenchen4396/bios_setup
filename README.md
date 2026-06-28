# BIOS 选项管理器

基于 DMTF Redfish AttributeRegistry (DSP8010 v1.3.0) 规范的服务器 BIOS 配置管理工具。
纯 HTML/CSS/JS 前端 + Node.js Express 后端，零构建工具，支持内网多人协作与数据持久化。

> **架构设计文档**：详见 [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [内网部署](#内网部署)
- [API 参考](#api-参考)
- [内置机型](#内置机型)
- [数据模型](#数据模型)
- [开发指南](#开发指南)
- [编码规范](#编码规范)
- [已知问题](#已知问题)

---

## 功能特性

### 核心功能

- **多机型管理** — 内置 5 款超聚变 FusionServer 机型，支持自由切换、增删、导入
- **菜单导航** — 层级菜单树，按 BIOS MenuPath 组织属性，支持折叠和自定义添加
- **属性编辑** — 5 种 Redfish 类型（枚举/整数/字符串/布尔/密码），类型感知编辑器与校验
- **批量编辑** — 选中菜单后一键进入批量模式，对表格内所有属性快速修改
- **依赖评估** — 实现 DMTF Map 依赖关系引擎，自动处理属性间的隐藏/灰显/只读级联

### 数据交互

- **多维筛选** — 按属性标识/类型/来源/平台/是否只读/是否支持 Redfish 组合筛选，激活标签可视化
- **全局搜索** — 跨所有属性实时搜索，支持属性名和中文描述，多 token 加权评分
- **导入导出** — 支持 Registry JSON (.json/.json.gz) 和 Excel (.xlsx) 导入，Excel 导出
- **持久化存储** — 后端 JSON 文件存储，服务重启不丢数据；离线时自动回退 localStorage
- **乐观锁** — 多人同时编辑时通过 `_version` 字段防止数据覆盖

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | 原生 JavaScript (ES2020+) | 无框架，无构建工具 |
| **CDN 依赖** | SheetJS (xlsx 0.18.5)、pako (2.1.0) | Excel 解析、gzip 解压 |
| **后端** | Node.js 18+、Express 4.x | 唯一 npm 依赖：express |
| **存储** | JSON 文件 (服务端) / localStorage (离线回退) | 零数据库 |
| **规范** | DMTF DSP8010 AttributeRegistry v1.3.0 | Redfish BIOS 标准 |
| **样式** | 原生 CSS + CSS 变量 | Ant Design 配色体系 |

---

## 项目结构

```
bios-manager/
├── index.html                  # 单页应用入口，定义页面结构
├── server.js                   # Express 后端 (静态服务 + REST API + 文件持久化)
├── package.json                # Node.js 依赖声明
├── start.bat                   # Windows 一键启动脚本
├── README.md                   # 本文档
├── ARCHITECTURE.md             # 架构设计文档 (开发者必读)
│
├── css/
│   └── styles.css              # 全局样式 + 设计变量 (:root)
│
├── js/
│   │                           # ── 数据层 ──
│   ├── models.js               # Redfish 数据模型 / 枚举常量 / 工厂函数
│   ├── storage.js              # 双模式持久化 (API + localStorage)
│   │
│   │                           # ── 业务逻辑层 ──
│   ├── parser.js               # 多格式解析器 (JSON / JSON.gz / Excel)
│   ├── menu-tree.js            # MenuPath → 层级菜单树构建器
│   ├── dependency-engine.js    # DMTF Map 依赖评估引擎 (递归级联)
│   │
│   │                           # ── 表现层 ──
│   ├── editors.js              # 类型感知内联编辑器 (5 种 AttrType)
│   │                           # ── 表现层 (UI 子模块) ──
│   ├── ui-common.js            # 转义工具 + 通知 + 模态框
│   ├── ui-sidebar.js           # 侧边栏渲染 + 机型选择器 + 筛选下拉
│   ├── ui-table.js             # 表格渲染 + 行渲染 + 筛选标签 + 搜索
│   ├── ui-forms.js             # 添加/编辑表单构建 (菜单 + 选项)
│   ├── ui-renderer.js          # 统一外观入口 (代理上述 4 个子模块)
│   ├── export.js               # 导出 (Excel + Registry JSON)
│   │
│   │                           # ── 数据源 ──
│   ├── demo-data.js            # 5 款超聚变机型内置数据 + 工厂函数
│   │
│   │                           # ── 控制层 ──
│   └── app.js                  # AppState 主控制器 (状态/事件/流程编排)
│
├── tools/
│   └── gen-template.js         # Excel 导入模板生成工具
│
└── data/                       # 运行时数据目录 (自动创建, 不提交 Git)
    ├── _index.json             # 机型目录索引
    └── FUSION_*.json           # 各机型完整 Profile JSON
```

### 架构分层

```
浏览器端                          Node.js 后端
┌──────────────┐                ┌──────────────┐
│  控制层 app  │                │  server.js   │
│  (AppState)  │                │  (Express)   │
├──────────────┤   HTTP REST    ├──────────────┤
│  表现层 UI   │ ◄──────────► │  REST API    │
│  (渲染/编辑)  │                │  (CRUD+锁)   │
├──────────────┤                ├──────────────┤
│  业务逻辑层  │                │  文件持久化  │
│ (解析/引擎)   │                │  (data/*.json)│
├──────────────┤                └──────────────┘
│  数据层      │
│ (模型/存储)   │
└──────────────┘
```

---

## 快速开始

### 环境要求

- Node.js 18+（服务端运行）
- 现代浏览器（Chrome / Edge / Firefox）

### 启动

```bash
# 1. 安装依赖
npm install

# 2. 启动服务
node server.js
# 或双击 start.bat (Windows)

# 3. 浏览器访问
http://localhost:3000
```

首次打开页面无历史数据时，自动加载演示机型「FusionServer 2288H V7」（112 项 BIOS 属性）。

---

## 内网部署

```bash
# 1. 服务器安装 Node.js 18+
# 2. 拷贝整个项目文件夹到服务器
# 3. 安装依赖并启动
cd bios-manager
npm install
node server.js

# 服务监听 0.0.0.0:3000，局域网内均可访问
# 同事通过 http://<服务器IP>:3000 访问
```

### 数据持久化

- 数据存储在 `data/` 目录下的 JSON 文件中，服务重启不丢失
- 每个机型一个独立 JSON 文件，另有 `_index.json` 机型目录
- 建议将 `data/` 加入 `.gitignore`，避免提交到版本库
- 备份只需拷贝 `data/` 目录

### 离线模式

当后端不可用时，前端自动回退到浏览器 localStorage：
- 数据仅存储在当前浏览器
- 换浏览器/清缓存会丢失
- 后端恢复后需手动重新导入

---

## API 参考

### REST 端点

| 端点 | 方法 | 说明 | 请求体 |
|------|------|------|--------|
| `/api/systems` | GET | 列出所有机型 | — |
| `/api/systems/:id` | GET | 读取单机型完整 Profile | — |
| `/api/systems/:id` | POST | 保存/更新机型 | `{ profile, _version }` |
| `/api/systems/:id` | DELETE | 删除机型 | — |
| `/api/demo/load` | POST | 加载演示机型 (2288H V7) | — |
| `/api/models/load-all` | POST | 加载全部 5 个机型 | — |

### 乐观锁机制

保存时请求体携带 `_version` 字段，服务端比对已存储版本号：
- 版本一致 → 写入成功，`_version` 自增
- 版本不一致 → 返回 HTTP 409，提示「数据已被他人修改，请刷新」

---

## 内置机型

共 5 款超聚变 FusionServer 机型，每款拥有独立完整的 BIOS 属性集：

| 机型 | 属性数 | 规格 | 特色属性 |
|------|--------|------|---------|
| 2288H V7 | 112 | 2U2P / DDR5 / PCIe 5.0 | 全 Prefetcher / SGX / TME / Optane PMem |
| 1288H V7 | 75 | 1U2P / DDR5 / PCIe 5.0 | 热节流 / 动态功率封顶 / Rank 备用 |
| 5288 V7 | 70 | 4U2P / DDR5 / 44 盘位 | JBOD 直通 / 写缓存预读 / 存储散热 |
| 2488H V7 | 89 | 2U4P / DDR5 / PCIe 5.0 | UPI 链路 / NUMA 域 / 全镜像 / 交织粒度 |
| 2288H V6 | 99 | 2U2P / DDR4 / PCIe 4.0 | Ice Lake / SpeedStep / SST / VROC |

属性涵盖处理器、内存、存储、网络、电源、启动、安全、PCIe、USB、串口、性能调优、服务器管理等 BIOS 菜单路径。

---

## 数据模型

遵循 DMTF DSP8010 AttributeRegistry v1.3.0 规范，核心结构：

```
SystemProfile (机型配置)
├── menuMap: Map<MenuName, Menu>          # 菜单树
├── attrMap: Map<AttrName, Attribute>     # 属性字典
├── dependencies: Dependency[]            # 依赖规则
└── _version: number                      # 乐观锁版本号

Attribute (BIOS 属性 — 30+ 字段)
├── type: Enumeration | Integer | String | Boolean | Password
├── defaultValue / currentValue / modifiedValue    # 三值机制
├── readOnly / immutable / supportsRedfish         # 状态标志
├── depHidden / depGrayedOut / depReadOnly         # 依赖引擎运行时状态
└── menuPath: string                               # 菜单归属路径

Dependency (DMTF Map 依赖规则)
├── mapFromAttribute + mapFromCondition + mapFromValue   # 条件
├── mapToAttribute + mapToProperty + mapToValue          # 效果
└── mapTerms: AND | OR                                   # 多条件聚合
```

详细字段定义见 [ARCHITECTURE.md - 核心数据模型](./ARCHITECTURE.md#3-核心数据模型)。

---

## 导入格式

支持三种文件格式：

| 格式 | 扩展名 | 说明 |
|------|--------|------|
| Registry JSON | `.json` | 标准 Redfish AttributeRegistry JSON |
| 压缩 JSON | `.json.gz` | gzip 压缩的 Registry JSON |
| Excel | `.xlsx` / `.xls` | 模板导入，含「菜单结构」和「BIOS 选项」Sheet |

Excel 模板通过 `node tools/gen-template.js` 生成。

---

## 开发指南

### 新增机型数据

在 `js/demo-data.js` 中定义机型并添加到 `ALL_MODELS` 数组：

```javascript
const MODEL_XXX = {
    productName: 'FusionServer XXX',
    systemId: 'FUSION_XXX',
    firmwareVersion: 'iBMC V690 v3.45',
    attrs: [
        { name: 'HyperThreading', type: 'Enumeration', def: 'Enabled',
          disp: 'Hyper-Threading', dispZh: '超线程技术',
          menu: './Advanced/ProcessorOptions', ro: false, rb: true,
          val: [E('Enabled'), E('Disabled')] }
        // ... 更多属性
    ]
};
```

### 新增属性类型

需修改 5 个文件，详见 [ARCHITECTURE.md - 扩展指南](./ARCHITECTURE.md#6-扩展指南)。

### 修改 UI 样式

CSS 变量定义在 `css/styles.css` 的 `:root` 中：

```css
:root {
    --color-primary: #1890ff;       /* 主题色 */
    --color-success: #52c41a;       /* 成功 */
    --color-warning: #faad14;       /* 警告 */
    --color-danger: #ff4d4f;        /* 危险 */
    --sidebar-width: 260px;         /* 侧边栏宽度 */
    --toolbar-height: 48px;         /* 工具栏高度 */
}
```

### 脚本加载顺序

`index.html` 中的 `<script>` 标签顺序不可调整，遵循依赖链：

```
models → storage → parser → menu-tree → dependency-engine
       → editors → ui-renderer → export → demo-data → app
```

---

## 编码规范

| 类别 | 约定 | 示例 |
|------|------|------|
| 全局单例 | PascalCase | `Storage`, `Parser`, `UIRendererer` |
| 枚举常量 | PascalCase + 大写值 | `AttrType.Enumeration` |
| 工厂函数 | camelCase, `create` 前缀 | `createAttribute(raw)` |
| 计算属性 | `is`/`has`/`get` 前缀 | `isEffectivelyHidden(attr)` |
| HTML ID | kebab-case | `filter-readonly` |
| CSS 类 | kebab-case | `row-readonly` |
| 数据字段 | PascalCase (Redfish) / camelCase (扩展) | `AttributeName` / `menuPath` |

详细规范见 [ARCHITECTURE.md - 编码规范](./ARCHITECTURE.md#7-编码规范)。

---

## 已知问题

技术债务与已知 Bug 清单见 [ARCHITECTURE.md - 技术债务清单](./ARCHITECTURE.md#9-技术债务清单)。

---

## 浏览器兼容

支持所有现代浏览器（Chrome 90+ / Edge 90+ / Firefox 88+），需启用 JavaScript 和 localStorage。

---

## 许可

内部工具，仅供团队使用。
