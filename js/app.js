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
    isBatchEditing: false,
    modifiedAttrs: new Set(),
    loadedSystems: [],

    async init() {
        // 初始化存储层（检测后端 API）
        await Storage.init();

        this.loadedSystems = await Storage.listSystems();

        if (this.loadedSystems.length > 0) {
            const lastId = this.loadedSystems[0].systemId;
            await this.switchSystem(lastId, true);
        } else {
            // 首次使用，自动加载演示数据
            await this.loadDemoData();
        }

        this.bindEvents();
        this.renderSystemSelector();
    },

    bindEvents() {
        const on = (id, event, handler) => {
            const el = $id(id);
            if (el) el.addEventListener(event, handler);
        };

        // 工具栏
        on('btn-import', 'click', () => this.handleImport());
        on('btn-export', 'click', () => this.handleExport());
        on('btn-save', 'click', () => this.saveCurrentChanges());
        on('btn-load-demo', 'click', () => this.loadDemoData());

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

        // 机型切换
        on('select-system', 'change', async (e) => {
            const id = e.target.value;
            if (id) await this.switchSystem(id);
        });

        // 删除机型
        on('btn-delete-system', 'click', () => {
            if (!this.currentProfile) return;
            const name = this.currentProfile.productName || this.currentProfile.systemId;
            UIRenderer.showModal(
                '确认删除',
                '<p>确定要删除机型 <strong>' + UIRenderer.escHtml(name) + '</strong> 的所有数据吗？此操作不可恢复。</p>',
                async () => { await Storage.deleteSystem(this.currentSystemId); this.refreshAfterDelete(); }
            );
        });

        // 筛选栏（多字段，输入实时筛选）
        const filterIds = ['filter-attr', 'filter-type', 'filter-scope', 'filter-platform', 'filter-readonly', 'filter-redfish'];
        for (const id of filterIds) {
            const el = $id(id);
            if (el) el.addEventListener('input', () => this.refreshTable());
            if (el) el.addEventListener('change', () => this.refreshTable());
        }
        on('btn-clear-filter', 'click', () => this.clearFilters());

        // 批量编辑
        on('btn-batch-edit', 'click', () => this.toggleBatchEdit());

        // 清除搜索
        on('btn-clear-search', 'click', () => this.clearSearch());

        // 手动添加（事件委托：使用父容器避免 renderSidebar 替换后丢失监听）
        const menuTree = $id('menu-tree');
        if (menuTree) {
            menuTree.addEventListener('click', (e) => {
                if (e.target.closest('#btn-add-menu')) this.handleAddMenu();
            });
            on('btn-add-menu', 'click', () => this.handleAddMenu()); // 兼容初始绑定
        }

        on('btn-add-attr', 'click', () => this.handleAddAttribute());

        // 内容区事件委托（编辑、还原按钮）
        const tbody = $id('attribute-tbody');
        if (tbody) {
            tbody.addEventListener('click', (e) => {
                const btn = e.target.closest('.btn-edit');
                if (btn) {
                    this.startEdit(btn.dataset.attr);
                    return;
                }
                const resetBtn = e.target.closest('.btn-reset');
                if (resetBtn) {
                    this.resetAttribute(resetBtn.dataset.attr);
                }
            });
        }

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') { e.preventDefault(); this.saveCurrentChanges(); }
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
        this.activeMenu = null;
        this.searchKeyword = '';
        this.modifiedAttrs = new Set();

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

        if (this.loadedSystems.length > 0) {
            this.switchSystem(this.loadedSystems[0].systemId, true);
        } else {
            this.showEmptyState();
        }
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

    handleExport() {
        if (!this.currentProfile) {
            UIRenderer.showNotification('请先导入或选择机型', 'warn');
            return;
        }

        UIRenderer.showModal(
            '选择导出格式',
            '<div class="form-group">' +
            '<p style="margin-bottom:12px;">请选择导出格式：</p>' +
            '<div class="form-group-inline" style="margin-bottom:8px;">' +
            '  <input type="radio" name="export-format" id="export-excel" value="excel" checked />' +
            '  <label for="export-excel" style="cursor:pointer;font-size:13px;">Excel (.xlsx) — 含中文列名，适合审阅</label>' +
            '</div>' +
            '<div class="form-group-inline">' +
            '  <input type="radio" name="export-format" id="export-json" value="json" />' +
            '  <label for="export-json" style="cursor:pointer;font-size:13px;">Registry JSON (.json) — DMTF 标准，可重新导入</label>' +
            '</div>' +
            '</div>',
            () => {
                const format = document.querySelector('input[name="export-format"]:checked')?.value || 'excel';
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
            null
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
        } catch (err) {
            console.error('编辑弹窗打开失败:', err);
            UIRenderer.showNotification('编辑功能异常: ' + err.message, 'error', 5000);
        }
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

    toggleBatchEdit() {
        this.isBatchEditing = !this.isBatchEditing;
        const btn = $id('btn-batch-edit');
        const addBtn = $id('btn-add-attr');

        btn.textContent = this.isBatchEditing ? '退出批量编辑' : '批量编辑';
        if (this.isBatchEditing) {
            btn.classList.add('btn-primary');
            if (addBtn) addBtn.classList.add('hidden'); // 批量模式下隐藏单个添加
        } else {
            btn.classList.remove('btn-primary');
            if (addBtn) addBtn.classList.remove('hidden');
        }
        this.refreshTable();
    },

    confirmBatchEdit() {
        if (!this.currentProfile) return;

        let appliedCount = 0;
        const rows = document.querySelectorAll('#attribute-tbody tr[data-batch="1"]');

        for (const row of rows) {
            const attrName = row.dataset.attr;
            const attr = this.currentProfile.attrMap[attrName];
            if (!attr || isEffectivelyDisabled(attr)) continue;

            const editId = 'batchedit_' + attrName.replace(/[^a-zA-Z0-9]/g, '_');
            const editorEl = document.getElementById(editId);
            if (!editorEl) continue;

            const newValue = Editors.extractValue(editorEl, attr.type);
            const validation = Editors.validate(newValue, attr);

            if (!validation.valid) {
                editorEl.classList.add('inline-edit-error');
                UIRenderer.showNotification(attrName + ': ' + validation.message, 'warn', 3000);
                continue;
            }

            attr.modifiedValue = newValue;
            this.modifiedAttrs.add(attrName);
            DependencyEngine.evaluate(this.currentProfile, attrName, newValue);
            appliedCount++;
        }

        if (appliedCount > 0) {
            this.updateModifiedCount();
            this.refreshTable();
            debouncedSave(this.currentProfile, '批量编辑');
            UIRenderer.showNotification('批量应用了 ' + appliedCount + ' 项修改', 'success');
        } else {
            UIRenderer.showNotification('没有有效的修改需要应用', 'info');
        }
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

    navigateToMenu(menuPath) {
        this.activeMenu = menuPath;

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

    refreshUI() {
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
        if (modifiedEl) modifiedEl.textContent = '已修改: 0 项';
    },

    updateModifiedCount() {
        const el = $id('modified-count');
        if (el) el.textContent = '已修改: ' + this.modifiedAttrs.size + ' 项';
    },

    renderSystemSelector() {
        UIRenderer.renderSystemSelector();
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

    handleAddAttribute() {
        if (!this.currentProfile) {
            UIRenderer.showNotification('请先导入或选择机型', 'warn');
            return;
        }

        UIRenderer.showModal(
            '添加自定义选项',
            UIRenderer.buildAddAttributeForm(this.currentProfile, this.activeMenu || ''),
            () => this.submitAddAttribute(),
            null
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
                    if (this.loadedSystems.length > 0) {
                        await this.switchSystem(this.loadedSystems[0].systemId, true);
                    }
                    UIRenderer.showNotification('已加载演示机型: ' + data.loadedName, 'success');
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
