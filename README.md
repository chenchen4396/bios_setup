# BIOS 选项管理器

基于 DMTF Redfish AttributeRegistry 规范的服务器 BIOS 配置管理工具。

支持多机型管理、菜单导航、类型感知编辑、依赖评估、批量修改、导入导出，通过内网 Node.js 后端实现多人协作与数据持久化。

> 技术架构细节见 [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 界面导览

页面分为四个区域：

### 1. 顶部工具栏

一排操作按钮，从左到右：

- **机型下拉框** — 切换已导入的服务器型号
- **[导入]** — 导入 Registry JSON 或 Excel 文件
- **[导出]** — 导出当前机型为 Excel 或标准 JSON
- **[保存]** — 手动保存所有未保存的修改
- **[加载示例]** — 一键加载演示数据

搜索框支持实时搜索（默认 300ms 防抖），输入多个关键词用空格分隔可按加权评分排序。

### 2. 左侧菜单树

层级菜单按 BIOS MenuPath 组织（如 `Main → Advanced → Processor`），点击菜单在右侧表格显示该菜单下的所有属性。菜单支持折叠/展开，可手动添加自定义菜单。

### 3. 属性表格

表格 10 列：菜单路径 | 属性标识 | 显示名称 | 中文名 | 默认值 | 可选值 | 来源 | Redfish | 只读 | 说明

每行右侧有 **[编辑]** 按钮，点击弹出模态框编辑属性（支持全部字段：类型、值、中英文显示名、帮助文本、来源标签、平台等）。Rest 按钮可还原单条修改。

### 4. 筛选栏与激活标签

表格上方提供 6 维筛选：

- **属性标识** — 输入关键字模糊匹配
- **类型** — 枚举 / 字符串 / 整数 / 布尔 / 密码
- **来源** — 动态填充当前机型中的来源标签（通用、字节、百度等）
- **平台** — 动态填充当前平台值
- **是否只读** — 是 / 否
- **是否支持 Redfish** — 是 / 否

选中筛选后，筛选栏下方会显示可关闭的标签 chip，点击 × 可单独清除该筛选项。

---

## 功能特性

| 类别 | 功能 |
|------|------|
| 机型管理 | 多机型切换、增删、导入；内置通用服务器示例机型 |
| 菜单导航 | 层级菜单树，折叠/展开，支持自定义添加菜单和属性 |
| 属性编辑 | 5 种 Redfish 类型（枚举/整数/字符串/布尔/密码），模态框编辑 |
| 批量编辑 | 进入批量模式后所有属性行变为内联编辑器，一键提交 |
| 依赖评估 | DMTF Map 引擎自动处理属性间隐藏/灰显/只读级联 |
| 搜索 | 跨所有属性实时搜索，中英文加权评分 |
| 导入 | Registry JSON / JSON.gz / Excel xlsx |
| 导出 | Excel（中文列名）/ Registry JSON（DMTF 标准） |
| 持久化 | 后端 JSON 文件存储，重启不丢；离线自动回退 localStorage |
| 多人协作 | 乐观锁（`_version`）防止同时编辑覆盖 |

---

## 内置示例

点击 **[加载示例]** 按钮可加载一台通用服务器演示机型：

| 机型 | 属性 | 规格 | 菜单层级 |
|------|------|------|---------|
| RackServer RS2600 G6 | 304 项 | 2U2P / DDR5 / PCIe 5.0 | 1-5 级深度 |

菜单涵盖 Main、Advanced（处理器/内存/存储/网络/电源/PCIe/USB/串口/RAS/显卡/SMI/其他）、Boot Options、Security（TPM/Secure Boot/SGX/TXT/TME/LDAP）、Server Management（BMC/日志/系统信息/电源恢复）等 30+ 子菜单路径。

---

## 快速开始

**环境要求**：Node.js 18+、现代浏览器（Chrome / Edge / Firefox）

```bash
# 1. 安装依赖
npm install

# 2. 启动服务
node server.js
# 或双击 start.bat（Windows）

# 3. 浏览器访问
http://localhost:3000
```

首次打开无历史数据时自动加载演示机型。

---

## 内网部署

将项目拷贝到服务器，执行 `npm install && node server.js`，服务监听 `0.0.0.0:3000`，局域网内所有设备均可访问。数据存储在 `data/` 目录的 JSON 文件中，服务重启不丢失。备份只需拷贝该目录。

后端不可用时前端自动回退到浏览器 localStorage 离线模式。

---

## 导入数据

支持三种格式：

| 格式 | 扩展名 | 来源 |
|------|--------|------|
| Registry JSON | `.json` | 标准 Redfish AttributeRegistry |
| 压缩 JSON | `.json.gz` | gzip 压缩的 Registry |
| Excel 模板 | `.xlsx` `.xls` | 由 `node tools/gen-template.js` 生成 |

点击工具栏 **[导入]** 选择文件即可。

---

## 项目结构

```
bios-manager/
├── index.html          # 页面入口
├── server.js           # Express 后端（API + 静态文件 + 持久化）
├── start.bat           # Windows 一键启动
├── css/
│   └── styles.css      # 样式
├── js/
│   ├── models.js       # 数据模型与工厂函数
│   ├── storage.js      # 持久化（API + localStorage 双模式）
│   ├── parser.js       # 导入解析（JSON / Excel）
│   ├── app.js          # 主控制器
│   ├── demo-data.js    # 演示机型内置数据
│   └── ui-*.js         # 界面子模块
├── tools/
│   └── gen-template.js # Excel 模板生成
└── data/               # 运行时数据（不提交 Git）
```

---

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/systems` | 列出所有机型 |
| GET | `/api/systems/:id` | 读取单机型 |
| POST | `/api/systems/:id` | 保存/更新（含乐观锁） |
| DELETE | `/api/systems/:id` | 删除机型 |
| POST | `/api/demo/load` | 加载演示机型 |

---
