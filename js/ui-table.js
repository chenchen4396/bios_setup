/**
 * UI 属性表格 — 表格渲染、行渲染、筛选标签、搜索
 * 依赖: Editors, UICommon, AppState, models.js 计算属性
 */

const UITable = {

    /* ============ 筛选标签 ============ */

    renderActiveFilters() {
        const container = document.getElementById('active-filters');
        if (!container) return;

        const chips = [];
        const escH = UICommon.escHtml;

        const fAttr = (document.getElementById('filter-attr')?.value || '').trim();
        if (fAttr) chips.push({ label: '属性标识', value: fAttr, id: 'filter-attr' });

        const fType = (document.getElementById('filter-type')?.value || '').trim();
        if (fType) {
            const typeMap = {'Enumeration':'枚举','String':'字符串','Integer':'整数','Boolean':'布尔','Password':'密码'};
            chips.push({ label: '类型', value: typeMap[fType] || fType, id: 'filter-type' });
        }

        const fScope = (document.getElementById('filter-scope')?.value || '').trim();
        if (fScope) chips.push({ label: '来源', value: fScope, id: 'filter-scope' });

        const fPlatform = (document.getElementById('filter-platform')?.value || '').trim();
        if (fPlatform) chips.push({ label: '平台', value: fPlatform, id: 'filter-platform' });

        const fReadonly = (document.getElementById('filter-readonly')?.value || '').trim();
        if (fReadonly) chips.push({ label: '是否只读', value: fReadonly === '1' ? '是' : '否', id: 'filter-readonly' });

        const fRedfish = (document.getElementById('filter-redfish')?.value || '').trim();
        if (fRedfish) chips.push({ label: '是否支持Redfish', value: fRedfish === '1' ? '是' : '否', id: 'filter-redfish' });

        if (chips.length === 0) {
            container.innerHTML = '';
            return;
        }

        let html = '';
        for (const c of chips) {
            html += '<span class="filter-chip" title="点击清除此筛选" onclick="AppState.clearFilterById(\'' + c.id + '\')">' +
                '<span class="filter-chip-label">' + escH(c.label) + ':</span>' +
                '<span class="filter-chip-value">' + escH(c.value) + '</span>' +
                '<span class="filter-chip-close">&times;</span></span>';
        }
        container.innerHTML = html;
    },

    /* ============ 属性表格 ============ */

    renderAttributeTable(attributes, profile) {
        const tbody = document.getElementById('attribute-tbody');
        const countEl = document.getElementById('result-count');
        const emptyEl = document.getElementById('empty-state');
        const tableEl = document.getElementById('attribute-table');

        // 渲染激活筛选标签
        this.renderActiveFilters();

        // 应用多字段筛选
        const fAttr = (document.getElementById('filter-attr')?.value || '').trim().toLowerCase();
        const fType = (document.getElementById('filter-type')?.value || '').trim();
        const fScope = (document.getElementById('filter-scope')?.value || '').trim();
        const fPlatform = (document.getElementById('filter-platform')?.value || '').trim().toLowerCase();
        const fReadonly = (document.getElementById('filter-readonly')?.value || '').trim();
        const fRedfish = (document.getElementById('filter-redfish')?.value || '').trim();

        let filtered = attributes.filter(attr => !isEffectivelyHidden(attr));
        if (fAttr) {
            filtered = filtered.filter(attr => attr.attributeName.toLowerCase().includes(fAttr));
        }
        if (fType) {
            filtered = filtered.filter(attr => attr.type === fType);
        }
        if (fScope) {
            filtered = filtered.filter(attr => (attr.attributeScope || '通用') === fScope);
        }
        if (fPlatform) {
            filtered = filtered.filter(attr =>
                attr.platforms.length === 0 || attr.platforms.some(p => p.toLowerCase().includes(fPlatform))
            );
        }
        if (fReadonly) {
            const wantReadonly = fReadonly === '1';
            filtered = filtered.filter(attr => isEffectivelyReadOnly(attr) === wantReadonly);
        }
        if (fRedfish) {
            const wantRedfish = fRedfish === '1';
            filtered = filtered.filter(attr => attr.supportsRedfish === wantRedfish);
        }

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            tableEl.classList.add('hidden');
            emptyEl.classList.remove('hidden');
            countEl.textContent = '';
            return;
        }

        tableEl.classList.remove('hidden');
        emptyEl.classList.add('hidden');
        countEl.textContent = '(' + filtered.length + ' 项)';

        // 按 displayOrder 排序
        filtered.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || a.attributeName.localeCompare(b.attributeName));

        let html = '';
        for (const attr of filtered) {
            html += this.renderAttributeRow(attr, profile);
        }

        tbody.innerHTML = html;

        // 拖拽排序
        this._bindRowDragEvents(tbody);
    },

    renderAttributeRow(attr, profile) {
        const escH = UICommon.escHtml, escA = UICommon.escAttr;
        const disabled = isEffectivelyDisabled(attr);
        const grayed = isEffectivelyGrayedOut(attr);
        const readonly = isEffectivelyReadOnly(attr);
        const modified = hasPendingChanges(attr);

        let rowClass = '';
        if (grayed) rowClass += ' row-grayout';
        if (attr.immutable) rowClass += ' row-immutable';
        if (modified) rowClass += ' row-modified';
        if (readonly) rowClass += ' row-readonly';
        if (attr.attributeScope === 'Custom') rowClass += ' row-custom';

        const displayNameEn = attr.displayName || attr.attributeName;
        const displayNameZh = attr.displayNameZh || '';
        const defaultVal = attr.defaultValue !== null && attr.defaultValue !== undefined ? attr.defaultValue : '(空)';
        const optionsStr = formatAvailableValues(attr);
        const helpEn = attr.helpText || '';
        const helpZh = attr.helpTextZh || '';
        const menuPath = attr.menuPath || '';

        // 只读状态
        let readonlyHtml;
        if (attr.immutable) {
            readonlyHtml = '<span class="status-badge status-immutable">不可变</span>';
        } else if (readonly) {
            readonlyHtml = '<span class="status-badge status-readonly">只读</span>';
        } else if (attr.resetRequired) {
            readonlyHtml = '<span class="status-badge" style="color:var(--color-warning);" title="修改后需重启生效">需重启</span>';
        } else {
            readonlyHtml = '<span class="status-badge status-editable">可编辑</span>';
        }

        const scopeDisplay = getScopeDisplay(attr.attributeScope);

        const redfishHtml = attr.supportsRedfish
            ? '<span style="color:var(--color-success);font-weight:500;">是</span>'
            : '<span style="color:var(--text-tertiary);">否</span>';

        let platformStr = attr.platforms && attr.platforms.length > 0
            ? attr.platforms.join(', ')
            : '全部';

        // 操作按钮
        let actionHtml;
        if (attr.immutable || disabled) {
            actionHtml = '<span class="btn-icon btn-icon-disabled" title="此属性不可编辑">—</span>';
        } else if (attr.type === AttrType.Password) {
            actionHtml = '<button class="btn-icon" data-attr="' + escA(attr.attributeName) + '" title="设置密码">🔑</button>';
        } else {
            actionHtml = '<button class="btn-icon" data-attr="' + escA(attr.attributeName) + '" title="编辑此属性">✎</button>';
        }
        if (!attr.immutable && !disabled && modified) {
            actionHtml += ' <button class="btn-icon btn-icon-danger btn-reset" data-attr="' + escA(attr.attributeName) + '" title="还原到默认值">↺</button>';
        }

        const attrTitle = escA(helpEn);
        const order = attr.displayOrder ?? 0;

        return '<tr class="' + rowClass.trim() + '" data-attr="' + escA(attr.attributeName) + '"' +
            ' data-menu="' + escA(menuPath || '') + '" data-order="' + order + '">' +
            '<td><span class="drag-handle-col" title="拖拽排序" draggable="true">⋮⋮</span><span class="attr-value-cell" style="font-size:10px;color:var(--text-secondary);" title="' + escA(menuPath) + '">' + escH(menuPath) + '</span></td>' +
            '<td><span class="attr-name-cell" title="' + attrTitle + '">' + escH(attr.attributeName) + '</span></td>' +
            '<td><span title="' + attrTitle + '">' + escH(displayNameEn) + '</span></td>' +
            '<td><span style="color:var(--text-secondary);">' + (displayNameZh ? escH(displayNameZh) : '<span style="color:var(--text-tertiary);">—</span>') + '</span></td>' +
            '<td><span class="attr-value-cell">' + escH(String(defaultVal)) + '</span></td>' +
            '<td><span class="attr-options-cell" title="' + escA(optionsStr) + '">' + escH(optionsStr) + '</span></td>' +
            '<td><span class="tag ' + scopeDisplay.cls + '">' + scopeDisplay.text + '</span></td>' +
            '<td>' + redfishHtml + '</td>' +
            '<td>' + (readonly ? '<span style="color:var(--text-secondary);">是</span>' : '<span style="color:var(--text-tertiary);">否</span>') + '</td>' +
            '<td><span class="platform-cell" title="' + escA(platformStr) + '">' + escH(platformStr) + '</span></td>' +
            '<td class="col-desc" title="' + escA(helpEn) + '">' +
                (helpEn ? '<span class="help-cell">' + escH(helpEn) + '</span>' : '') +
                (helpEn && helpZh ? '<br>' : '') +
                (helpZh ? '<span class="help-cell help-zh">' + escH(helpZh) + '</span>' : '') +
                (!helpEn && !helpZh ? '<span style="color:var(--text-tertiary);font-size:11px;">—</span>' : '') +
            '</td>' +
            '<td>' + actionHtml + '</td>' +
            '</tr>';
    },

    /* ============ 搜索 ============ */

    search(profile, keyword) {
        if (!keyword || !keyword.trim()) return [];

        const tokens = keyword.trim().split(/\s+/).filter(Boolean);
        const results = [];

        for (const attr of Object.values(profile.attrMap)) {
            if (isEffectivelyHidden(attr)) continue;

            let score = 0;
            const searchText = [
                attr.attributeName,
                attr.displayName,
                attr.displayNameZh,
                attr.helpText,
                attr.helpTextZh,
                ...(attr.platforms || [])
            ].join(' ').toLowerCase();

            for (const token of tokens) {
                const lower = token.toLowerCase();
                if (attr.attributeName.toLowerCase().includes(lower)) score += 3;
                if ((attr.displayName || '').toLowerCase().includes(lower)) score += 2;
                if ((attr.displayNameZh || '').includes(token)) score += 2;
                if ((attr.helpText || '').toLowerCase().includes(lower)) score += 1;
                if ((attr.helpTextZh || '').includes(token)) score += 1;
                if (searchText.includes(lower)) score += 1;
            }

            if (score > 0) {
                results.push({ attr, score });
            }
        }

        results.sort((a, b) => b.score - a.score);
        return results;
    },

    renderSearchResults(results) {
        if (results.length === 0) return;
        const attrs = results.map(r => r.attr);
        this.renderAttributeTable(attrs, AppState.currentProfile);

        const pathEl = document.getElementById('current-menu-path');
        if (pathEl) pathEl.textContent = '搜索结果';
    },

    /* ============ 属性行拖拽排序 ============ */

    _dragRowData: null,

    _bindRowDragEvents(tbody) {
        const self = this;

        tbody.addEventListener('dragstart', (e) => {
            // 仅从拖拽手柄 span 触发（draggable 在手柄上，不在 tr 上）
            const row = e.target.closest('tr[data-attr]');
            if (!row || !row.dataset.attr || row.dataset.batch === '1') { e.preventDefault(); return; }

            self._dragRowData = {
                attrName: row.dataset.attr,
                menu: row.dataset.menu || '',
                order: parseInt(row.dataset.order) || 0,
                el: row
            };
            row.classList.add('row-dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', row.dataset.attr);
        });

        tbody.addEventListener('dragover', (e) => {
            if (!self._dragRowData) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const row = e.target.closest('tr[data-attr]');
            tbody.querySelectorAll('.row-drag-over').forEach(r => r.classList.remove('row-drag-over'));

            if (row && row !== self._dragRowData.el &&
                row.dataset.menu === self._dragRowData.menu &&
                row.dataset.batch !== '1') {
                row.classList.add('row-drag-over');
            }
        });

        tbody.addEventListener('drop', (e) => {
            e.preventDefault();
            tbody.querySelectorAll('.row-drag-over').forEach(r => r.classList.remove('row-drag-over'));

            if (!self._dragRowData) return;
            const src = self._dragRowData;

            const targetRow = e.target.closest('tr[data-attr]');
            if (!targetRow || targetRow === src.el ||
                targetRow.dataset.menu !== src.menu ||
                targetRow.dataset.batch === '1') {
                self._endRowDrag();
                return;
            }

            // 收集同菜单下的所有行
            const rows = tbody.querySelectorAll('tr[data-attr][data-menu="' + UICommon.escAttr(src.menu) + '"]');
            const profile = AppState.currentProfile;
            if (!profile) { self._endRowDrag(); return; }

            const targetOrder = parseInt(targetRow.dataset.order) || 0;

            // 重新分配 displayOrder
            const ordered = [];
            for (const r of rows) {
                ordered.push({
                    el: r,
                    attrName: r.dataset.attr,
                    order: parseInt(r.dataset.order) || 0
                });
            }

            const srcIdx = ordered.findIndex(o => o.attrName === src.attrName);
            const tgtIdx = ordered.findIndex(o => o.attrName === targetRow.dataset.attr);
            if (srcIdx < 0 || tgtIdx < 0) { self._endRowDrag(); return; }

            const [dragItem] = ordered.splice(srcIdx, 1);
            ordered.splice(tgtIdx, 0, dragItem);

            // 更新 attrMap 中的 displayOrder
            let changed = false;
            for (let i = 0; i < ordered.length; i++) {
                const item = ordered[i];
                const attr = profile.attrMap[item.attrName];
                if (attr && attr.displayOrder !== i * 10) {
                    attr.displayOrder = i * 10;
                    changed = true;
                }
                item.el.dataset.order = i * 10;
            }

            if (changed && typeof debouncedSave !== 'undefined') {
                debouncedSave(profile, '选项排序');
            }

            // 重新渲染以反映新顺序
            if (typeof AppState !== 'undefined' && AppState.refreshTable) {
                AppState.refreshTable();
            }

            self._endRowDrag();
        });

        tbody.addEventListener('dragend', () => {
            self._endRowDrag();
        });
    },

    _endRowDrag() {
        if (this._dragRowData && this._dragRowData.el) {
            this._dragRowData.el.classList.remove('row-dragging');
        }
        this._dragRowData = null;
    }
};
