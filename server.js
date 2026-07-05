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
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// ============ 中间件 ============

app.use(express.json({ limit: '10mb' }));

// 确保 data 目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ============ 用户管理 ============

/** 读取用户列表 */
function loadUsers() {
    try {
        if (!fs.existsSync(USERS_FILE)) return [];
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    } catch (e) {
        console.error('[Auth] 读取用户文件失败:', e.message);
        return [];
    }
}

/** 保存用户列表 */
function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

/** 确保存在默认管理员 */
function ensureDefaultAdmin() {
    const users = loadUsers();
    const hasAdmin = users.some(u => u.role === 'admin');
    if (!hasAdmin) {
        users.push({ username: 'admin', password: '1', role: 'admin', createdAt: new Date().toISOString() });
        saveUsers(users);
        console.log('[Auth] 已创建默认管理员: admin / 1');
    } else {
        // 确保现有管理员密码为最新
        const admin = users.find(u => u.role === 'admin');
        if (admin && admin.password !== '1') {
            admin.password = '1';
            saveUsers(users);
        }
    }
}

// 启动时初始化
ensureDefaultAdmin();

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

// ============ 认证 API ============

/** 登录 */
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ success: false, error: '请填写用户名和密码' });
    }
    const users = loadUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
        return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }
    res.json({ success: true, user: { username: user.username, role: user.role } });
});

/** 注册 */
app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body || {};
    const name = (username || '').trim();
    if (!name || name.length < 2) {
        return res.status(400).json({ success: false, error: '用户名至少 2 个字符' });
    }
    if (!password || password.length < 6) {
        return res.status(400).json({ success: false, error: '密码至少 6 位' });
    }
    if (name.toLowerCase() === 'admin') {
        return res.status(400).json({ success: false, error: '该用户名已被保留' });
    }
    const users = loadUsers();
    if (users.some(u => u.username === name)) {
        return res.status(400).json({ success: false, error: '用户名已存在' });
    }
    users.push({ username: name, password, role: 'user', createdAt: new Date().toISOString() });
    saveUsers(users);
    res.json({ success: true, user: { username: name, role: 'user' } });
});

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
        if ((existing._version || 0) !== _version) {
            console.log('[VersionConflict] id=%s clientVersion=%d serverVersion=%s typeof_client=%s typeof_server=%s',
                id, _version, existing._version, typeof _version, typeof existing._version);
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

// ============ 版本管理 API ============

/** 读取机型的版本列表 */
function loadVersions(id) {
    const file = safeFilePath(id + '.versions');
    if (!fs.existsSync(file)) return [];
    try {
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch (e) {
        console.error('[Storage] 读取版本文件 %s 失败:', id, e.message);
        return [];
    }
}

/** 写入机型的版本列表 */
function saveVersions(id, versions) {
    fs.writeFileSync(safeFilePath(id + '.versions'), JSON.stringify(versions, null, 2), 'utf-8');
}

/** 列出机型的所有版本 */
app.get('/api/systems/:id/versions', (req, res) => {
    const id = sanitizeId(req.params.id);
    if (!id) return res.status(400).json({ error: '无效的机型 ID' });

    const versions = loadVersions(id);
    // 返回元数据（不含 profile 体）
    const list = versions.map(v => ({
        id: v.id,
        label: v.label,
        savedAt: v.savedAt,
        attrCount: v.attrCount || 0
    }));
    res.json({ versions: list });
});

/** 保存当前状态为新版本 */
app.post('/api/systems/:id/versions', (req, res) => {
    const id = sanitizeId(req.params.id);
    if (!id) return res.status(400).json({ error: '无效的机型 ID' });

    const { label } = req.body;
    if (!label || !label.trim()) {
        return res.status(400).json({ error: '请填写版本号' });
    }

    const profile = loadProfile(id);
    if (!profile) {
        return res.status(404).json({ error: '机型不存在' });
    }

    const versionId = label.trim();
    const versions = loadVersions(id);
    const snapshot = {
        id: versionId,
        label: versionId,
        savedAt: new Date().toISOString(),
        attrCount: Object.keys(profile.attrMap || {}).length,
        profile: JSON.parse(JSON.stringify(profile)) // 深拷贝，去除 _version
    };
    snapshot.profile._version = 0;

    // 覆盖同名版本
    const idx = versions.findIndex(v => v.id === versionId);
    if (idx >= 0) {
        versions[idx] = snapshot;
    } else {
        versions.push(snapshot);
    }

    saveVersions(id, versions);
    res.json({
        success: true,
        version: { id: snapshot.id, label: snapshot.label, savedAt: snapshot.savedAt, attrCount: snapshot.attrCount }
    });
});

/** 切换到某个版本（覆盖当前 profile） */
app.post('/api/systems/:id/versions/:vid/activate', (req, res) => {
    const id = sanitizeId(req.params.id);
    const vid = req.params.vid;
    if (!id) return res.status(400).json({ error: '无效的机型 ID' });

    const versions = loadVersions(id);
    const version = versions.find(v => v.id === vid);
    if (!version) {
        return res.status(404).json({ error: '版本不存在: ' + vid });
    }

    const existing = loadProfile(id);
    const newProfile = JSON.parse(JSON.stringify(version.profile));
    // 递增版本号
    newProfile._version = (existing ? (existing._version || 0) : 0) + 1;

    saveProfile(id, newProfile);
    updateIndexEntry(id, newProfile);
    res.json({ success: true, _version: newProfile._version });
});

/** 删除某个版本 */
app.delete('/api/systems/:id/versions/:vid', (req, res) => {
    const id = sanitizeId(req.params.id);
    const vid = req.params.vid;
    if (!id) return res.status(400).json({ error: '无效的机型 ID' });

    const versions = loadVersions(id);
    const filtered = versions.filter(v => v.id !== vid);
    if (filtered.length === versions.length) {
        return res.status(404).json({ error: '版本不存在: ' + vid });
    }

    saveVersions(id, filtered);
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
