/**
 * 应用主控制器
 * AppState 单例 — 状态管理 / 事件绑定 / 流程编排 / 启动入口
 */

// 安全的 getElementById 辅助函数
function $id(id) {
    const el = document.getElementById(id);
    if (!el && typeof console !== 'undefined') console.warn('[WARN] Element not found: #' + id);
    return el;
}

/**
 * 防抖保存 — 避免高频写入，自动捕获错误并提示用户
 * @param {Object} profile - 要保存的 Profile
 * @param {string} [context] - 保存上下文描述（用于错误提示）
 */
const _debounceTimers = {};
function debouncedSave(profile, context) {
    if (!profile) return;
    const key = profile.systemId;
    clearTimeout(_debounceTimers[key]);
    _debounceTimers[key] = setTimeout(async () => {
        try {
            await Storage.saveSystem(profile);
        } catch (e) {
            console.error('[AutoSave] 自动保存失败:', e);
            UIRenderer.showNotification(
                (context || '自动') + '保存失败: ' + e.message,
                'error', 5000
            );
        }
    }, 800);
}

const AppState = {
    currentSystemId: null,
    currentProfile: null,
    activeMenu: null,
    searchKeyword: '',
    modifiedAttrs: new Set(),
    loadedSystems: [],
    currentVersionId: null, // 当前激活的版本 ID

    async init() {
        // 初始化存储层（检测后端 API）
        await Storage.init();

        this.loadedSystems = await Storage.listSystems();

        this.bindEvents();
        this.renderSystemSelector();
        this.updateUserDisplay();

        // 监听浏览器前进/后退
        window.addEventListener('popstate', () => this._onPopState());

        // 从 URL hash 恢复状态（支持刷新后保持页面）
        const hashState = this._parseUrlHash();
        if (hashState && hashState.systemId) {
            await this.enterSystem(hashState.systemId);
            if (hashState.menuPath) {
                this.navigateToMenu(hashState.menuPath, true); // silent = 不更新 hash
            }
        } else {
            this.showHomepage();
        }
    },

    /* ============ URL Hash 路由 ============ */

    /**
     * 解析 URL hash → { systemId, menuPath }
     * 格式: #/{systemId}/{encodedMenuPath}
     */
    _parseUrlHash() {
        const hash = location.hash;
        if (!hash || hash === '#/' || hash === '#') return null;
        const body = hash.slice(2); // 去掉 "#/"
        if (!body) return null;
        const parts = body.split('/');
        const systemId = decodeURIComponent(parts[0] || '');
        if (!systemId) return null;
        let menuPath = null;
        if (parts.length > 1) {
            const pathStr = decodeURIComponent(parts.slice(1).join('/'));
            menuPath = pathStr || null; // 空字符串转为 null
        }
        return { systemId, menuPath };
    },

    /**
     * 更新 URL hash（用 replaceState 避免污染浏览器历史）
     */
    _updateUrlHash(systemId, menuPath) {
        let hash = '#/';
        if (systemId) {
            hash += encodeURIComponent(systemId);
            if (menuPath) {
                hash += '/' + encodeURIComponent(menuPath);
            }
        }
        if (location.hash !== hash) {
            history.replaceState(null, '', hash);
        }
    },

    /**
     * 浏览器前进/后退时恢复状态
     */
    _onPopState() {
        const state = this._parseUrlHash();
        if (!state || !state.systemId) {
            // 回到首页
            if (this.currentSystemId) {
                this.showHomepage();
            }
            return;
        }
        // 切换机型（如果需要）
        if (state.systemId !== this.currentSystemId) {
            this.enterSystem(state.systemId).then(() => {
                if (state.menuPath) this.navigateToMenu(state.menuPath, true);
            });
        } else if (state.menuPath !== this.activeMenu) {
            this.navigateToMenu(state.menuPath, true);
        }
    },

    /* ============ 首页 ============ */

    showHomepage() {
        const homepage = $id('homepage');
        const detailView = $id('detail-view');
        if (homepage) homepage.classList.remove('hidden');
        if (detailView) detailView.classList.add('hidden');
        this.currentSystemId = null;
        this.currentProfile = null;
        this.activeMenu = null;
        // 清除 URL hash
        if (location.hash && location.hash !== '#/' && location.hash !== '#') {
            history.replaceState(null, '', '#/');
        }
        this.renderHomepage();
    },

    async renderHomepage() {
        const container = $id('system-cards');
        if (!container) return;

        this.loadedSystems = await Storage.listSystems();

        if (this.loadedSystems.length === 0) {
            container.innerHTML = '<div class="empty-homepage"><div class="empty-icon">📋</div><p>暂无机型数据</p><p style="font-size:13px;color:#999;">请导入 BIOS 配置文件或加载示例数据</p></div>';
            return;
        }

        let html = '';
        for (const sys of this.loadedSystems) {
            // 获取版本数量
            let versionCount = 0;
            try {
                const versions = await Storage.listVersions(sys.systemId);
                versionCount = versions.length;
            } catch (e) { /* 忽略 */ }

            html += '<div class="system-card" data-system-id="' + UICommon.escAttr(sys.systemId) + '">' +
                '<div class="system-card-header">' +
                    '<h3 class="system-card-title">' + UICommon.escHtml(sys.productName || sys.systemId) + '</h3>' +
                    '<span class="system-card-id">' + UICommon.escHtml(sys.systemId) + '</span>' +
                '</div>' +
                '<div class="system-card-body">' +
                    '<div class="system-card-stat"><span class="stat-label">属性数</span><span class="stat-value">' + (sys.attrCount || 0) + '</span></div>' +
                    '<div class="system-card-stat"><span class="stat-label">版本数</span><span class="stat-value">' + versionCount + '</span></div>' +
                    (sys.firmwareVersion ? '<div class="system-card-stat"><span class="stat-label">固件</span><span class="stat-value">' + UICommon.escHtml(sys.firmwareVersion) + '</span></div>' : '') +
                '</div>' +
                '<div class="system-card-footer">' +
                    '<button class="btn btn-primary btn-small btn-enter-system" data-system-id="' + UICommon.escAttr(sys.systemId) + '">进入配置 →</button>' +
                '</div>' +
            '</div>';
        }
        container.innerHTML = html;

        // 绑定点击事件
        container.querySelectorAll('.btn-enter-system').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const systemId = e.target.dataset.systemId;
                await this.enterSystem(systemId);
            });
        });
    },

    async enterSystem(systemId) {
        const homepage = $id('homepage');
        const detailView = $id('detail-view');
        if (homepage) homepage.classList.add('hidden');
        if (detailView) detailView.classList.remove('hidden');
        await this.switchSystem(systemId, true);
        this.renderVersionList();
        // 进入机型后更新 URL hash
        this._updateUrlHash(systemId, null);
    },

    /* ============ 版本管理 ============ */

    async renderVersionList() {
        const listEl = $id('version-list');
        if (!listEl || !this.currentSystemId) return;

        try {
            const versions = await Storage.listVersions(this.currentSystemId);
            if (versions.length === 0) {
                listEl.innerHTML = '<div class="version-empty">暂无保存的版本</div>';
                return;
            }

            let html = '';
            for (const v of versions) {
                const date = new Date(v.savedAt);
                const dateStr = date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                const isCurrent = v.id === this.currentVersionId;
                html += '<div class="version-item' + (isCurrent ? ' version-current' : '') + '" data-version-id="' + UICommon.escAttr(v.id) + '">' +
                    '<div class="version-info">' +
                        '<span class="version-name">' + UICommon.escHtml(v.label) +
                            (isCurrent ? ' <span class="version-current-badge">当前</span>' : '') +
                        '</span>' +
                        '<span class="version-meta">' + (v.attrCount || 0) + ' 项 · ' + dateStr + '</span>' +
                    '</div>' +
                    '<div class="version-actions">' +
                        (isCurrent ? '<span class="btn btn-small btn-current-version" disabled>使用中</span>' :
                        '<button class="btn btn-small btn-activate-version" data-version-id="' + UICommon.escAttr(v.id) + '" title="切换到此版本">切换</button>') +
                        '<button class="btn btn-small btn-delete-version" data-version-id="' + UICommon.escAttr(v.id) + '" title="删除此版本">🗑</button>' +
                    '</div>' +
                '</div>';
            }
            listEl.innerHTML = html;

            // 绑定事件
            listEl.querySelectorAll('.btn-activate-version').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const vid = e.target.dataset.versionId;
                    await this.activateVersion(vid);
                });
            });
            listEl.querySelectorAll('.btn-delete-version').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const vid = e.target.dataset.versionId;
                    await this.doDeleteVersion(vid);
                });
            });
        } catch (e) {
            listEl.innerHTML = '<div class="version-empty">加载版本失败</div>';
        }
    },

    showSaveVersionDialog() {
        if (!this.currentSystemId) {
            UIRenderer.showNotification('请先选择机型', 'warn');
            return;
        }

        const html = '<div class="form-group">' +
            '<label>版本号</label>' +
            '<input type="text" id="version-label-input" class="form-input" placeholder="例如: v1.0, v2.3" />' +
            '<p class="form-hint">输入版本标识（如 v1.0、初始版本 等）</p>' +
        '</div>';

        UIRenderer.showModal('保存版本', html, () => {
            const input = $id('version-label-input');
            const label = input ? input.value.trim() : '';
            if (!label) {
                UIRenderer.showNotification('请输入版本号', 'warn');
                return false;
            }
            this.doSaveVersion(label);
        });
    },

    async doSaveVersion(label) {
        try {
            await Storage.saveVersion(this.currentSystemId, label);
            this.currentVersionId = label;
            localStorage.setItem('cv_' + this.currentSystemId, label);
            UIRenderer.showNotification('版本已保存: ' + label, 'success');
            this.renderVersionList();
            this.renderHomepage(); // 刷新首页版本数
        } catch (e) {
            UIRenderer.showNotification('保存版本失败: ' + e.message, 'error', 5000);
        }
    },

    async activateVersion(versionId) {
        try {
            await Storage.activateVersion(this.currentSystemId, versionId);
            UIRenderer.showNotification('已切换到版本: ' + versionId, 'success');
            // 重新加载当前机型（会重置 currentVersionId）
            await this.switchSystem(this.currentSystemId, true);
            // 在 switchSystem 重置后重新标记当前版本并持久化
            this.currentVersionId = versionId;
            localStorage.setItem('cv_' + this.currentSystemId, versionId);
            this.renderVersionList();
        } catch (e) {
            UIRenderer.showNotification('切换版本失败: ' + e.message, 'error', 5000);
        }
    },

    async doDeleteVersion(versionId) {
        UIRenderer.showModal(
            '确认删除版本',
            '<p>确定要删除版本 <strong>' + UICommon.escHtml(versionId) + '</strong> 吗？</p>',
            async () => {
                try {
                    await Storage.deleteVersion(this.currentSystemId, versionId);
                    // 如果删除的是当前版本，清除标记
                    if (this.currentVersionId === versionId) {
                        this.currentVersionId = null;
                        localStorage.removeItem('cv_' + this.currentSystemId);
                    }
                    UIRenderer.showNotification('版本已删除', 'success');
                    this.renderVersionList();
                    this.renderHomepage();
                } catch (e) {
                    UIRenderer.showNotification('删除失败: ' + e.message, 'error', 5000);
                }
            }
        );
    },

    /* ============ 版本对比 ============ */

    async showVersionCompareDialog() {
        if (!this.currentSystemId) {
            UIRenderer.showNotification('请先选择机型', 'warn');
            return;
        }

        try {
            const versions = await Storage.listVersions(this.currentSystemId);
            if (versions.length < 2) {
                UIRenderer.showNotification('至少需要保存 2 个版本才能进行对比', 'warn');
                return;
            }

            const buildOptions = (selectedId) => {
                return '<option value="">请选择版本</option>' +
                    versions.map(v => {
                        const date = new Date(v.savedAt);
                        const dateStr = date.toLocaleDateString('zh-CN');
                        return '<option value="' + UICommon.escAttr(v.id) + '"' +
                            (v.id === selectedId ? ' selected' : '') +
                            '>' + UICommon.escHtml(v.label) + ' (' + (v.attrCount || 0) + '项, ' + dateStr + ')</option>';
                    }).join('');
            };

            const html = '<div class="form-group">' +
                '<label>基准版本（旧）</label>' +
                '<select id="compare-version-a" class="form-input">' + buildOptions('') + '</select>' +
                '</div>' +
                '<div class="form-group">' +
                '<label>对比版本（新）</label>' +
                '<select id="compare-version-b" class="form-input">' + buildOptions('') + '</select>' +
                '</div>' +
                '<p class="form-hint">选择两个版本，系统将显示属性差异（新增、删除、修改）</p>';

            UIRenderer.showModal('版本对比', html, () => {
                const vA = document.getElementById('compare-version-a')?.value;
                const vB = document.getElementById('compare-version-b')?.value;
                if (!vA || !vB) {
                    UIRenderer.showNotification('请选择两个版本', 'warn');
                    return false;
                }
                if (vA === vB) {
                    UIRenderer.showNotification('请选择两个不同的版本', 'warn');
                    return false;
                }
                // 先关闭选择对话框，再执行对比（避免两个模态框共用同一个 DOM 元素导致内容覆盖）
                setTimeout(() => this.compareVersions(vA, vB), 50);
            });
        } catch (e) {
            UIRenderer.showNotification('加载版本列表失败: ' + e.message, 'error', 5000);
        }
    },

    async compareVersions(v1Id, v2Id) {
        try {
            UIRenderer.showNotification('正在加载版本数据...', 'info');

            const [data1, data2] = await Promise.all([
                Storage.getVersion(this.currentSystemId, v1Id),
                Storage.getVersion(this.currentSystemId, v2Id)
            ]);

            if (!data1.profile || !data2.profile) {
                UIRenderer.showNotification('版本数据加载失败', 'error');
                return;
            }

            // 根据 savedAt 时间确定新旧版本顺序（确保 A 是旧版本，B 是新版本）
            const date1 = new Date(data1.savedAt);
            const date2 = new Date(data2.savedAt);
            let oldProfile, newProfile, oldLabel, newLabel;
            if (date1 <= date2) {
                oldProfile = data1.profile;
                newProfile = data2.profile;
                oldLabel = data1.label;
                newLabel = data2.label;
            } else {
                oldProfile = data2.profile;
                newProfile = data1.profile;
                oldLabel = data2.label;
                newLabel = data1.label;
            }

            const diff = this._computeAttrDiff(oldProfile.attrMap || {}, newProfile.attrMap || {});
            this._showVersionDiffDialog(oldLabel, newLabel, diff);
        } catch (e) {
            UIRenderer.showNotification('版本对比失败: ' + e.message, 'error', 5000);
        }
    },

    _computeAttrDiff(attrMapA, attrMapB) {
        const keysA = Object.keys(attrMapA);
        const keysB = Object.keys(attrMapB);
        const allKeys = new Set([...keysA, ...keysB]);

        // 需要对比的字段
        const compareFields = [
            'type', 'defaultValue', 'displayName', 'displayNameZh',
            'menuPath', 'readOnly', 'grayOut', 'hidden',
            'supportsRedfish', 'supportsUnicfg', 'attributeScope',
            'helpText', 'helpTextZh', 'warningText', 'platforms'
        ];

        const result = { added: [], removed: [], modified: [], unchanged: [] };

        for (const key of allKeys) {
            const inA = attrMapA[key];
            const inB = attrMapB[key];

            if (inA && !inB) {
                // 仅在旧版本中存在 = 已删除
                result.removed.push({ key, attr: inA });
            } else if (!inA && inB) {
                // 仅在新版本中存在 = 新增
                result.added.push({ key, attr: inB });
            } else {
                // 两个版本都有 = 检查差异
                const changes = [];
                for (const field of compareFields) {
                    let valA = inA[field];
                    let valB = inB[field];

                    // 对于数组字段（如 platforms），排序后再比较，避免顺序不同导致误判
                    if (Array.isArray(valA) && Array.isArray(valB)) {
                        valA = [...valA].sort();
                        valB = [...valB].sort();
                    }

                    const strA = JSON.stringify(valA);
                    const strB = JSON.stringify(valB);
                    if (strA !== strB) {
                        changes.push({
                            field,
                            oldVal: inA[field],
                            newVal: inB[field]
                        });
                    }
                }
                if (changes.length > 0) {
                    result.modified.push({ key, changes, attrA: inA, attrB: inB });
                } else {
                    result.unchanged.push({ key });
                }
            }
        }

        // 排序
        result.added.sort((a, b) => a.key.localeCompare(b.key));
        result.removed.sort((a, b) => a.key.localeCompare(b.key));
        result.modified.sort((a, b) => a.key.localeCompare(b.key));
        result.unchanged.sort((a, b) => a.key.localeCompare(b.key));

        return result;
    },

    _showVersionDiffDialog(labelA, labelB, diff) {
        const totalCount = diff.added.length + diff.removed.length + diff.modified.length + diff.unchanged.length;
        const changedCount = diff.added.length + diff.removed.length + diff.modified.length;

        const fieldLabelMap = {
            type: '类型', defaultValue: '默认值', displayName: '显示名',
            displayNameZh: '中文名', menuPath: '菜单路径', readOnly: '只读',
            grayOut: '灰显', hidden: '隐藏', supportsRedfish: '支持Redfish',
            supportsUnicfg: '支持Unicfg', attributeScope: '适用范围',
            helpText: '帮助文本', warningText: '警告文本', platforms: '适用平台'
        };

        const formatVal = (v) => {
            if (v === null || v === undefined) return '<空>';
            if (typeof v === 'boolean') return v ? '是' : '否';
            if (Array.isArray(v)) return v.length > 0 ? v.join(', ') : '<空>';
            const s = String(v);
            return s.length > 60 ? s.substring(0, 57) + '...' : s;
        };

        let bodyHtml = '<div class="diff-summary">' +
            '<span class="diff-stat diff-total">共 ' + totalCount + ' 项</span>' +
            '<span class="diff-stat diff-changed">变更 ' + changedCount + ' 项</span>' +
            '<span class="diff-stat diff-added">新增 ' + diff.added.length + '</span>' +
            '<span class="diff-stat diff-removed">删除 ' + diff.removed.length + '</span>' +
            '<span class="diff-stat diff-modified">修改 ' + diff.modified.length + '</span>' +
            '</div>';

        if (changedCount === 0) {
            bodyHtml += '<div class="diff-empty">两个版本完全一致，无任何差异</div>';
        } else {
            // 新增属性
            if (diff.added.length > 0) {
                bodyHtml += '<div class="diff-section"><h4 class="diff-section-title diff-added-title">新增属性 (' + diff.added.length + ')</h4>';
                bodyHtml += '<table class="diff-table"><thead><tr><th>属性标识</th><th>类型</th><th>默认值</th><th>菜单路径</th></tr></thead><tbody>';
                for (const item of diff.added) {
                    bodyHtml += '<tr class="diff-row-added">' +
                        '<td class="diff-key">' + UICommon.escHtml(item.key) + '</td>' +
                        '<td>' + UICommon.escHtml(item.attr.type) + '</td>' +
                        '<td>' + UICommon.escHtml(formatVal(item.attr.defaultValue)) + '</td>' +
                        '<td>' + UICommon.escHtml(item.attr.menuPath) + '</td>' +
                        '</tr>';
                }
                bodyHtml += '</tbody></table></div>';
            }

            // 删除属性
            if (diff.removed.length > 0) {
                bodyHtml += '<div class="diff-section"><h4 class="diff-section-title diff-removed-title">删除属性 (' + diff.removed.length + ')</h4>';
                bodyHtml += '<table class="diff-table"><thead><tr><th>属性标识</th><th>类型</th><th>默认值</th><th>菜单路径</th></tr></thead><tbody>';
                for (const item of diff.removed) {
                    bodyHtml += '<tr class="diff-row-removed">' +
                        '<td class="diff-key">' + UICommon.escHtml(item.key) + '</td>' +
                        '<td>' + UICommon.escHtml(item.attr.type) + '</td>' +
                        '<td>' + UICommon.escHtml(formatVal(item.attr.defaultValue)) + '</td>' +
                        '<td>' + UICommon.escHtml(item.attr.menuPath) + '</td>' +
                        '</tr>';
                }
                bodyHtml += '</tbody></table></div>';
            }

            // 修改属性
            if (diff.modified.length > 0) {
                bodyHtml += '<div class="diff-section"><h4 class="diff-section-title diff-modified-title">修改属性 (' + diff.modified.length + ')</h4>';
                bodyHtml += '<table class="diff-table"><thead><tr><th>属性标识</th><th>变更字段</th><th>旧值</th><th>新值</th></tr></thead><tbody>';
                for (const item of diff.modified) {
                    const firstChange = item.changes[0];
                    const fieldLabel = fieldLabelMap[firstChange.field] || firstChange.field;
                    bodyHtml += '<tr class="diff-row-modified">' +
                        '<td class="diff-key" rowspan="' + item.changes.length + '">' + UICommon.escHtml(item.key) + '</td>' +
                        '<td>' + UICommon.escHtml(fieldLabel) + '</td>' +
                        '<td class="diff-old-val">' + UICommon.escHtml(formatVal(firstChange.oldVal)) + '</td>' +
                        '<td class="diff-new-val">' + UICommon.escHtml(formatVal(firstChange.newVal)) + '</td>' +
                        '</tr>';
                    // 一行有多个字段变更时追加行
                    for (let i = 1; i < item.changes.length; i++) {
                        const c = item.changes[i];
                        const fl = fieldLabelMap[c.field] || c.field;
                        bodyHtml += '<tr class="diff-row-modified">' +
                            '<td>' + UICommon.escHtml(fl) + '</td>' +
                            '<td class="diff-old-val">' + UICommon.escHtml(formatVal(c.oldVal)) + '</td>' +
                            '<td class="diff-new-val">' + UICommon.escHtml(formatVal(c.newVal)) + '</td>' +
                            '</tr>';
                    }
                }
                bodyHtml += '</tbody></table></div>';
            }
        }

        const title = '版本对比: ' + UICommon.escHtml(labelA) + ' → ' + UICommon.escHtml(labelB);
        UIRenderer.showModal(title, bodyHtml, null, null, {
            confirmText: '关闭',
            hideCancel: true,
            modalWidth: '800px'
        });
    },

    bindEvents() {
        // ====== 下拉菜单开关 ======
        document.addEventListener('click', (e) => {
            // 关闭所有下拉
            document.querySelectorAll('.dropdown.active').forEach(d => {
                if (!d.contains(e.target)) d.classList.remove('active');
            });
        });

        const setupDropdown = (btnId) => {
            const btn = $id(btnId);
            if (!btn) return;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = btn.closest('.dropdown');
                if (dropdown) {
                    const wasActive = dropdown.classList.contains('active');
                    // 关闭所有下拉
                    document.querySelectorAll('.dropdown.active').forEach(d => d.classList.remove('active'));
                    if (!wasActive) dropdown.classList.add('active');
                }
            });
        };
        setupDropdown('btn-data-menu');
        setupDropdown('btn-actions-menu');
        setupDropdown('btn-system-more');
        setupDropdown('btn-login');

        // ====== 下拉菜单项 (data-action 分派) ======
        document.addEventListener('click', (e) => {
            const item = e.target.closest('.dropdown-item');
            if (!item) return;
            const action = item.dataset.action;
            if (!action) return;

            // 关闭所有下拉
            document.querySelectorAll('.dropdown.active').forEach(d => d.classList.remove('active'));

            switch (action) {
                case 'import':       Auth.requireAdmin('导入文件').then(ok => { if (ok) this.handleImport(); }); break;
                case 'load-demo':    Auth.requireAdmin('加载示例数据').then(ok => { if (ok) this.loadDemoData(); }); break;
                case 'export-excel': this.exportFormat('excel'); break;
                case 'export-json':  this.exportFormat('json'); break;
                case 'export-template': this.exportTemplate(); break;
                case 'add-attr':     Auth.requireAdmin('添加选项').then(ok => { if (ok) this.handleAddAttribute(); }); break;
                case 'delete-system': Auth.requireAdmin('删除机型').then(ok => { if (ok) this.deleteCurrentSystem(); }); break;
                case 'open-system-manager': Auth.requireAdmin('机型管理').then(ok => { if (ok) SystemManager.open(); }); break;
            }
        });

        // ====== 工具栏 ======
        const on = (id, evt, handler) => { const el = $id(id); if (el) el.addEventListener(evt, handler); };

        // 返回首页
        on('btn-back-home', 'click', () => this.showHomepage());

        // 保存版本
        on('btn-save-version', 'click', () => this.showSaveVersionDialog());

        // 版本对比
        on('btn-compare-version', 'click', () => this.showVersionCompareDialog());

        // 添加选项（内容区独立按钮）
        on('btn-add-attr', 'click', () => {
            Auth.requireAdmin('添加选项').then(ok => { if (ok) this.handleAddAttribute(); });
        });

        // 列设置按钮
        on('btn-column-settings', 'click', (e) => {
            e.stopPropagation();
            this.toggleColumnSettingsPanel();
        });

        // 登录/用户
        on('btn-login', 'click', (e) => {
            if (!Auth.isLoggedIn) {
                // 未登录：显示登录对话框
                e.stopPropagation();
                Auth.showLoginDialog(() => this.refreshUI());
            }
        });

        // 退出登录
        document.addEventListener('click', (e) => {
            const item = e.target.closest('.dropdown-item[data-action="logout"]');
            if (item) {
                Auth.logout();
                this.refreshUI();
                UIRenderer.showNotification('已登出', 'info');
                // 关闭下拉菜单
                const dropdown = document.getElementById('dropdown-user');
                if (dropdown) dropdown.classList.remove('active');
            }
        });
        this.updateUserDisplay();

        // 搜索
        const searchInput = $id('search-input');
        let searchTimer;
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(() => {
                    this.handleSearch(searchInput.value);
                }, 300);
            });
        }
        on('btn-clear-search', 'click', () => this.clearSearch());

        // 筛选栏（input 防抖避免按键触发全量重渲染）
        const filterIds = ['filter-attr', 'filter-type', 'filter-scope', 'filter-platform', 'filter-readonly', 'filter-redfish'];
        let _filterTimer;
        for (const id of filterIds) {
            const el = $id(id);
            if (el) {
                el.addEventListener('input', () => {
                    clearTimeout(_filterTimer);
                    _filterTimer = setTimeout(() => this.refreshTable(), 120);
                });
                el.addEventListener('change', () => {
                    clearTimeout(_filterTimer);
                    this.refreshTable();
                });
            }
        }
        on('btn-clear-filter', 'click', () => this.clearFilters());

        // 手动添加菜单（事件委托）
        const menuTree = $id('menu-tree');
        if (menuTree) {
            menuTree.addEventListener('click', (e) => {
                if (e.target.closest('#btn-add-menu')) { Auth.requireAdmin('添加菜单').then(ok => { if (ok) this.handleAddMenu(); }); }
            });
            on('btn-add-menu', 'click', () => { Auth.requireAdmin('添加菜单').then(ok => { if (ok) this.handleAddMenu(); }); });
        }

        // 内容区事件委托（编辑、还原按钮）
        const tbody = $id('attribute-tbody');
        if (tbody) {
            tbody.addEventListener('click', (e) => {
                const btn = e.target.closest('button[data-attr]:not(.btn-reset):not(.btn-icon-disabled)');
                if (btn) {
                    Auth.requireAdmin('编辑属性').then(ok => { if (ok) this.startEdit(btn.dataset.attr); });
                    return;
                }
                const resetBtn = e.target.closest('.btn-reset');
                if (resetBtn) {
                    Auth.requireAdmin('还原属性').then(ok => { if (ok) this.resetAttribute(resetBtn.dataset.attr); });
                }
            });
        }

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') { e.preventDefault(); UIRenderer.showNotification('修改已自动保存', 'info', 2000); }
            if (e.ctrlKey && e.key === 'f') { e.preventDefault(); $id('search-input')?.focus(); }
            if (e.key === 'Escape') { this.cancelAllEdits(); UIRenderer.hideModal(); }
        });
    },

    /* ============ 机型管理 ============ */

    async switchSystem(systemId, silent = false) {
        if (this.currentProfile && this.modifiedAttrs.size > 0 && !silent) {
            const name = this.currentProfile.productName || this.currentSystemId;
            UIRenderer.showModal(
                '未保存的修改',
                '<p>当前机型 <strong>' + UIRenderer.escHtml(name) + '</strong> 有 ' + this.modifiedAttrs.size + ' 项未保存的修改。</p><p>是否在切换前保存？</p>',
                async () => {
                    this.saveCurrentChanges();
                    await this.initSystem(systemId);
                },
                async () => {
                    await this.initSystem(systemId);
                }
            );
            return;
        }

        await this.initSystem(systemId);
    },

    async initSystem(systemId) {
        const profile = await Storage.loadSystem(systemId);
        if (!profile) {
            UIRenderer.showNotification('加载失败', 'error');
            return;
        }

        this.currentSystemId = systemId;
        this.currentProfile = profile;
        this.searchKeyword = '';
        this.modifiedAttrs = new Set();
        // 从 localStorage 恢复当前版本标记，刷新后不丢失
        this.currentVersionId = localStorage.getItem('cv_' + systemId) || null;

        // 默认选中第一个菜单
        const rootMenus = MenuTree.buildTree(profile.menuMap);
        if (rootMenus.length > 0) {
            this.activeMenu = rootMenus[0].menuPath;
        } else {
            this.activeMenu = null;
        }

        // 清除搜索
        const searchInput = $id('search-input');
        const clearBtn = $id('btn-clear-search');
        if (searchInput) searchInput.value = '';
        if (clearBtn) clearBtn.classList.add('hidden');

        // 评估依赖
        DependencyEngine.evaluateAll(profile);

        // 渲染
        this.refreshUI();
        this.renderSystemSelector();

        UIRenderer.showNotification('已加载: ' + (profile.productName || systemId), 'info', 2000);
    },

    async refreshAfterDelete() {
        this.currentSystemId = null;
        this.currentProfile = null;
        this.activeMenu = null;
        this.modifiedAttrs = new Set();
        this.loadedSystems = await Storage.listSystems();
        this.renderSystemSelector();
        this.showHomepage();
    },

    async saveCurrentChanges() {
        if (!this.currentProfile) return;
        if (this.modifiedAttrs.size === 0) {
            UIRenderer.showNotification('没有需要保存的修改', 'info');
            return;
        }

        try {
            await Storage.saveSystem(this.currentProfile);
            UIRenderer.showNotification('已保存 ' + this.modifiedAttrs.size + ' 项修改', 'success');
            this.modifiedAttrs = new Set();
            this.refreshTable();
            this.updateModifiedCount();
        } catch (e) {
            UIRenderer.showNotification('保存失败: ' + e.message, 'error', 5000);
        }
    },

    /* ============ 导入导出 ============ */

    handleImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.json.gz,.xlsx,.xls';
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                UIRenderer.showNotification('正在解析文件...', 'info', 2000);
                const profile = await Parser.parseFile(file);

                // 用文件名作为机型名
                profile.productName = file.name.replace(/\.(json|json\.gz|xlsx|xls)$/i, '');

                // 检查是否已存在
                const systems = await Storage.listSystems();
                const existing = systems.find(s => s.systemId === profile.systemId);
                if (existing) {
                    UIRenderer.showModal(
                        '覆盖确认',
                        '<p>机型 <strong>' + UIRenderer.escHtml(profile.productName || profile.systemId) +
                        '</strong> 已存在（' + existing.attrCount + '项属性）。</p><p>是否覆盖？</p>',
                        () => {
                            this.importProfile(profile);
                        }
                    );
                } else {
                    this.importProfile(profile);
                }
            } catch (err) {
                UIRenderer.showNotification('导入失败: ' + err.message, 'error', 5000);
                console.error(err);
            }
        });
        input.click();
    },

    async importProfile(profile) {
        DependencyEngine.evaluateAll(profile);
        // 覆盖已有机型时，先加载版本号避免乐观锁冲突
        if (Storage._mode === 'api') {
            await Storage.loadSystem(profile.systemId);
        }
        await Storage.saveSystem(profile);

        this.currentSystemId = profile.systemId;
        this.currentProfile = profile;
        this.activeMenu = null;
        this.modifiedAttrs = new Set();

        this.loadedSystems = await Storage.listSystems();
        this.refreshUI();
        this.renderSystemSelector();

        // 显示导入结果
        const attrCount = Object.keys(profile.attrMap).length;
        const menuCount = Object.keys(profile.menuMap).length;
        const depCount = profile.dependencies.length;
        const errCount = profile.importErrors.length;

        let msg = '导入成功: ' + attrCount + ' 个属性';
        if (menuCount > 0) msg += ', ' + menuCount + ' 个菜单';
        if (depCount > 0) msg += ', ' + depCount + ' 个依赖关系';
        if (errCount > 0) msg += ' (' + errCount + ' 个警告)';
        UIRenderer.showNotification(msg, 'success', 4000);
    },

    /** 按格式导出（下拉菜单直调） */
    exportFormat(format) {
        if (!this.currentProfile) {
            UIRenderer.showNotification('请先导入或选择机型', 'warn');
            return;
        }
        try {
            if (format === 'json') {
                Exporter.exportToRegistryJSON(this.currentProfile);
                UIRenderer.showNotification('Registry JSON 导出成功', 'success');
            } else {
                Exporter.exportToExcel(this.currentProfile);
                UIRenderer.showNotification('Excel 导出成功', 'success');
            }
        } catch (err) {
            UIRenderer.showNotification('导出失败: ' + err.message, 'error');
        }
    },

    exportTemplate() {
        try {
            Exporter.exportTemplateExcel();
            UIRenderer.showNotification('实例模板导出成功', 'success');
        } catch (err) {
            UIRenderer.showNotification('导出模板失败: ' + err.message, 'error');
        }
    },

    /** 删除当前机型（从 ⋮ 菜单触发，需确认） */
    deleteCurrentSystem() {
        if (!this.currentProfile) return;
        const name = this.currentProfile.productName || this.currentProfile.systemId;
        UIRenderer.showModal(
            '确认删除',
            '<p>确定要删除机型 <strong>' + UICommon.escHtml(name) + '</strong> 的所有数据吗？此操作不可恢复。</p>',
            async () => {
                await Storage.deleteSystem(this.currentSystemId);
                this.refreshAfterDelete();
            }
        );
    },

    handleBackupImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const result = await Storage.importFromJSONFile(file);
                let msg = '已恢复 ' + result.count + ' 个机型';
                if (result.errors.length > 0) msg += '（' + result.errors.length + ' 个错误）';
                UIRenderer.showNotification(msg, 'success');

                await this.refreshAfterDelete();
                const systems = await Storage.listSystems();
                if (this.loadedSystems.length === 0 && systems.length > 0) {
                    this.loadedSystems = systems;
                    this.switchSystem(this.loadedSystems[0].systemId, true);
                }
            } catch (err) {
                UIRenderer.showNotification('恢复失败: ' + err.message, 'error');
            }
        });
        input.click();
    },

    /* ============ 编辑 ============ */

    startEdit(attrName) {
        if (!this.currentProfile) return;
        const attr = this.currentProfile.attrMap[attrName];
        if (!attr || isEffectivelyDisabled(attr)) {
            UIRenderer.showNotification('此属性不可编辑', 'warn');
            return;
        }

        try {
            const displayName = attr.displayNameZh || attr.displayName || attr.attributeName;
            UIRenderer.showModal(
                '编辑 - ' + displayName,
                UIRenderer.buildEditAttributeForm(attr, this.currentProfile),
                () => this.confirmEditFromModal(attr),
                null
            );

            setTimeout(() => {
                const el = document.getElementById('edit_attr_value');
                if (el && el.type !== 'checkbox') el.focus();
            }, 150);

            // 绑定删除按钮
            setTimeout(() => {
                const delBtn = document.getElementById('btn-delete-attr');
                if (delBtn) {
                    delBtn.addEventListener('click', () => {
                        UIRenderer.hideModal();
                        this.confirmDeleteAttribute(attr.attributeName, displayName);
                    });
                }
            }, 100);
        } catch (err) {
            console.error('编辑弹窗打开失败:', err);
            UIRenderer.showNotification('编辑功能异常: ' + err.message, 'error', 5000);
        }
    },

    confirmDeleteAttribute(attrName, displayName) {
        if (!Auth.isAdmin) {
            Auth.showLoginDialog(() => {
                // 登录后重新检查权限
                if (Auth.isAdmin) {
                    this.doDeleteAttribute(attrName, displayName);
                }
            });
            return;
        }
        this.doDeleteAttribute(attrName, displayName);
    },

    doDeleteAttribute(attrName, displayName) {
        UIRenderer.showModal(
            '确认删除',
            '<p>确定要删除选项 <strong>' + UICommon.escHtml(displayName || attrName) + '</strong> 吗？</p><p style="color:var(--color-danger);font-size:12px;">此操作不可恢复。</p>',
            () => {
                if (!this.currentProfile || !this.currentProfile.attrMap[attrName]) {
                    UIRenderer.showNotification('选项已不存在', 'warn');
                    return;
                }

                delete this.currentProfile.attrMap[attrName];
                this.modifiedAttrs.delete(attrName);
                debouncedSave(this.currentProfile, '删除选项');
                this.refreshUI();
                UIRenderer.showNotification('已删除: ' + (displayName || attrName), 'info');
            }
        );
    },

    confirmEditFromModal(attr) {
        const data = UIRenderer.extractEditAttributeForm();
        if (!data) {
            UIRenderer.showNotification('属性标识不能为空', 'error');
            return false;
        }

        const oldAttrName = attr.attributeName;
        const profile = this.currentProfile;

        // 1. 如果属性标识变了，更新 attrMap 的 key
        if (data.attributeName !== oldAttrName) {
            // 检查新名称是否已存在
            if (profile.attrMap[data.attributeName]) {
                UIRenderer.showNotification('属性标识 "' + data.attributeName + '" 已存在', 'error');
                return false;
            }
            // 删除旧键，设置新键
            delete profile.attrMap[oldAttrName];
            attr.attributeName = data.attributeName;
            profile.attrMap[data.attributeName] = attr;
            this.modifiedAttrs.delete(oldAttrName);
            this.modifiedAttrs.add(data.attributeName);
        }

        // 2. 类型变更处理
        const typeChanged = data.type !== attr.type;
        if (typeChanged) {
            attr.type = data.type;
            // 清除旧的类型约束
            attr.lowerBound = null;
            attr.upperBound = null;
            attr.scalarIncrement = null;
            attr.minLength = null;
            attr.maxLength = null;
            attr.value = [];
        }

        // 3. 更新类型约束
        if (data.type === 'Enumeration') {
            attr.value = data.value;
        } else if (data.type === 'Integer') {
            attr.lowerBound = data.lowerBound;
            attr.upperBound = data.upperBound;
            attr.scalarIncrement = data.scalarIncrement;
        } else if (data.type === 'String' || data.type === 'Password') {
            attr.minLength = data.minLength;
            attr.maxLength = data.maxLength;
        }

        // 4. 更新其他字段
        attr.displayName = data.displayName || '';
        attr.displayNameZh = data.displayNameZh || '';
        attr.helpText = data.helpText || '';
        attr.helpTextZh = data.helpTextZh || '';
        attr.readOnly = data.readOnly;
        attr.supportsRedfish = data.supportsRedfish;
        attr.supportsUnicfg = data.supportsUnicfg;
        attr.attributeScope = data.attributeScope;
        attr.platforms = data.platforms;

        // 5. 默认值
        if (data.defaultValue) {
            attr.defaultValue = data.defaultValue;
        }

        // 6. 菜单路径
        let menuChanged = false;
        if (data.menuPath && data.menuPath !== attr.menuPath) {
            attr.menuPath = data.menuPath;
            menuChanged = true;
        }

        // 7. 更新当前值/修改值
        if (data.newValue !== null) {
            const validation = Editors.validate(data.newValue, attr);
            if (!validation.valid) {
                UIRenderer.showNotification(validation.message, 'error');
                return false;
            }
            attr.modifiedValue = data.newValue;
            this.modifiedAttrs.add(attr.attributeName);
        }

        // 8. 评估依赖
        const affected = DependencyEngine.evaluate(profile, attr.attributeName, data.newValue);

        // 9. 刷新
        this.updateModifiedCount();
        this.refreshTable();
        if (menuChanged || typeChanged || data.attributeName !== oldAttrName) {
            UIRenderer.renderSidebar(profile, this.activeMenu, (p) => this.navigateToMenu(p));
        }

        if (affected.length > 0) {
            UIRenderer.showNotification('修改已应用，' + affected.length + ' 个关联属性状态已更新', 'info');
        }

        if (attr.warningText) {
            UIRenderer.showNotification('警告: ' + attr.warningText, 'warn', 5000);
        }

        // 防抖自动保存
        debouncedSave(profile, '编辑');

        return true;
    },

    cancelEdit(valueCell) {
        this.refreshTable();
    },

    cancelAllEdits() {
        this.refreshTable();
    },

    resetAttribute(attrName) {
        if (!this.currentProfile) return;
        const attr = this.currentProfile.attrMap[attrName];
        if (!attr) return;

        attr.modifiedValue = null;
        this.modifiedAttrs.delete(attrName);

        debouncedSave(this.currentProfile, '还原');

        // 重新评估依赖
        const affected = DependencyEngine.evaluate(this.currentProfile, attrName,
            attr.currentValue ?? attr.defaultValue);

        this.updateModifiedCount();
        this.refreshTable();

        UIRenderer.showNotification('已还原: ' + attrName, 'info');
    },


    /* ============ 搜索与筛选 ============ */

    handleSearch(keyword) {
        this.searchKeyword = keyword.trim();
        const clearBtn = $id('btn-clear-search');
        const pathEl = $id('current-menu-path');

        if (!keyword.trim()) {
            if (clearBtn) clearBtn.classList.add('hidden');
            this.refreshTable();
            if (pathEl) pathEl.textContent = this.activeMenu || '所有属性';
            return;
        }

        if (clearBtn) clearBtn.classList.remove('hidden');

        if (!this.currentProfile) return;
        const results = UIRenderer.search(this.currentProfile, keyword);
        if (results.length > 0) {
            UIRenderer.renderSearchResults(results);
        } else {
            const tbody = $id('attribute-tbody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:24px;color:var(--text-tertiary);">未找到匹配的属性</td></tr>';
            }
            const countEl = $id('result-count');
            if (countEl) countEl.textContent = '(0 项)';
        }
    },

    clearSearch() {
        this.searchKeyword = '';
        const searchInput = $id('search-input');
        const clearBtn = $id('btn-clear-search');
        if (searchInput) searchInput.value = '';
        if (clearBtn) clearBtn.classList.add('hidden');
        this.refreshTable();
        const pathEl = $id('current-menu-path');
        if (pathEl) pathEl.textContent = this.activeMenu || '所有属性';
    },

    clearFilters() {
        const inputs = ['filter-attr'];
        const selects = ['filter-type', 'filter-scope', 'filter-platform', 'filter-readonly', 'filter-redfish'];
        for (const id of inputs) { const el = $id(id); if (el) el.value = ''; }
        for (const id of selects) { const el = $id(id); if (el) el.value = ''; }
        this.refreshTable();
    },

    /**
     * 清除单个筛选字段（由筛选标签点击触发）
     */
    clearFilterById(filterId) {
        const el = $id(filterId);
        if (el) {
            el.value = '';
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    },

    /* ============ 菜单导航 ============ */

    navigateToMenu(menuPath, silent) {
        this.activeMenu = menuPath;

        // 更新 URL hash（silent 模式下跳过，避免循环触发）
        if (!silent) {
            this._updateUrlHash(this.currentSystemId, menuPath);
        }

        // 自动展开该菜单路径的所有祖先（清除折叠状态）
        if (menuPath) {
            UISidebar.clearCollapseStateForPath(menuPath);
        }

        const searchInput = $id('search-input');
        const clearBtn = $id('btn-clear-search');
        if (searchInput) searchInput.value = '';
        if (clearBtn) clearBtn.classList.add('hidden');
        this.searchKeyword = '';

        const pathEl = $id('current-menu-path');
        if (menuPath && pathEl) {
            const parts = menuPath.replace('./', '').split('/');
            if (pathEl) pathEl.textContent = parts.join(' / ') || '所有属性';
        } else if (pathEl) {
            pathEl.textContent = '所有属性';
        }

        this.refreshTable();
    },

    /* ============ UI 刷新 ============ */

    updateUserDisplay() {
        const btn = $id('btn-login');
        if (!btn) return;
        const user = Auth.currentUser;
        if (user) {
            const roleLabel = user.role === 'admin' ? '管理员' : '用户';
            const roleCls = user.role === 'admin' ? 'user-role-admin' : 'user-role-user';
            btn.innerHTML = '👤 ' + user.username + '<span class="user-role-badge ' + roleCls + '">' + roleLabel + '</span>';
            btn.title = '点击管理账户';
            btn.className = 'btn btn-small';
        } else {
            btn.innerHTML = '🔒 登录';
            btn.title = '点击登录';
            btn.className = 'btn btn-small btn-secondary';
        }
        // 管理按钮根据角色显示
        const isAdmin = Auth.isLoggedIn && Auth.isAdmin;
        ['btn-system-more'].forEach(id => {
            const el = $id(id);
            if (el) el.classList.toggle('hidden', !isAdmin);
        });
        // 添加菜单按钮仅管理员可见
        const addMenuBtn = $id('btn-add-menu');
        if (addMenuBtn) addMenuBtn.classList.toggle('hidden', !isAdmin);
    },

    refreshUI() {
        this.updateUserDisplay();
        if (!this.currentProfile) return;
        UIRenderer.renderSidebar(this.currentProfile, this.activeMenu, (menuPath) => {
            this.navigateToMenu(menuPath);
        });
        this.refreshTable();
        this.updateModifiedCount();
    },

    refreshTable() {
        if (!this.currentProfile) return;
        const attrs = MenuTree.getAttributesForMenu(this.currentProfile, this.activeMenu);
        UIRenderer.renderAttributeTable(attrs, this.currentProfile);
        this.updateModifiedCount();
    },

    showEmptyState() {
        const table = $id('attribute-table');
        const empty = $id('empty-state');
        const pathEl = $id('current-menu-path');
        const countEl = $id('result-count');
        const modifiedEl = $id('modified-count');
        if (table) table.classList.add('hidden');
        if (empty) empty.classList.remove('hidden');
        if (pathEl) pathEl.textContent = 'BIOS 选项管理器';
        if (countEl) countEl.textContent = '';
        if (modifiedEl) { modifiedEl.textContent = '未修改'; modifiedEl.className = ''; }
    },

    updateModifiedCount() {
        const el = $id('modified-count');
        if (!el) return;
        const count = this.modifiedAttrs.size;
        el.textContent = count > 0 ? '已修改 ' + count + ' 项' : '未修改';
        el.className = count > 0 ? 'has-changes' : '';
    },

    renderSystemSelector() {
        UIRenderer.renderSystemSelector();
    },

    /* ============ 列设置面板 ============ */

    _columnSettingsPanel: null,

    toggleColumnSettingsPanel() {
        if (this._columnSettingsPanel) {
            this._columnSettingsPanel.remove();
            this._columnSettingsPanel = null;
            return;
        }

        const btn = document.getElementById('btn-column-settings');
        if (!btn) return;

        const panel = document.createElement('div');
        panel.className = 'column-settings-popup';
        panel.innerHTML = UITable.renderColumnSettingsPanel();

        // 定位到按钮下方
        const rect = btn.getBoundingClientRect();
        panel.style.position = 'fixed';
        panel.style.top = (rect.bottom + 4) + 'px';
        panel.style.right = (window.innerWidth - rect.right) + 'px';
        panel.style.zIndex = '1000';

        document.body.appendChild(panel);
        this._columnSettingsPanel = panel;

        // 绑定面板事件
        UITable._bindColumnSettingsEvents();

        // 点击外部关闭
        const closePanel = (e) => {
            if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
                panel.remove();
                this._columnSettingsPanel = null;
                document.removeEventListener('click', closePanel);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', closePanel);
        }, 0);
    },

    /* ============ 手动添加菜单 & 选项 ============ */

    handleAddMenu() {
        if (!this.currentProfile) {
            UIRenderer.showNotification('请先导入或选择机型', 'warn');
            return;
        }

        UIRenderer.showModal(
            '添加自定义菜单',
            UIRenderer.buildAddMenuForm(this.currentProfile),
            () => this.submitAddMenu(),
            null
        );
    },

    submitAddMenu() {
        const data = UIRenderer.extractAddMenuForm();

        if (!data.menuName) {
            UIRenderer.showNotification('请输入菜单标识', 'warn');
            return false;
        }

        // 检查唯一性
        if (this.currentProfile.menuMap[data.menuName]) {
            UIRenderer.showNotification('菜单标识 "' + data.menuName + '" 已存在', 'warn');
            return false;
        }

        // 构建 MenuPath
        let menuPath;
        if (data.parentPath) {
            menuPath = data.parentPath.replace(/\/$/, '') + '/' + data.menuName;
        } else {
            menuPath = './' + data.menuName;
        }

        const menu = createMenu({
            MenuName: data.menuName,
            DisplayName: data.displayName || data.menuName,
            displayNameZh: data.displayNameZh,
            MenuPath: menuPath,
            Hidden: data.hidden,
            ReadOnly: false,
            GrayOut: false,
            source: MenuSource.Manual
        });

        this.currentProfile.menuMap[data.menuName] = menu;
        debouncedSave(this.currentProfile, '添加菜单');
        this.refreshUI();
        UIRenderer.showNotification('已添加菜单: ' + (data.displayNameZh || data.displayName || data.menuName), 'success');
        return true;
    },

    /** 复制属性：打开添加弹窗并预填源属性的值 */
    handleAddAttribute() {
        if (!this.currentProfile) {
            UIRenderer.showNotification('请先导入或选择机型', 'warn');
            return;
        }

        UIRenderer.showModal(
            '添加自定义选项',
            UIRenderer.buildAddAttributeForm(this.currentProfile, this.activeMenu || ''),
            () => this.submitAddAttribute(),
            null,
            { noOverlayClose: true }
        );

        // 类型切换事件：显示/隐藏对应表单组
        setTimeout(() => {
            const typeSelect = document.getElementById('add-attr-type');
            const enumGroup = document.getElementById('add-attr-enum-group');
            const intGroup = document.getElementById('add-attr-int-group');
            const strGroup = document.getElementById('add-attr-str-group');

            const toggleGroups = () => {
                const t = typeSelect.value;
                enumGroup.classList.toggle('hidden', t !== 'Enumeration');
                intGroup.classList.toggle('hidden', t !== 'Integer');
                strGroup.classList.toggle('hidden', t !== 'String' && t !== 'Password');
            };
            typeSelect.addEventListener('change', toggleGroups);
            toggleGroups();
        }, 100);
    },

    submitAddAttribute() {
        const data = UIRenderer.extractAddAttributeForm();

        if (!data.attrName) {
            UIRenderer.showNotification('请输入属性标识', 'warn');
            return false;
        }
        if (!data.menuPath) {
            UIRenderer.showNotification('请选择菜单元路径', 'warn');
            return false;
        }

        // 检查唯一性
        if (this.currentProfile.attrMap[data.attrName]) {
            UIRenderer.showNotification('属性标识 "' + data.attrName + '" 已存在', 'warn');
            return false;
        }

        // 菜单路径规范化：确保以 ./ 开头
        const normalizedPath = data.menuPath.startsWith('./') ? data.menuPath : ('./' + data.menuPath);

        // 确保菜单存在（如果是手动添加的路径但菜单可能还没创建）
        const existingMenu = Object.values(this.currentProfile.menuMap).find(m => m.menuPath === normalizedPath);
        if (!existingMenu) {
            // 自动创建缺失的菜单
            const pathName = normalizedPath.replace('./', '');
            const menu = createMenu({
                MenuName: pathName.replace(/\//g, '_'),
                DisplayName: pathName,
                MenuPath: normalizedPath,
                source: MenuSource.Manual
            });
            this.currentProfile.menuMap[menu.menuName] = menu;
        }

        const attr = createAttribute({
            AttributeName: data.attrName,
            Type: data.type,
            DefaultValue: data.defaultValue || null,
            DisplayName: data.displayName,
            displayNameZh: data.displayNameZh,
            HelpText: data.helpText,
            helpTextZh: data.helpTextZh,
            MenuPath: normalizedPath,
            ReadOnly: data.readOnly,
            SupportsRedfish: data.supportsRedfish,
            SupportsUnicfg: data.supportsUnicfg,
            AttributeScope: data.scope || '通用',
            Platforms: data.platforms,
            Value: data.value,
            LowerBound: data.lowerBound,
            UpperBound: data.upperBound,
            ScalarIncrement: data.scalarIncrement,
            MinLength: data.minLength,
            MaxLength: data.maxLength
        });

        this.currentProfile.attrMap[data.attrName] = attr;
        DependencyEngine.evaluateAll(this.currentProfile);
        debouncedSave(this.currentProfile, '添加选项');
        this.refreshUI();
        UIRenderer.showNotification('已添加选项: ' + (data.displayNameZh || data.displayName || data.attrName), 'success');
        return true;
    },

    /* ============ 示例数据 ============ */

    async loadDemoData() {
        // API 模式下由服务端初始化演示数据
        if (Storage._mode === 'api') {
            try {
                const res = await fetch('/api/demo/load', { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    this.loadedSystems = await Storage.listSystems();
                    UIRenderer.showNotification('已加载演示机型: ' + data.loadedName, 'success');
                    this.showHomepage();
                    return;
                }
                throw new Error(data.error || '加载失败');
            } catch (e) {
                console.error('演示数据加载失败:', e);
                UIRenderer.showNotification('演示数据加载失败: ' + e.message, 'error', 5000);
                return;
            }
        }

        // 本地模式：加载演示机型
        const demoProfile = buildModelProfile(DEMO_MODEL);
        DependencyEngine.evaluateAll(demoProfile);
        await Storage.saveSystem(demoProfile);

        this.currentSystemId = demoProfile.systemId;
        this.currentProfile = demoProfile;
        this.activeMenu = null;
        this.modifiedAttrs = new Set();
        this.loadedSystems = await Storage.listSystems();

        this.refreshUI();
        this.renderSystemSelector();
        UIRenderer.showNotification('已加载演示机型: ' + demoProfile.productName, 'success');
    },

};

// 启动
document.addEventListener('DOMContentLoaded', () => AppState.init());
