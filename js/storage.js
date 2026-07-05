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
            return await this._saveWithRetry(profile, false);
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

    /**
     * 带重试的 API 保存 — 遇到 409 时自动重载版本并重试一次
     * @param {Object} profile - 要保存的 Profile
     * @param {boolean} isRetry - 是否为重试调用
     */
    async _saveWithRetry(profile, isRetry) {
        const id = profile.systemId;
        const currentVersion = this._versions[id] || 0;

        try {
            const res = await fetch('/api/systems/' + encodeURIComponent(id), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: formatProfileJSON(profile, currentVersion)
            });

            if (res.status === 409) {
                if (isRetry) {
                    // 重试仍然冲突，放弃并抛出错误
                    const err = await res.json();
                    throw new Error(err.error || '数据已被他人修改，请刷新后重试');
                }
                // 首次冲突：重载最新版本，同步 profile 的 _version，然后重试
                console.warn('[Storage] 409 冲突，重载版本后重试:', id);
                const latest = await this.loadSystem(id);
                if (latest) {
                    // 把服务器端最新的 _version 同步到 profile 对象上
                    profile._version = latest._version;
                }
                return await this._saveWithRetry(profile, true);
            }

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || '保存失败');
            }

            const result = await res.json();
            this._versions[id] = result._version;
            // 同步到 profile 对象，保持版本一致
            profile._version = result._version;
        } catch (e) {
            if (e.message.includes('已被他人修改')) throw e;
            console.error('[Storage] API saveSystem 失败:', e);
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
    },

    // ============ 版本管理 ============

    /** 列出机型的所有版本 */
    async listVersions(systemId) {
        if (this._mode === 'api') {
            try {
                const res = await fetch('/api/systems/' + encodeURIComponent(systemId) + '/versions');
                if (!res.ok) return [];
                const data = await res.json();
                return data.versions || [];
            } catch (e) {
                console.error('[Storage] API listVersions 失败:', e);
                return [];
            }
        }
        return [];
    },

    /** 保存当前状态为新版本 */
    async saveVersion(systemId, label) {
        if (this._mode === 'api') {
            try {
                const res = await fetch('/api/systems/' + encodeURIComponent(systemId) + '/versions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ label })
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || '保存版本失败');
                }
                return await res.json();
            } catch (e) {
                console.error('[Storage] API saveVersion 失败:', e);
                throw e;
            }
        }
        throw new Error('版本管理仅支持 API 模式');
    },

    /** 切换到某个版本 */
    async activateVersion(systemId, versionId) {
        if (this._mode === 'api') {
            try {
                const res = await fetch('/api/systems/' + encodeURIComponent(systemId) + '/versions/' + encodeURIComponent(versionId) + '/activate', {
                    method: 'POST'
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || '切换版本失败');
                }
                const result = await res.json();
                this._versions[systemId] = result._version;
                return result;
            } catch (e) {
                console.error('[Storage] API activateVersion 失败:', e);
                throw e;
            }
        }
        throw new Error('版本管理仅支持 API 模式');
    },

    /** 删除版本 */
    async deleteVersion(systemId, versionId) {
        if (this._mode === 'api') {
            try {
                const res = await fetch('/api/systems/' + encodeURIComponent(systemId) + '/versions/' + encodeURIComponent(versionId), {
                    method: 'DELETE'
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || '删除版本失败');
                }
                return await res.json();
            } catch (e) {
                console.error('[Storage] API deleteVersion 失败:', e);
                throw e;
            }
        }
        throw new Error('版本管理仅支持 API 模式');
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
