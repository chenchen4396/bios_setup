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
        if (fScope) chips.push({ label: '适用客户', value: fScope, id: 'filter-scope' });

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

        const CHUNK_SIZE = 80;
        if (filtered.length > CHUNK_SIZE) {
            // 分块渲染：分批插入 DOM 避免阻塞主线程
            this._renderChunked(tbody, filtered, profile);
        } else {
            // 小数据量直接渲染
            const frag = document.createDocumentFragment();
            for (const attr of filtered) {
                frag.appendChild(this._createAttributeRow(attr, profile));
            }
            tbody.innerHTML = '';
            tbody.appendChild(frag);
            this._bindRowDragEvents(tbody);
            this._bindColumnResize();
        }

        // 首次渲染时恢复列可见性（从 localStorage）。_initColumnVisibility 有 guard，
        // 仅首次执行；_applyColumnClasses 仅在 class 串变化时写入，重复调用零开销。
        this._initColumnVisibility();
    },

    /**
     * 分块渲染（用于大数据量，防止阻塞主线程）
     */
    _renderChunked(tbody, filtered, profile) {
        const total = filtered.length;
        let index = 0;

        // 生成唯一令牌，用于取消旧的渲染
        const token = {};
        this._renderToken = token;

        tbody.innerHTML = '';

        const renderNextChunk = () => {
            // 如果 token 已被替换，说明有新的渲染启动，放弃本次回调
            if (this._renderToken !== token) return;

            const frag = document.createDocumentFragment();
            const end = Math.min(index + 80, total);
            for (; index < end; index++) {
                frag.appendChild(this._createAttributeRow(filtered[index], profile));
            }
            tbody.appendChild(frag);

            if (index < total) {
                requestAnimationFrame(renderNextChunk);
            } else {
                // 所有分块完成后绑定拖拽和列宽调整
                this._bindRowDragEvents(tbody);
                this._bindColumnResize();
                // 首次渲染时恢复列可见性（guard 保证仅执行一次）
                this._initColumnVisibility();
            }
        };

        requestAnimationFrame(renderNextChunk);
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

    /**
     * 创建属性行 DOM 元素（替代字符串拼接，性能更优）
     */
    _createAttributeRow(attr, profile) {
        const escH = UICommon.escHtml, escA = UICommon.escAttr;
        const disabled = isEffectivelyDisabled(attr);
        const grayed = isEffectivelyGrayedOut(attr);
        const readonly = isEffectivelyReadOnly(attr);
        const modified = hasPendingChanges(attr);

        const tr = document.createElement('tr');
        tr.dataset.attr = attr.attributeName;
        tr.dataset.menu = attr.menuPath || '';
        tr.dataset.order = String(attr.displayOrder ?? 0);

        // 行样式类
        if (grayed) tr.classList.add('row-grayout');
        if (attr.immutable) tr.classList.add('row-immutable');
        if (modified) tr.classList.add('row-modified');
        if (readonly) tr.classList.add('row-readonly');
        if (attr.attributeScope === 'Custom') tr.classList.add('row-custom');

        const displayNameEn = attr.displayName || attr.attributeName;
        const displayNameZh = attr.displayNameZh || '';
        const defaultVal = attr.defaultValue !== null && attr.defaultValue !== undefined ? attr.defaultValue : '(空)';
        const optionsStr = formatAvailableValues(attr);
        const helpEn = attr.helpText || '';
        const helpZh = attr.helpTextZh || '';
        const menuPath = attr.menuPath || '';
        const scopeDisplay = getScopeDisplay(attr.attributeScope);
        const attrTitle = escA(helpEn);

        // 只读状态
        let readonlyBadge;
        if (attr.immutable) {
            readonlyBadge = this._createSpan('status-badge status-immutable', '不可变');
        } else if (readonly) {
            readonlyBadge = this._createSpan('status-badge status-readonly', '只读');
        } else if (attr.resetRequired) {
            readonlyBadge = this._createSpan('status-badge', '需重启');
            readonlyBadge.style.color = 'var(--color-warning)';
            readonlyBadge.title = '修改后需重启生效';
        } else {
            readonlyBadge = this._createSpan('status-badge status-editable', '可编辑');
        }

        // Redfish 状态
        const redfishSpan = this._createSpan(
            '',
            attr.supportsRedfish ? '是' : '否'
        );
        redfishSpan.style.color = attr.supportsRedfish ? 'var(--color-success)' : 'var(--text-tertiary)';
        if (attr.supportsRedfish) redfishSpan.style.fontWeight = '500';

        // 平台
        const platformStr = attr.platforms && attr.platforms.length > 0
            ? attr.platforms.join(', ')
            : '全部';

        // 操作按钮
        const actionBtns = this._createActionButtons(attr, disabled, modified);

        // 构建 12 列
        const cells = [];

        // 列1: 菜单路径
        const td0 = document.createElement('td');
        const dragHandle0 = this._createSpan('drag-handle-col', '⋮⋮');
        dragHandle0.title = '拖拽排序';
        dragHandle0.draggable = true;
        const pathSpan = this._createSpan('', menuPath);
        pathSpan.style.cssText = 'font-size:10px;color:var(--text-secondary);';
        pathSpan.title = menuPath;
        td0.appendChild(dragHandle0);
        td0.appendChild(pathSpan);
        cells.push(td0);

        // 列2: 属性标识
        const td1 = document.createElement('td');
        const nameSpan = this._createSpan('attr-name-cell', attr.attributeName);
        nameSpan.title = attrTitle;
        td1.appendChild(nameSpan);
        cells.push(td1);

        // 列3: 显示名称
        const td2 = document.createElement('td');
        const dispEnSpan = this._createSpan('', displayNameEn);
        dispEnSpan.title = attrTitle;
        td2.appendChild(dispEnSpan);
        cells.push(td2);

        // 列4: 中文名称
        const td3 = document.createElement('td');
        if (displayNameZh) {
            td3.appendChild(this._createSpan('', displayNameZh)).style.color = 'var(--text-secondary)';
        } else {
            const dash = this._createSpan('', '—');
            dash.style.color = 'var(--text-tertiary)';
            td3.appendChild(dash);
        }
        cells.push(td3);

        // 列5: 默认值
        const td4 = document.createElement('td');
        td4.appendChild(this._createSpan('attr-value-cell', String(defaultVal)));
        cells.push(td4);

        // 列6: 可选值
        const td5 = document.createElement('td');
        const optSpan = this._createSpan('attr-options-cell', optionsStr);
        optSpan.title = optionsStr;
        td5.appendChild(optSpan);
        cells.push(td5);

        // 列7: 适用客户
        const td6 = document.createElement('td');
        const scopeTag = this._createSpan('tag ' + scopeDisplay.cls, scopeDisplay.text);
        td6.appendChild(scopeTag);
        cells.push(td6);

        // 列8: Redfish
        const td7 = document.createElement('td');
        td7.appendChild(redfishSpan);
        cells.push(td7);

        // 列9: Unicfg
        const td8_uni = document.createElement('td');
        const unicfgSpan = this._createSpan(
            '',
            attr.supportsUnicfg ? '是' : '否'
        );
        unicfgSpan.style.color = attr.supportsUnicfg ? 'var(--color-success)' : 'var(--text-tertiary)';
        if (attr.supportsUnicfg) unicfgSpan.style.fontWeight = '500';
        td8_uni.appendChild(unicfgSpan);
        cells.push(td8_uni);

        // 列10: 只读
        const td8 = document.createElement('td');
        const roSpan = this._createSpan('', readonly ? '是' : '否');
        roSpan.style.color = readonly ? 'var(--text-secondary)' : 'var(--text-tertiary)';
        td8.appendChild(roSpan);
        cells.push(td8);

        // 列11: 平台
        const td9 = document.createElement('td');
        const platSpan = this._createSpan('platform-cell', platformStr);
        platSpan.title = platformStr;
        td9.appendChild(platSpan);
        cells.push(td9);

        // 列12: 说明
        const td10 = document.createElement('td');
        td10.className = 'col-desc';
        td10.title = escA(helpEn);
        if (helpEn) {
            const helpCell = this._createSpan('help-cell', helpEn);
            td10.appendChild(helpCell);
        }
        if (helpEn && helpZh) {
            td10.appendChild(document.createElement('br'));
        }
        if (helpZh) {
            const helpZhCell = this._createSpan('help-cell help-zh', helpZh);
            td10.appendChild(helpZhCell);
        }
        if (!helpEn && !helpZh) {
            const dash = this._createSpan('', '—');
            dash.style.cssText = 'color:var(--text-tertiary);font-size:11px;';
            td10.appendChild(dash);
        }
        cells.push(td10);

        // 列13: 操作
        const td11 = document.createElement('td');
        td11.appendChild(actionBtns);
        cells.push(td11);

        cells.forEach(td => tr.appendChild(td));
        return tr;
    },

    /**
     * 创建带样式的 span 元素（性能优化：避免 innerHTML 解析）
     */
    _createSpan(className, textContent) {
        const span = document.createElement('span');
        if (className) span.className = className;
        span.textContent = textContent || '';
        return span;
    },

    /**
     * 创建操作按钮容器
     */
    _createActionButtons(attr, disabled, modified) {
        const container = document.createDocumentFragment();
        const escA = UICommon.escAttr;

        if (attr.immutable || disabled) {
            const disabledSpan = this._createSpan('btn-icon btn-icon-disabled', '—');
            disabledSpan.title = '此属性不可编辑';
            container.appendChild(disabledSpan);
        } else if (attr.type === AttrType.Password) {
            const btn = document.createElement('button');
            btn.className = 'btn-icon';
            btn.dataset.attr = attr.attributeName;
            btn.title = '设置密码';
            btn.textContent = '🔑';
            container.appendChild(btn);
        } else {
            const btn = document.createElement('button');
            btn.className = 'btn-icon';
            btn.dataset.attr = attr.attributeName;
            btn.title = '编辑此属性';
            btn.textContent = '✎';
            container.appendChild(btn);
        }

        if (!attr.immutable && !disabled && modified) {
            const resetBtn = document.createElement('button');
            resetBtn.className = 'btn-icon btn-icon-danger btn-reset';
            resetBtn.dataset.attr = attr.attributeName;
            resetBtn.title = '还原到默认值';
            resetBtn.textContent = '↺';
            container.appendChild(document.createTextNode(' '));
            container.appendChild(resetBtn);
        }

        return container;
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
        // 移除旧监听器避免累积
        if (this._rowDragCleanup) { this._rowDragCleanup(); }

        const self = this;

        const onDragStart = (e) => {
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
        };

        const onDragOver = (e) => {
            if (!self._dragRowData) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const row = e.target.closest('tr[data-attr]');
            // 性能优化：用缓存的上一个高亮行做 diff，避免每次 dragover 全表 querySelectorAll
            const prev = self._currentDragOverRow;
            if (prev && prev !== row) {
                prev.classList.remove('row-drag-over');
                self._currentDragOverRow = null;
            }

            if (row && row !== self._dragRowData.el &&
                row !== prev &&
                row.dataset.menu === self._dragRowData.menu &&
                row.dataset.batch !== '1') {
                row.classList.add('row-drag-over');
                self._currentDragOverRow = row;
            }
        };

        const onDrop = (e) => {
            e.preventDefault();
            // 性能优化：仅清除缓存的高亮行，不用 querySelectorAll
            if (self._currentDragOverRow) {
                self._currentDragOverRow.classList.remove('row-drag-over');
                self._currentDragOverRow = null;
            }

            if (!self._dragRowData) return;

            if (typeof Auth !== 'undefined' && !Auth.isAdmin) {
                if (typeof UIRenderer !== 'undefined') {
                    UIRenderer.showNotification('拖拽排序需要管理员权限，请先登录管理员账户', 'warn', 3000);
                }
                self._endRowDrag();
                return;
            }

            const src = self._dragRowData;

            const targetRow = e.target.closest('tr[data-attr]');
            if (!targetRow || targetRow === src.el ||
                targetRow.dataset.menu !== src.menu ||
                targetRow.dataset.batch === '1') {
                self._endRowDrag();
                return;
            }

            const rows = tbody.querySelectorAll('tr[data-attr][data-menu="' + UICommon.escAttr(src.menu) + '"]');
            const profile = AppState.currentProfile;
            if (!profile) { self._endRowDrag(); return; }

            const targetOrder = parseInt(targetRow.dataset.order) || 0;

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

            if (typeof AppState !== 'undefined' && AppState.refreshTable) {
                AppState.refreshTable();
            }

            self._endRowDrag();
        };

        const onDragEnd = () => {
            self._endRowDrag();
        };

        tbody.addEventListener('dragstart', onDragStart);
        tbody.addEventListener('dragover', onDragOver);
        tbody.addEventListener('drop', onDrop);
        tbody.addEventListener('dragend', onDragEnd);

        this._rowDragCleanup = () => {
            tbody.removeEventListener('dragstart', onDragStart);
            tbody.removeEventListener('dragover', onDragOver);
            tbody.removeEventListener('drop', onDrop);
            tbody.removeEventListener('dragend', onDragEnd);
        };
    },

    _endRowDrag() {
        if (this._dragRowData && this._dragRowData.el) {
            this._dragRowData.el.classList.remove('row-dragging');
        }
        // 清除残留的高亮行（兜底）
        if (this._currentDragOverRow) {
            this._currentDragOverRow.classList.remove('row-drag-over');
            this._currentDragOverRow = null;
        }
        this._dragRowData = null;
    },

    /* ============ 列宽拖拽调整 ============ */

    /**
     * 设计原则：拖拽过程中绝不修改表格列宽（避免整表 reflow）。
     * 仅通过引导线 + 数值提示（transform 合成层）反馈位置；
     * 松手时一次性应用最终宽度（单次 reflow）。
     * 这是大量行表格下唯一能保证 60fps 的做法。
     */

    /** 每列初始宽度（按列索引 0-12） */
    _colWidths: [
        130,  // 0: 菜单路径
        110,  // 1: 属性标识
        120,  // 2: 显示名称
        80,   // 3: 中文名称
        85,   // 4: 默认值
        130,  // 5: 可选值
        65,   // 6: 适用客户
        55,   // 7: Redfish
        55,   // 8: Unicfg
        45,   // 9: 只读
        45,   // 10: 平台
        180,  // 11: 说明
        80,   // 12: 操作
    ],

    /** 每列最小宽度（按列索引 0-12） */
    _colMinWidths: [
        80,   // 0: 菜单路径
        80,   // 1: 属性标识
        80,   // 2: 显示名称
        70,   // 3: 中文名称
        70,   // 4: 默认值
        80,   // 5: 可选值
        65,   // 6: 适用客户
        55,   // 7: Redfish
        55,   // 8: Unicfg
        45,   // 9: 只读
        45,   // 10: 平台
        120,  // 11: 说明
        60,   // 12: 操作
    ],

    /**
     * 初始化列宽：通过 <colgroup><col> 控制列宽。
     * table-layout: fixed 下，<col> 元素的 width 是列宽的权威来源，
     * 修改 col.width 比修改 th.width 更高效（浏览器可跳过单元格样式重算）。
     * @param {HTMLTableRowElement} thead - thead 内的 tr
     * @returns {HTMLTableColElement[]} col 元素数组
     */
    _initColumnWidths(thead) {
        const table = document.getElementById('attribute-table');
        if (!table) return [];

        let colgroup = table.querySelector('colgroup#attribute-table-colgroup');
        if (!colgroup) {
            colgroup = document.createElement('colgroup');
            colgroup.id = 'attribute-table-colgroup';
            table.insertBefore(colgroup, table.firstChild);
        }

        const ths = thead.querySelectorAll('th');
        const colCount = ths.length;
        // 补齐 col 元素
        while (colgroup.children.length < colCount) {
            colgroup.appendChild(document.createElement('col'));
        }
        // 移除多余 col
        while (colgroup.children.length > colCount) {
            colgroup.removeChild(colgroup.lastChild);
        }

        const cols = colgroup.children;
        ths.forEach((th, index) => {
            // 重建拖拽手柄
            const old = th.querySelector('.col-resize-handle');
            if (old) old.remove();
            // 最后一列（操作列）不放手柄，宽度自适应填充
            if (index < colCount - 1) {
                const handle = document.createElement('div');
                handle.className = 'col-resize-handle';
                th.appendChild(handle);
            }
            // 应用初始列宽到 col 元素
            // 注意：仅在 col 尚无宽度时设置初始值，保留用户已调整的列宽
            // （refreshTable 会重渲染 tbody，但不應重置列宽）
            if (cols[index] && !cols[index].style.width) {
                cols[index].style.width = (this._colWidths[index] ?? 100) + 'px';
            }
        });

        return Array.from(cols);
    },

    _bindColumnResize() {
        const table = document.getElementById('attribute-table');
        if (!table) return;
        const thead = table.querySelector('thead tr');
        if (!thead) return;

        // 初始化 colgroup / col / 拖拽手柄，返回 col 元素数组
        const cols = this._initColumnWidths(thead);

        // 移除旧 mousedown 监听器（避免多次渲染累积）
        if (this._colResizeHandler) {
            thead.removeEventListener('mousedown', this._colResizeHandler);
        }

        /*
         * 引导层架构（根本性性能方案）：
         * guide / tooltip 挂载到 document.body，用 position:fixed 定位。
         * 这样它们完全脱离 #attribute-table-container（overflow:auto）的渲染树，
         * 移动时只触发自身合成层，绝不触发表格容器的重绘/重排。
         *
         * 此前 guide/tooltip 是 container 的子元素（position:absolute），
         * 在 overflow:auto 容器内移动绝对定位元素会触发容器的滚动区域重绘，
         * 即使是 transform 也会与容器的 layer 产生合成开销。
         * fixed 定位彻底切断这一关联。
         */
        let guide = document.querySelector('.col-resize-guide');
        if (!guide) {
            guide = document.createElement('div');
            guide.className = 'col-resize-guide';
            document.body.appendChild(guide);
        }
        let tooltip = document.querySelector('.col-resize-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'col-resize-tooltip';
            document.body.appendChild(tooltip);
        }

        this._resizeData = null;
        const self = this;
        let rafId = 0;
        let pendingX = 0;

        /**
         * 每帧最多更新一次引导线 + 数值提示。
         * - guide: 仅 transform（合成层，零 layout）
         * - tooltip: 仅 transform（合成层，零 layout）
         * - tooltip textContent: 仅在整数像素变化时更新（避免文本 layout）
         * 关键：此处不修改任何表格元素。
         */
        const updatePreview = () => {
            rafId = 0;
            const d = self._resizeData;
            if (!d) return;
            const diff = pendingX - d.startX;
            const minW = self._colMinWidths[d.colIndex] ?? 50;
            const newWidth = Math.max(minW, d.startWidth + diff);
            d.newWidth = newWidth;
            // fixed 定位：直接用 clientX（视口坐标），无需减去容器偏移
            guide.style.transform = 'translateX(' + pendingX + 'px)';
            // tooltip 仅在整数像素变化时更新 textContent（减少 layout）
            const wInt = Math.round(newWidth);
            if (wInt !== d.lastInt) {
                tooltip.firstChild ? (tooltip.firstChild.nodeValue = wInt + 'px') : (tooltip.textContent = wInt + 'px');
                d.lastInt = wInt;
            }
            tooltip.style.transform = 'translate(' + (pendingX + 8) + 'px, ' + d.tipTop + 'px)';
        };

        const onMouseMove = (e) => {
            if (!self._resizeData) return;
            pendingX = e.clientX;
            if (!rafId) {
                rafId = requestAnimationFrame(updatePreview);
            }
        };

        const onMouseUp = () => {
            if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
            const d = self._resizeData;
            if (!d) return;
            // 一次性应用最终列宽 —— 整个拖拽周期仅此一处触发 reflow
            if (d.newWidth != null && d.col) {
                d.col.style.width = d.newWidth + 'px';
            }
            // 清理拖拽态
            const handle = d.th.querySelector('.col-resize-handle');
            if (handle) handle.classList.remove('active');
            guide.classList.remove('active');
            tooltip.classList.remove('active');
            guide.style.transform = '';
            tooltip.style.transform = '';
            // 冻结 class 加在 table 上（非 body），缩小选择器匹配范围
            table.classList.remove('col-resizing');
            self._resizeData = null;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        this._colResizeHandler = (e) => {
            const handle = e.target.closest('.col-resize-handle');
            if (!handle) return;
            const th = handle.parentElement;
            if (!th) return;

            e.preventDefault();
            e.stopPropagation();

            const ths = thead.querySelectorAll('th');
            const colIndex = Array.from(ths).indexOf(th);

            // 一次性读取布局信息，mousemove 期间不再查询（避免强制同步布局）
            // fixed 定位下用视口坐标，无需 container 偏移
            const thRect = th.getBoundingClientRect();
            const vpHeight = window.innerHeight;

            self._resizeData = {
                th,
                colIndex,
                col: cols[colIndex],
                startX: e.clientX,
                startWidth: thRect.width,
                // tooltip 位于 th 顶部下方（视口坐标）
                tipTop: thRect.bottom + 4,
                newWidth: thRect.width,
                lastInt: Math.round(thRect.width)
            };
            handle.classList.add('active');
            guide.classList.add('active');
            tooltip.classList.add('active');
            // 引导线高度 = 视口高度（fixed 定位，覆盖整个可视区域）
            guide.style.height = vpHeight + 'px';
            guide.style.transform = 'translateX(' + e.clientX + 'px)';
            tooltip.textContent = Math.round(thRect.width) + 'px';
            tooltip.style.transform = 'translate(' + (e.clientX + 8) + 'px, ' + self._resizeData.tipTop + 'px)';
            // 冻结表格交互（class 加在 table 上，非 body）
            table.classList.add('col-resizing');

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        thead.addEventListener('mousedown', this._colResizeHandler);
    },

    /* ============ 列可见性设置 ============ */

    /** 列定义: { id, label, defaultVisible } */
    _columnDefs: [
        { id: 'menuPath', label: '菜单路径', defaultVisible: true },
        { id: 'attributeName', label: '属性标识', defaultVisible: true },
        { id: 'displayName', label: '显示名称', defaultVisible: true },
        { id: 'displayNameZh', label: '中文名称', defaultVisible: true },
        { id: 'defaultValue', label: '默认值', defaultVisible: true },
        { id: 'availableValues', label: '可选值', defaultVisible: true },
        { id: 'scope', label: '适用客户', defaultVisible: true },
        { id: 'redfish', label: 'Redfish', defaultVisible: true },
        { id: 'unicfg', label: 'Unicfg', defaultVisible: true },
        { id: 'readOnly', label: '只读', defaultVisible: true },
        { id: 'platform', label: '平台', defaultVisible: true },
        { id: 'description', label: '说明', defaultVisible: true },
        { id: 'actions', label: '操作', defaultVisible: true }
    ],

    /** 列可见性状态 (id -> boolean) */
    _columnVisibility: null,

    /** 初始化列可见性状态（从 localStorage 恢复） */
    _initColumnVisibility() {
        if (this._columnVisibility !== null) return;
        this._columnVisibility = {};
        for (const col of this._columnDefs) {
            const saved = localStorage.getItem('col_vis_' + col.id);
            if (saved !== null) {
                this._columnVisibility[col.id] = saved === 'true';
            } else {
                this._columnVisibility[col.id] = col.defaultVisible;
            }
        }
        // 初始化时立即应用 class 到 table（避免首次渲染闪烁）
        this._applyColumnClasses();
    },

    /**
     * 把列可见性状态映射为 table 上的 class（col-hide-N）。
     * 预定义 CSS 规则已写死在 styles.css，此处只做 classList 操作。
     * 性能：单次 class 批量更新 = 单次样式重计算 + 单次 reflow，
     * 相比旧的"动态注入 CSS textContent + 遍历改 col/th inline style"方案，
     * 省去了 CSS 文本重新解析和样式表重建。
     */
    _applyColumnClasses() {
        const table = document.getElementById('attribute-table');
        if (!table) return;
        // 批量构造 class 列表，一次性 setAttribute，避免多次 classList.toggle 触发多次重算
        const hideClasses = [];
        this._columnDefs.forEach((colDef, index) => {
            if (this._columnVisibility[colDef.id] === false) {
                hideClasses.push('col-hide-' + (index + 1));
            }
        });
        // 保留原有非 col-hide- 开头的 class
        const existing = table.className.split(/\s+/).filter(c => c && !c.startsWith('col-hide-'));
        const newClassName = existing.concat(hideClasses).join(' ').trim();
        if (table.className !== newClassName) {
            table.className = newClassName;
        }
    },

    /** 兼容旧调用：applyColumnVisibility → _applyColumnClasses */
    applyColumnVisibility() {
        this._initColumnVisibility();
        this._applyColumnClasses();
    },

    /** 保存列可见性到 localStorage */
    _saveColumnVisibility() {
        for (const [id, visible] of Object.entries(this._columnVisibility)) {
            localStorage.setItem('col_vis_' + id, String(visible));
        }
    },

    /** 获取列是否可见 */
    isColumnVisible(colId) {
        this._initColumnVisibility();
        return this._columnVisibility[colId] !== false;
    },

    /** 设置列可见性 */
    setColumnVisible(colId, visible) {
        this._initColumnVisibility();
        this._columnVisibility[colId] = visible;
        this._saveColumnVisibility();
    },

    /** 切换列可见性 */
    toggleColumn(colId) {
        this._initColumnVisibility();
        this._columnVisibility[colId] = !this._columnVisibility[colId];
        this._saveColumnVisibility();
    },

    /** 重置所有列可见性为默认值 */
    resetColumnVisibility() {
        this._columnVisibility = {};
        for (const col of this._columnDefs) {
            this._columnVisibility[col.id] = col.defaultVisible;
            localStorage.removeItem('col_vis_' + col.id);
        }
    },

    /** 渲染列设置面板 */
    renderColumnSettingsPanel() {
        this._initColumnVisibility();

        let html = '<div class="column-settings-panel">';
        html += '<div class="column-settings-header">';
        html += '<span class="column-settings-title">列显示设置</span>';
        html += '<button class="btn btn-small" id="btn-reset-columns" title="重置为默认">重置</button>';
        html += '</div>';
        html += '<div class="column-settings-body">';

        for (const col of this._columnDefs) {
            const checked = this._columnVisibility[col.id] !== false ? ' checked' : '';
            html += '<label class="column-settings-item">';
            html += '<input type="checkbox" data-col-id="' + col.id + '"' + checked + ' />';
            html += '<span class="column-settings-label">' + col.label + '</span>';
            html += '</label>';
        }

        html += '</div>';
        html += '</div>';

        return html;
    },

    /** 绑定列设置面板事件 */
    _bindColumnSettingsEvents() {
        const panel = document.querySelector('.column-settings-panel');
        if (!panel) return;

        // 防抖: 多个复选框快速切换时只触发一次渲染
        let _colVisTimer = null;
        const debouncedApply = () => {
            if (_colVisTimer) cancelAnimationFrame(_colVisTimer);
            _colVisTimer = requestAnimationFrame(() => {
                this.applyColumnVisibility();
                _colVisTimer = null;
            });
        };

        // 复选框变化事件
        panel.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.dataset.colId) {
                const colId = e.target.dataset.colId;
                this.setColumnVisible(colId, e.target.checked);
                debouncedApply();
            }
        });

        // 重置按钮
        const resetBtn = panel.querySelector('#btn-reset-columns');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetColumnVisibility();
                // 更新复选框状态
                panel.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    const colId = cb.dataset.colId;
                    if (colId) {
                        cb.checked = this._columnVisibility[colId] !== false;
                    }
                });
                debouncedApply();
            });
        }
    }
};
