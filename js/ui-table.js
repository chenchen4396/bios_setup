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

        const isBatch = AppState.isBatchEditing;
        let html = '';
        for (const attr of filtered) {
            html += isBatch
                ? this.renderBatchEditRow(attr, profile)
                : this.renderAttributeRow(attr, profile);
        }

        if (isBatch && filtered.length > 0) {
            html += '<tr class="batch-edit-footer"><td colspan="12" style="text-align:center;padding:10px;">' +
                '<button id="btn-batch-apply" class="btn btn-primary" style="padding:6px 24px;font-size:13px;">' +
                '应用全部修改 (' + filtered.filter(a => !isEffectivelyDisabled(a)).length + ' 项可编辑)</button>' +
                '</td></tr>';
        }

        tbody.innerHTML = html;

        if (isBatch) {
            const applyBtn = document.getElementById('btn-batch-apply');
            if (applyBtn) {
                applyBtn.addEventListener('click', () => {
                    if (AppState.confirmBatchEdit) AppState.confirmBatchEdit();
                });
            }
        }
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
            actionHtml = '<span style="font-size:11px;color:var(--text-tertiary);">—</span>';
        } else if (attr.type === AttrType.Password) {
            actionHtml = '<button class="btn btn-small btn-edit" data-attr="' + escA(attr.attributeName) + '">设密码</button>';
        } else {
            actionHtml = '<button class="btn btn-small btn-edit" data-attr="' + escA(attr.attributeName) + '">编辑</button>';
            if (modified) {
                actionHtml += ' <button class="btn btn-small btn-reset btn-link" data-attr="' + escA(attr.attributeName) + '">还原</button>';
            }
        }

        const attrTitle = escA(helpEn);

        return '<tr class="' + rowClass.trim() + '" data-attr="' + escA(attr.attributeName) + '">' +
            '<td><span class="attr-value-cell" style="font-size:10px;color:var(--text-secondary);" title="' + escA(menuPath) + '">' + escH(menuPath) + '</span></td>' +
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

    renderBatchEditRow(attr, profile) {
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
        const editId = 'batchedit_' + attr.attributeName.replace(/[^a-zA-Z0-9]/g, '_');

        let readonlyHtml;
        if (attr.immutable) {
            readonlyHtml = '<span class="status-badge status-immutable">不可变</span>';
        } else if (readonly) {
            readonlyHtml = '<span class="status-badge status-readonly">只读</span>';
        } else if (attr.resetRequired) {
            readonlyHtml = '<span class="status-badge" style="color:var(--color-warning);">需重启</span>';
        } else {
            readonlyHtml = '<span class="status-badge status-editable">可编辑</span>';
        }

        const scopeDisplay = getScopeDisplay(attr.attributeScope);

        const redfishHtml = attr.supportsRedfish
            ? '<span style="color:var(--color-success);font-weight:500;">是</span>'
            : '<span style="color:var(--text-tertiary);font-weight:500;">否</span>';

        let platformStr = attr.platforms && attr.platforms.length > 0
            ? attr.platforms.join(', ')
            : '全部';

        // 可编辑 → 内联编辑器；不可编辑 → 只读显示
        let valueCellHtml;
        if (attr.immutable || disabled) {
            valueCellHtml = '<span class="attr-value-cell" style="color:var(--text-tertiary);">' + escH(String(defaultVal)) + '</span>';
        } else {
            valueCellHtml = Editors.renderEditor(attr, editId);
        }

        return '<tr class="' + rowClass.trim() + '" data-attr="' + escA(attr.attributeName) + '" data-batch="1">' +
            '<td><span class="attr-value-cell" style="font-size:10px;color:var(--text-secondary);">' + escH(menuPath) + '</span></td>' +
            '<td><span class="attr-name-cell">' + escH(attr.attributeName) + '</span></td>' +
            '<td>' + escH(displayNameEn) + '</td>' +
            '<td>' + (displayNameZh ? escH(displayNameZh) : '<span style="color:var(--text-tertiary);">—</span>') + '</td>' +
            '<td>' + valueCellHtml + '</td>' +
            '<td>' + escH(optionsStr) + '</td>' +
            '<td><span class="tag ' + scopeDisplay.cls + '">' + scopeDisplay.text + '</span></td>' +
            '<td>' + redfishHtml + '</td>' +
            '<td>' + escH(platformStr) + '</td>' +
            '<td class="col-desc">' +
                (helpEn ? '<span class="help-cell">' + escH(helpEn) + '</span>' : '') +
                (helpEn && helpZh ? '<br>' : '') +
                (helpZh ? '<span class="help-cell help-zh">' + escH(helpZh) + '</span>' : '') +
                (!helpEn && !helpZh ? '<span style="color:var(--text-tertiary);font-size:11px;">—</span>' : '') +
            '</td>' +
            '<td><span style="font-size:11px;color:var(--text-secondary);">批量</span></td>' +
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
    }
};
