# BIOS 选项管理器 — 架构设计文档

> 面向开发者与维护者，描述系统分层、模块职责、数据模型、数据流与扩展方式。

---

## 1. 分层架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                      浏览器 (Browser)                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              应用控制层 (App Layer)                    │   │
│  │         app.js — AppState 单例控制器                   │   │
│  │    状态管理 / 事件绑定 / 流程编排 / 启动入口            │   │
│  └────────────────────┬────────────────────────────────┘   │
│                       │ 调用                                │
│  ┌────────────────────┴────────────────────────────────┐   │
│  │              UI 渲染层 (Presentation Layer)            │   │
│  │  ui-renderer.js  —  侧边栏 / 表格 / 搜索 / 筛选 / 模态  │   │
│  │  editors.js      —  类型感知内联编辑器                  │   │
│  │  export.js       —  Excel 导出                          │   │
│  └────────────────────┬────────────────────────────────┘   │
│                       │ 依赖                                │
│  ┌────────────────────┴────────────────────────────────┐   │
│  │              业务逻辑层 (Business Layer)               │   │
│  │  dependency-engine.js  —  DMTF Map 依赖评估引擎        │   │
│  │  menu-tree.js          —  MenuPath → 层级菜单树         │   │
│  │  parser.js             —  多格式解析 (JSON/gz/Excel)    │   │
│  └────────────────────┬────────────────────────────────┘   │
│                       │ 依赖                                │
│  ┌────────────────────┴────────────────────────────────┐   │
│  │              数据层 (Data Layer)                       │   │
│  │  storage.js  —  双模式持久化 (API + localStorage)      │   │
│  │  models.js   —  Redfish 数据模型 / 工厂函数 / 枚举      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              数据源 (Data Source)                      │   │
│  │  demo-data.js  —  通用服务器内置演示数据                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │ HTTP REST API
┌─────────────────────────┴───────────────────────────────────┐
│                    Node.js 后端 (Server)                     │
│                                                             │
│  server.js                                                  │
│  ├── Express 静态文件服务 (index.html / js/ / css/)         │
│  ├── REST API (/api/systems CRUD + /api/demo/load)         │
│  ├── JSON 文件持久化 (data/*.json)                          │
│  ├── 乐观锁 (_version 字段冲突检测)                         │
│  └── vm 沙箱复用前端 demo-data.js 生成演示数据              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 模块依赖关系

脚本加载顺序（`index.html`）严格遵循依赖链，**不可调整顺序**：

```
models.js          ← 基础层：枚举常量 + 工厂函数 + 计算属性 (无依赖)
  ↓
storage.js         ← 持久化层：API/localStorage 双模式 (依赖 fetch)
  ↓
parser.js          ← 解析层：JSON/gz/Excel → SystemProfile (依赖 models + CDN)
  ↓
menu-tree.js       ← 菜单层：MenuPath 字符串 → 层级树 (依赖 models)
  ↓
dependency-engine.js  ← 引擎层：DMTF Map 递归级联评估 (无项目依赖)
  ↓
editors.js         ← 编辑器层：按 AttrType 分派控件 (依赖 models)
  ↓
ui-common.js       ← UI 公共层: 转义/通知/模态框 (无项目依赖)
  ↓
ui-sidebar.js      ← 侧边栏层: 菜单树/机型选择器/筛选 (依赖 menu-tree/storage)
  ↓
ui-table.js        ← 表格层: 表格渲染/筛选标签/搜索 (依赖 editors/models)
  ↓
ui-forms.js        ← 表单层: 添加/编辑表单构建 (依赖 models)
  ↓
ui-renderer.js     ← 外观层: 代理上述 4 个子模块 (40 行)
  ↓
export.js          ← 导出层：Excel 导出 (依赖 CDN + models)
  ↓
demo-data.js       ← 数据源：演示机型定义 + 工厂函数 (依赖 models)
  ↓
app.js             ← 控制层：AppState 单例，启动入口 (依赖以上全部)
```

### 依赖矩阵

| 模块 | 被谁依赖 | 依赖谁 | 全局导出 |
|------|---------|--------|---------|
| `models.js` | 所有模块 | 无 | `AttrType`, `AttrScope`, `MenuSource`, `createSystemProfile`, `createAttribute`, `createMenu`, `createDependency`, `isEffectively*`, `formatAvailableValues`, `toBool`, `getScopeDisplay` |
| `storage.js` | app, ui-renderer | 浏览器 API | `Storage` |
| `parser.js` | app | models, XLSX, pako | `Parser` |
| `menu-tree.js` | ui-renderer, app | models | `MenuTree` |
| `dependency-engine.js` | app | 无 | `DependencyEngine` |
| `editors.js` | ui-renderer, app | models | `Editors` |
| `ui-common.js` | ui-sidebar, ui-table, ui-forms, ui-renderer, app | 无 | `UICommon` |
| `ui-sidebar.js` | ui-renderer, app | menu-tree, storage, ui-common | `UISidebar` |
| `ui-table.js` | ui-renderer, app | editors, models, ui-common | `UITable` |
| `ui-forms.js` | ui-renderer, app | models, ui-common | `UIForms` |
| `ui-renderer.js` | app | 以上 4 个子模块 (代理) | `UIRendererer` |
| `export.js` | app | XLSX, models | `Exporter` |
| `demo-data.js` | app, server | models | `buildModelProfile`, `buildAllDemoProfiles`, `MODEL_*` |
| `app.js` | (启动入口) | 全部 | `AppState`, `$id` |
| `server.js` | (独立运行) | express, vm, models, demo-data | — |

---

## 3. 核心数据模型

遵循 DMTF DSP8010 AttributeRegistry v1.3.0 规范。

### 3.1 SystemProfile（机型配置）

```
SystemProfile {
  id: string                  // 内部 UUID
  productName: string         // 如 "RackServer RS2600 G6"
  systemId: string            // 如 "RS2600G6"
  firmwareVersion: string     // 如 "BMC v2.2.0"
  importTimestamp: string     // ISO 时间戳
  menuMap: Map<MenuName, Menu>     // 菜单字典
  attrMap: Map<AttrName, Attribute> // 属性字典
  dependencies: Dependency[]      // 依赖规则列表
  importErrors: string[]          // 导入警告
  _version: number                // 乐观锁版本号 (API 模式)
}
```

### 3.2 Attribute（BIOS 属性）

```
Attribute {
  // 标识
  attributeName: string       // 唯一键，如 "HyperThreading"
  displayName: string         // 英文显示名
  displayNameZh: string       // 中文显示名
  helpText: string            // 英文说明
  helpTextZh: string          // 中文说明

  // 类型与约束
  type: AttrType              // Enumeration | Integer | String | Boolean | Password
  value: ValueEntry[]         // 枚举可选值 (仅 Enumeration)
  lowerBound: number          // 整数下限 (仅 Integer)
  upperBound: number          // 整数上限 (仅 Integer)
  scalarIncrement: number     // 步进值 (仅 Integer)
  minLength: number           // 最小长度 (String/Password)
  maxLength: number           // 最大长度 (String/Password)
  valueExpression: string     // 正则约束 (String)

  // 值
  defaultValue: any           // 出厂默认值
  currentValue: any           // 当前生效值
  modifiedValue: any          // 用户修改值 (null = 未修改)

  // 状态
  readOnly: boolean           // 只读
  immutable: boolean          // 不可变 (系统级)
  resetRequired: boolean      // 修改需重启
  supportsRedfish: boolean    // 是否可通过 Redfish 管理
  attributeScope: AttrScope   // Standard | Custom | Manual (来源标签)
  platforms: string[]         // 适用平台列表

  // 依赖引擎运行时状态 (非持久化)
  depHidden: boolean          // 被依赖规则隐藏
  depGrayedOut: boolean       // 被依赖规则灰显
  depReadOnly: boolean        // 被依赖规则设为只读

  // 菜单归属
  menuPath: string            // 如 "./Advanced/ProcessorOptions"

  // UEFI
  uefiSpecification: string
  uefiAttributeDependency: string
}
```

### 3.3 Menu（菜单项）

```
Menu {
  menuName: string            // 唯一键
  displayName: string         // 英文显示名
  displayNameZh: string       // 中文显示名
  displayOrder: number        // 排序权重
  menuPath: string            // 层级路径，如 "./Main"
  readOnly: boolean
  grayOut: boolean
  hidden: boolean
  source: MenuSource          // Redfish | Manual

  // 树结构 (运行时构建，非持久化)
  parent: Menu | null
  children: Menu[]
  depth: number
}
```

### 3.4 Dependency（依赖规则）

```
Dependency {
  dependencyFor: string      // 目标属性名
  mapFromAttribute: string   // 源属性名
  mapFromProperty: string    // 源属性取值字段 (CurrentValue/DefaultValue/Hidden/...)
  mapFromCondition: string   // 比较运算符 (EQU/NEQ/GTR/GEQ/LSS/LEQ)
  mapFromValue: any          // 比较值
  mapTerms: string           // AND | OR (多条件聚合)
  mapToAttribute: string     // 作用目标属性名 (默认同 dependencyFor)
  mapToProperty: string      // 目标属性字段 (Hidden/ReadOnly/GrayOut/CurrentValue)
  mapToValue: any            // 设置值
}
```

---

## 4. 数据流

### 4.1 启动流程

```
DOMContentLoaded
  → AppState.init()
    → Storage.init()                    // 探测后端 API (2s 超时)
    → Storage.listSystems()             // 查询已保存机型
    ├─ 有数据 → switchSystem(第一个机型)
    │           → Storage.loadSystem()  // 从 API/localStorage 加载
    │           → DependencyEngine.evaluateAll()  // 全量依赖评估
    │           → refreshUI()           // 渲染侧边栏 + 表格
    └─ 无数据 → loadDemoData()
                → POST /api/demo/load   // API 模式: 服务端生成
                → 或 buildModelProfile() // 本地模式: 前端生成
                → Storage.saveSystem()  // 持久化
                → refreshUI()
    → bindEvents()                      // 绑定全局事件
```

### 4.2 编辑保存流程

```
用户修改属性值 (内联编辑 / 模态框 / 批量编辑)
  → Editors.extractValue()              // 从 DOM 提取值
  → Editors.validate()                  // 类型校验
  → attr.modifiedValue = newValue       // 写入内存
  → modifiedAttrs.add(attrName)         // 标记已修改
  → DependencyEngine.evaluate()         // 增量依赖评估 (级联)
  → refreshTable()                      // 局部刷新表格
  → [自动保存] Storage.saveSystem()     // 写入后端/localStorage
```

### 4.3 导入流程

```
用户选择文件
  → Parser.parseFile(file)
    ├─ .json/.json.gz → parseRegistryJSON()  // Redfish 标准格式
    └─ .xlsx/.xls    → parseExcelWorkbook()  // Excel 模板格式
  → 返回 SystemProfile
  → [覆盖确认弹窗] (如机型已存在)
  → importProfile(profile)
    → DependencyEngine.evaluateAll()    // 全量依赖评估
    → Storage.saveSystem(profile)       // 持久化
    → refreshUI()
```

### 4.4 持久化双模式

```
Storage.init()
  ├─ fetch('/api/systems') 成功 → _mode = 'api'
  │   所有读写走 REST API → server.js → data/*.json 文件
  └─ fetch 失败/超时 → _mode = 'local'
      所有读写走 localStorage → 浏览器本地存储

saveSystem(profile)
  ├─ API 模式: POST /api/systems/:id { profile, _version }
  │   ├─ _version 匹配 → 写入文件, 返回新 _version
  │   └─ _version 不匹配 → HTTP 409, 提示用户刷新
  └─ Local 模式: localStorage.setItem(prefix + id, JSON)
```

---

## 5. 关键设计决策

### 5.1 为什么用全局单例对象而非 ES Modules？

**决策**：每个 JS 文件导出一个全局对象（`Storage`、`Parser`、`UIRendererer` 等），通过 `<script>` 标签按序加载。

**理由**：
- 零构建工具约束 — 不依赖 webpack/rollup/esbuild
- 部署简单 — 直接拷贝文件夹即可运行
- 内网环境友好 — 无需 CDN/registry

**代价**：
- 依赖关系隐式（靠加载顺序保证）
- 无法 Tree-shaking
- 全局命名空间污染

**演进路线**：如后续引入构建工具，可平滑迁移至 ES Modules（每个 `const XXX = { ... }` 改为 `export default`）。

### 5.2 为什么后端用文件存储而非数据库？

**决策**：每个机型一个 JSON 文件，存放在 `data/` 目录。

**理由**：
- 零依赖部署 — 不需要安装 MySQL/PostgreSQL/SQLite
- 数据可读 — JSON 文件可直接查看/编辑/Git 版本管理
- 备份简单 — 拷贝 `data/` 目录即可
- 并发量低 — 内网几人使用，文件 IO 足够

**代价**：
- 无事务支持
- 并发写需乐观锁保护
- 全文搜索需加载到内存

### 5.3 为什么 server.js 用 vm 沙箱执行前端 JS？

**决策**：`/api/demo/load` 端点用 `vm.runInContext` 执行 `models.js + demo-data.js`，复用前端的 `buildModelProfile` 函数。

**理由**：
- DRY — 演示数据定义只维护一份（前端 `demo-data.js`）
- 前后端数据结构一致 — 不需要单独维护后端模型

**代价**：
- vm 沙箱有性能开销（每次请求都 readFileSync + runInContext）
- 沙箱内缺少浏览器 API（`document`、`window`），需确保 demo-data.js 不引用它们

### 5.4 双值机制 (currentValue + modifiedValue)

**决策**：每个属性维护 `currentValue`（生效值）和 `modifiedValue`（修改值）。

**理由**：
- 支持「未保存修改」可视化 — `modifiedValue !== null` 时高亮
- 支持「还原」操作 — 清空 `modifiedValue` 即可回退
- 依赖引擎基于 `currentValue` 评估，不受未保存修改影响

---

## 6. 扩展指南

### 6.1 新增 BIOS 属性类型

1. **models.js** — `AttrType` 枚举添加新类型
2. **editors.js** — `renderEditor` switch 分派新增 case，实现 `render<Type>Editor`
3. **editors.js** — `extractValue` 和 `validate` 新增对应处理
4. **ui-renderer.js** — `renderAttributeRow` 的默认值列渲染适配新类型
5. **parser.js** — `typeMap` 映射表添加新类型的别名
6. **export.js** — `buildAttributeSheet` 的默认值/可选值列适配

### 6.2 新增机型数据

1. **demo-data.js** — 定义 `MODEL_XXX = { productName, systemId, firmwareVersion, attrs: [...] }`
2. **demo-data.js** — 添加到 `ALL_MODELS` 数组
3. 如需服务端加载，`server.js` 的 `/api/models/load-all` 自动包含

属性定义简写键参考：

```javascript
{
  name: 'HyperThreading',     // 属性标识 (必填)
  type: 'Enumeration',         // AttrType (必填)
  def: 'Enabled',              // 默认值 (必填)
  disp: 'Hyper-Threading',     // 英文显示名
  dispZh: '超线程技术',         // 中文显示名
  help: 'Enable/disable HT',   // 英文说明
  helpZh: '启用/禁用超线程',    // 中文说明
  menu: './Advanced/Proc',     // 菜单路径 (必填)
  ro: false,                   // 只读
  rb: true,                    // 修改需重启
  sr: true,                    // 支持 Redfish
  val: [E('Enabled'), E('Disabled')],  // 枚举值 (仅 Enumeration)
  // Integer 专用:
  lb: 0, ub: 100, st: 1,       // 下限/上限/步进
  // String 专用:
  mn: 1, mx: 64,               // 最小/最大长度
  // 其他:
  pl: ['Intel'],               // 平台列表
  sc: 'Standard'               // 来源 (Standard/Custom/客户名)
}
```

### 6.3 新增导入格式

1. **parser.js** — `parseFile` 入口添加文件扩展名判断
2. **parser.js** — 实现 `parse<Format>File(file)` 方法，返回 `SystemProfile`
3. 如需 CDN 库，在 `index.html` 添加 `<script>` 标签

### 6.4 新增导出格式

1. **export.js** — 实现 `exportTo<Format>(profile)` 方法
2. **app.js** — `handleExport` 添加格式选择逻辑
3. 如需 CDN 库，在 `index.html` 添加 `<script>` 标签

### 6.5 新增依赖条件类型

1. **dependency-engine.js** — `_compareValues` switch 添加新运算符
2. **parser.js** — 解析时映射新运算符

### 6.6 修改 UI 布局

UI 结构定义在 `index.html`，样式在 `css/styles.css`：

- **设计变量**：`css/styles.css` `:root` 定义颜色/圆角/字体/布局变量
- **配色方案**：基于 Ant Design 色板（`#1890ff`/`#52c41a`/`#faad14`/`#ff4d4f`）
- **侧边栏宽度**：`--sidebar-width: 260px`
- **工具栏高度**：`--toolbar-height: 48px`
- 修改 CSS 变量即可全局换肤

---

## 7. 编码规范

### 7.1 命名约定

| 类别 | 约定 | 示例 |
|------|------|------|
| 全局单例对象 | PascalCase | `Storage`, `Parser`, `UIRendererer` |
| 枚举常量 | PascalCase + 大写值 | `AttrType.Enumeration` |
| 工厂函数 | camelCase, `create` 前缀 | `createAttribute(raw)` |
| 计算属性 | camelCase, `is`/`has`/`get` 前缀 | `isEffectivelyHidden(attr)` |
| 对象方法 | camelCase | `Storage.saveSystem(profile)` |
| HTML 元素 ID | kebab-case | `filter-readonly`, `btn-save` |
| CSS 类 | kebab-case | `row-readonly`, `menu-item` |
| 数据字段 | PascalCase (Redfish 原生) / camelCase (扩展) | `AttributeName` / `menuPath` |

### 7.2 HTML 渲染

- 所有动态 HTML 使用 `UIRendererer.escHtml()` / `escAttr()` 转义
- 表单构建集中在 `UIRendererer.build*Form()` 方法
- 事件绑定优先使用事件委托（表格、菜单树），避免 innerHTML 替换后丢失监听

### 7.3 数据持久化

- 所有 `Storage.*` 方法为 `async`，调用方用 `await`
- 保存前必须调用 `DependencyEngine.evaluateAll()` 或 `evaluate()` 确保依赖状态一致
- `Storage.saveSystem()` 自动处理乐观锁冲突（409 时抛异常）

### 7.4 文件组织

- 每个模块文件头部注释说明用途
- 模块内方法按功能分组，用 `/* ============ 分组名 ============ */` 分隔
- 单文件不超过 500 行（当前 `app.js` 870 行仍超标，列入技术债务）

---

## 8. 安全注意事项

### 8.1 当前状态

| 风险项 | 状态 | 说明 |
|--------|------|------|
| 路径穿越 | ✅ 已修复 | `sanitizeId()` 白名单校验 + `path.basename` |
| 静态服务暴露 | ✅ 已修复 | 安全中间件拦截 `server.js` / `package.json` / `data/` / `.workbuddy/` |
| 乐观锁绕过 | ✅ 已修复 | 已有数据时必须携带 `_version`，否则返回 400 |
| XSS 防护 | 基本覆盖 | `escHtml`/`escAttr` 转义，但内联 onclick 拼接存在风险 |
| 无认证鉴权 | 设计如此 | 内网工具，依赖网络隔离 |

### 8.2 部署建议

- 使用反向代理（Nginx）限制访问 IP 段
- `data/` 目录设置文件系统权限
- 定期备份 `data/` 目录
- 不要将 `data/` 提交到 Git 仓库

---

## 9. 技术债务清单

按优先级排列，供后续迭代参考：

### P0 — 已修复

| 编号 | 问题 | 位置 | 状态 |
|------|------|------|------|
| T-001 | `getEffectiveScopeDisplay` 未定义 | `ui-renderer.js:467` | ✅ 已修复 → `getScopeDisplay` |
| T-002 | 路径穿越漏洞 | `server.js` | ✅ 已修复 → `sanitizeId()` + `path.basename` |
| T-003 | 静态服务暴露源码 | `server.js` | ✅ 已修复 → 安全中间件拦截 `server.js`/`package.json`/`data/` |
| T-006 | `rowClass =` 覆盖而非追加 | `ui-renderer.js:330` | ✅ 已修复 → `+=` |

### P1 — 已修复

| 编号 | 问题 | 位置 | 状态 |
|------|------|------|------|
| T-004 | Excel 无 SystemId 时崩溃 | `parser.js:286` | ✅ 已修复 → 传 `file` 参数 + 可选链 |
| T-005 | 依赖多条件被截断 | `parser.js:81` | ✅ 已修复 → 遍历完整 `MapFrom[]` 数组 |

### P2 — 已修复

| 编号 | 问题 | 位置 | 状态 |
|------|------|------|------|
| T-007 | 自动保存无防抖 | `app.js` | ✅ 已修复 → `debouncedSave()` 800ms 防抖 |
| T-008 | 乐观锁可被绕过 | `server.js:100` | ✅ 已修复 → 已有数据时必须传 `_version` |
| T-009 | MenuTree 虚拟节点污染原 map | `menu-tree.js:39` | ✅ 已修复 → 工作副本 + pathIndex |
| T-010 | `exportAllToJSONFile` 回调地狱 | `storage.js:151` | ✅ 已修复 → async/await |
| T-012 | `handleBackupImport` 死代码 | `app.js:291` | ✅ 已清理（功能保留，待 UI 接线） |
| T-013 | `createDemoProfile` 死代码 | `app.js:863` | ✅ 已删除 |

### P3 — 待后续迭代

| 编号 | 问题 | 位置 | 修复方案 |
|------|------|------|---------|
| T-014 | ~~`ui-renderer.js` 1053 行过长~~ | — | ✅ 已拆分为 ui-common/ui-sidebar/ui-table/ui-forms |
| T-015 | `app.js` 870 行职责过载 | — | 拆分为 SystemController/EditController/ImportController |
| T-016 | 无单元测试 | — | 对 dependency-engine / parser / menu-tree 添加测试 |
| T-017 | 无 TypeScript 类型 | — | 渐进式添加 JSDoc 或迁移 TS |
| T-018 | innerHTML 拼接 HTML 无模板引擎 | ui-renderer.js | 引入 lit-html 或 igo |
| T-019 | demo-data.js 单文件过大 | — | 按机型拆分或外置 JSON |
| T-020 | 导出仅 Excel 无 JSON | `export.js` | 增加 `exportToRegistryJSON` |
| T-021 | dependency-engine `mapToAttribute` 未真正支持 | `dependency-engine.js` | 支持跨属性依赖作用 |

---

## 10. 文件速查

| 文件 | 行数 | 职责 | 修改频率 |
|------|------|------|---------|
| `index.html` | 142 | 页面结构 + 脚本加载 | 低 |
| `server.js` | 230 | Express 后端 (安全中间件 + API + 文件持久化) | 低 |
| `package.json` | 16 | 依赖声明 | 极低 |
| `start.bat` | 12 | Windows 启动脚本 | 极低 |
| `css/styles.css` | 899 | 全局样式 + 设计变量 | 中 |
| `js/models.js` | 270 | 数据模型 + 工厂函数 + 计算属性 | 低 |
| `js/storage.js` | 204 | 双模式持久化 (API + localStorage) | 低 |
| `js/parser.js` | 324 | 多格式解析 (JSON / gz / Excel) | 中 |
| `js/menu-tree.js` | 165 | 菜单树构建 (工作副本，不污染原 map) | 极低 |
| `js/dependency-engine.js` | 220 | DMTF Map 依赖评估引擎 | 极低 |
| `js/editors.js` | 160 | 类型感知编辑器 (5 种 AttrType) | 低 |
| `js/ui-common.js` | 80 | 转义工具 + 通知 + 模态框 | 低 |
| `js/ui-sidebar.js` | 200 | 侧边栏渲染 + 机型选择器 + 筛选下拉 | 中 |
| `js/ui-table.js` | 310 | 表格渲染 + 行渲染 + 筛选标签 + 搜索 | 高 |
| `js/ui-forms.js` | 310 | 添加/编辑菜单和选项的表单构建 | 高 |
| `js/ui-renderer.js` | 40 | 统一外观入口 (代理上述 4 个子模块) | 极低 |
| `js/export.js` | 180 | 导出 Excel + Registry JSON | 低 |
| `js/demo-data.js` | 220 | 演示机型示例数据 + 工厂函数 | 中 |
| `js/app.js` | 870 | 主控制器 (AppState) | 高 |
| `tools/gen-template.js` | — | Excel 模板生成工具 | 极低 |
