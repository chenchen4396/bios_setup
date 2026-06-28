/**
 * BIOS 选项管理器 — 内网持久化后端
 * 纯文件 JSON 存储，零数据库依赖
 * 启动: node server.js
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const INDEX_FILE = path.join(DATA_DIR, '_index.json');

// ============ 中间件 ============

app.use(express.json({ limit: '10mb' }));

// 确保 data 目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ============ 安全工具 ============

/**
 * 校验并清洗机型 ID — 防止路径穿越攻击
 * 仅允许字母、数字、下划线、连字符
 */
function sanitizeId(rawId) {
    if (!rawId || typeof rawId !== 'string') return null;
    const clean = path.basename(rawId).replace(/[^a-zA-Z0-9_\-]/g, '');
    return clean || null;
}

/**
 * 构造安全的 JSON 文件路径
 */
function safeFilePath(id) {
    return path.join(DATA_DIR, id + '.json');
}

// ============ 数据持久化 ============

/** 读取机型目录 */
function loadIndex() {
    try {
        if (!fs.existsSync(INDEX_FILE)) return [];
        return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
    } catch (e) {
        console.error('[Storage] 读取目录索引失败:', e.message);
        return [];
    }
}

/** 写入机型目录 */
function saveIndex(list) {
    fs.writeFileSync(INDEX_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

/** 更新单个机型在目录中的条目 */
function updateIndexEntry(id, profile) {
    const list = loadIndex();
    const idx = list.findIndex(s => s.systemId === id);
    const entry = {
        systemId: id,
        productName: profile.productName || '',
        firmwareVersion: profile.firmwareVersion || '',
        attrCount: Object.keys(profile.attrMap || {}).length,
        updatedAt: new Date().toISOString()
    };
    if (idx >= 0) list[idx] = entry;
    else list.push(entry);
    saveIndex(list);
}

/** 从目录中移除机型条目 */
function removeIndexEntry(id) {
    saveIndex(loadIndex().filter(s => s.systemId !== id));
}

/** 读取单个机型的 JSON 文件 */
function loadProfile(id) {
    const file = safeFilePath(id);
    if (!fs.existsSync(file)) return null;
    try {
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch (e) {
        console.error('[Storage] 读取机型 %s 失败:', id, e.message);
        return null;
    }
}

/** 保存单个机型的 JSON 文件 */
function saveProfile(id, profile) {
    fs.writeFileSync(safeFilePath(id), JSON.stringify(profile, null, 2), 'utf-8');
}

/** 删除单个机型的 JSON 文件 */
function deleteProfile(id) {
    const file = safeFilePath(id);
    if (fs.existsSync(file)) fs.unlinkSync(file);
}

// ============ VM 沙箱 (复用前端 demo-data.js) ============

let _sandboxCache = null;

/**
 * 在 VM 沙箱中执行 models.js + demo-data.js，返回构建函数
 * 结果缓存避免每次请求都 readFileSync
 */
function getDemoBuilders() {
    if (_sandboxCache) return _sandboxCache;

    const modelsCode = fs.readFileSync(path.join(__dirname, 'js', 'models.js'), 'utf-8');
    const demoCode = fs.readFileSync(path.join(__dirname, 'js', 'demo-data.js'), 'utf-8');
    const code = modelsCode + '\n' + demoCode +
        '\nresult = { buildModelProfile, DEMO_MODEL };';

    const sandbox = { console, require, result: null };
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);

    _sandboxCache = sandbox.result || {};
    return _sandboxCache;
}

// ============ API 路由 ============

/** 列出所有机型 */
app.get('/api/systems', (req, res) => {
    res.json({ systems: loadIndex() });
});

/** 读取单个机型 */
app.get('/api/systems/:id', (req, res) => {
    const id = sanitizeId(req.params.id);
    if (!id) return res.status(400).json({ error: '无效的机型 ID' });

    const profile = loadProfile(id);
    if (!profile) return res.status(404).json({ error: '机型不存在' });
    res.json({ profile });
});

/** 保存/更新机型（含乐观锁） */
app.post('/api/systems/:id', (req, res) => {
    const id = sanitizeId(req.params.id);
    if (!id) return res.status(400).json({ error: '无效的机型 ID' });

    const { profile, _version } = req.body;
    if (!profile) return res.status(400).json({ error: '缺少 profile 字段' });

    const existing = loadProfile(id);

    // 乐观锁：已有数据时必须携带 _version
    if (existing) {
        if (_version === undefined || _version === null) {
            return res.status(400).json({ error: '缺少版本号，请刷新后重试' });
        }
        if (existing._version !== _version) {
            return res.status(409).json({
                error: '数据已被他人修改，请刷新后重试',
                serverVersion: existing._version
            });
        }
    }

    // 版本号递增
    profile._version = (existing ? existing._version || 0 : 0) + 1;

    saveProfile(id, profile);
    updateIndexEntry(id, profile);
    res.json({ success: true, _version: profile._version });
});

/** 删除机型 */
app.delete('/api/systems/:id', (req, res) => {
    const id = sanitizeId(req.params.id);
    if (!id) return res.status(400).json({ error: '无效的机型 ID' });

    deleteProfile(id);
    removeIndexEntry(id);
    res.json({ success: true });
});

/** 一键加载演示数据 */
app.post('/api/demo/load', (req, res) => {
    try {
        const { buildModelProfile, DEMO_MODEL: model } = getDemoBuilders();
        if (!buildModelProfile || !model) {
            return res.status(500).json({ error: '无法加载演示数据构建函数' });
        }

        const profile = buildModelProfile(model);
        profile._version = 1;
        saveProfile(profile.systemId, profile);
        updateIndexEntry(profile.systemId, profile);

        res.json({ success: true, loaded: 1, loadedName: profile.productName, loadedId: profile.systemId });
    } catch (e) {
        console.error('[Demo] 演示数据加载失败:', e);
        res.status(500).json({ error: e.message });
    }
});

// ============ 安全中间件 (必须在静态服务之前) ============

const SENSITIVE_FILES = ['server.js', 'package.json', 'package-lock.json', 'start.bat'];
app.use((req, res, next) => {
    const baseName = path.basename(req.path);
    // 拦截敏感文件
    if (SENSITIVE_FILES.includes(baseName)) {
        return res.status(403).send('Forbidden');
    }
    // 拦截 data/ 和 .workbuddy/ 目录
    if (req.path.startsWith('/data/') || req.path.startsWith('/.workbuddy/')) {
        return res.status(403).send('Forbidden');
    }
    next();
});

// ============ 静态文件服务 ============

app.use('/', express.static(__dirname, { index: 'index.html' }));

// ============ SPA 回退 ============
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============ 启动 ============
app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('  BIOS 选项管理器 — 内网持久化版');
    console.log('  ---------------------------------------');
    console.log('  本地访问:  http://localhost:' + PORT);
    console.log('  内网访问:  http://' + getLocalIP() + ':' + PORT);
    console.log('  数据目录:  ' + DATA_DIR);
    console.log('  按 Ctrl+C 停止服务');
    console.log('');
});

/** 获取本机内网 IP */
function getLocalIP() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}
