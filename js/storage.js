/**
 * 数据持久化管理 — 双模式
 * - API 模式: 连接到 Express 后端，数据存服务器 JSON 文件（多人共享，重启不丢）
 * - Local 模式: 回退到浏览器 localStorage（本地开发/离线使用）
 */

const STORAGE_PREFIX = 'redfish_bios_';
const INDEX_KEY = STORAGE_PREFIX + 'system_index';

const Storage = {
    _mode: 'local',         // 'api' | 'local'
    _versions: {},           // 乐观锁版本缓存 (api 模式)
    _initialized: false,

    /** 初始化: 探测后端 API 是否可用 */
    async init() {
        if (this._initialized) return;
        this._initialized = true;
        try {
            const res = await fetch('/api/systems', { method: 'GET', signal: AbortSignal.timeout(2000) });
            if (res.ok) {
                this._mode = 'api';
                console.log('[Storage] API 模式已启用 — 数据存储在服务器');
                return;
            }
        } catch { /* 静默回退 */ }
        this._mode = 'local';
        console.log('[Storage] 回退到 localStorage 模式');
    },

    /** @returns {Promise<Array>} 机型目录 */
    async listSystems() {
        if (this._mode === 'api') {
            try {
                const res = await fetch('/api/systems');
                const data = await res.json();
                return (data.systems || []).map(s => ({
                    id: s.systemId,
                    productName: s.productName,
                    systemId: s.systemId,
                    firmwareVersion: s.firmwareVersion,
                    attrCount: s.attrCount,
                    importTimestamp: s.updatedAt
                }));
            } catch (e) {
                console.error('[Storage] API listSystems 失败:', e);
                return [];
            }
        }
        // localStorage 模式
        try {
            const raw = localStorage.getItem(INDEX_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    },

    /** @param {string} systemId @returns {Promise<Object|null>} */
    async loadSystem(systemId) {
        if (this._mode === 'api') {
            try {
                const res = await fetch('/api/systems/' + encodeURIComponent(systemId));
                if (!res.ok) return null;
                const data = await res.json();
                if (data.profile) {
                    this._versions[systemId] = data.profile._version;
                }
                return data.profile || null;
            } catch (e) {
                console.error('[Storage] API loadSystem 失败:', e);
                return null;
            }
        }
        try {
            const raw = localStorage.getItem(STORAGE_PREFIX + systemId);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error('[Storage] loadSystem 失败:', systemId, e);
            return null;
        }
    },

    /** @param {Object} profile @returns {Promise<void>} */
    async saveSystem(profile) {
        if (this._mode === 'api') {
            try {
                const currentVersion = this._versions[profile.systemId] || 0;
                const res = await fetch('/api/systems/' + encodeURIComponent(profile.systemId), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: formatProfileJSON(profile, currentVersion)
                });
                if (res.status === 409) {
                    // 乐观锁冲突
                    const err = await res.json();
                    throw new Error(err.error || '数据已被他人修改，请刷新后重试');
                }
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || '保存失败');
                }
                const result = await res.json();
                this._versions[profile.systemId] = result._version;
                return;
            } catch (e) {
                if (e.message.includes('已被他人修改')) throw e;
                console.error('[Storage] API saveSystem 失败:', e);
                throw e;
            }
        }
        // localStorage 模式
        try {
            const key = STORAGE_PREFIX + profile.systemId;
            localStorage.setItem(key, formatProfileJSON(profile));
            const index = await this.listSystems();
            const summary = {
                id: profile.systemId, productName: profile.productName,
                systemId: profile.systemId, firmwareVersion: profile.firmwareVersion,
                attrCount: Object.keys(profile.attrMap || {}).length,
                importTimestamp: profile.importTimestamp || new Date().toISOString()
            };
            const idx = index.findIndex(s => s.id === profile.systemId);
            if (idx >= 0) index[idx] = summary; else index.push(summary);
            localStorage.setItem(INDEX_KEY, JSON.stringify(index));
        } catch (e) {
            console.error('[Storage] saveSystem 失败:', profile.systemId, e);
            throw e;
        }
    },

    /** @param {string} systemId @returns {Promise<void>} */
    async deleteSystem(systemId) {
        if (this._mode === 'api') {
            try {
                await fetch('/api/systems/' + encodeURIComponent(systemId), { method: 'DELETE' });
                delete this._versions[systemId];
                return;
            } catch (e) {
                console.error('[Storage] API deleteSystem 失败:', e);
            }
        }
        try {
            localStorage.removeItem(STORAGE_PREFIX + systemId);
            const index = (await this.listSystems()).filter(s => s.id !== systemId);
            localStorage.setItem(INDEX_KEY, JSON.stringify(index));
        } catch (e) {
            console.error('[Storage] deleteSystem 失败:', systemId, e);
        }
    },

    /** 导出全部数据为 JSON 备份文件 */
    async exportAllToJSONFile() {
        try {
            const systems = await this.listSystems();
            const allProfiles = await Promise.all(
                systems.map(s => this.loadSystem(s.id))
            );
            const allData = {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                systems: allProfiles.filter(Boolean)
            };
            const blob = new Blob([JSON.stringify(allData, (k, v) => {
                if (k === 'parent' || k === 'children') return undefined;
                return v;
            }, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'redfish_bios_backup_' + new Date().toISOString().slice(0, 10) + '.json';
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('[Storage] 导出失败:', e);
            throw e;
        }
    },

    /** 从 JSON 备份文件恢复 @returns {Promise<{count: number, errors: string[]}>} */
    async importFromJSONFile(file) {
        const text = await file.text();
        const data = JSON.parse(text);
        const errors = [];
        let count = 0;
        if (!data.systems || !Array.isArray(data.systems)) {
            throw new Error('无效的备份文件格式');
        }
        for (const profile of data.systems) {
            try {
                if (profile.systemId) {
                    await this.saveSystem(profile);
                    count++;
                }
            } catch (e) {
                errors.push(profile.systemId + ': ' + e.message);
            }
        }
        return { count, errors };
    }
};

/** 序列化 Profile 为 JSON，去除循环引用 */
function formatProfileJSON(profile, _version) {
    const body = { profile: {}, _version };
    body.profile = profile;
    return JSON.stringify(body, (k, v) => {
        if (k === 'parent' || k === 'children') return undefined;
        return v;
    });
}
