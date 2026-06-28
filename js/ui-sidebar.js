/**
 * UI 侧边栏 — 菜单树渲染、机型选择器、筛选下拉更新、拖拽排序
 * 依赖: MenuTree, Storage, UICommon, AppState
 */

const UISidebar = {

    _menuCollapseState: {},
    _dragData: null,
    _dragGhost: null,

    renderSidebar(profile, activeMenu, onMenuClick) {
        // 刷新机型选择器
        this.renderSystemSelector();

        // 构建菜单树
        const menuMap = profile.menuMap;
        let rootMenus;
        if (Object.keys(menuMap).length > 0) {
            rootMenus = MenuTree.buildTree(menuMap);
        } else {
            rootMenus = MenuTree.buildTreeFromAttributes(profile.attrMap);
        }

        const treeEl = document.getElementById('menu-tree');

        // 激活菜单的祖先路径 → 确保展开
        const expandedPaths = new Set();
        if (activeMenu) {
            expandedPaths.add(activeMenu);
            const parts = activeMenu.replace(/^\.\//, '').split('/').filter(Boolean);
            let path = './';
            for (let i = 0; i < parts.length; i++) {
                path = path + (i === 0 ? parts[i] : '/' + parts[i]);
                expandedPaths.add(path);
            }
        }

        let html = '<div class="menu-label-row">' +
            '<span class="menu-label">菜单导航</span>' +
            '<button id="btn-add-menu" title="添加自定义菜单">+ 菜单</button></div>';

        // 全部属性入口（不可拖拽）
        const allActive = activeMenu === null || activeMenu === undefined;
        html += '<button class="menu-item' + (allActive ? ' active' : '') + '" data-menu="">所有属性</button>';

        // 递归渲染
        const escH = UICommon.escHtml, escA = UICommon.escAttr;
        const renderMenu = (menus, depth, parentPath) => {
            for (let idx = 0; idx < menus.length; idx++) {
                const menu = menus[idx];
                const hasChildren = menu.children && menu.children.length > 0;
                const name = menu.displayName || menu.displayNameZh || menu.menuName;
                const active = activeMenu === menu.menuPath;

                const expandKey = 'menu_' + menu.menuPath;
                const isExpanded = this._menuCollapseState[expandKey] !== undefined
                    ? this._menuCollapseState[expandKey]
                    : true;

                const parentKey = parentPath || 'root';
                const order = menu.displayOrder ?? idx;

                // 拖拽手柄
                const dragHandle = '<span class="menu-drag-handle" title="拖拽排序">⋮⋮</span>';

                if (hasChildren) {
                    const arrow = isExpanded ? '▼' : '▶';
                    html += '<div class="menu-group" data-menu-group="' + escA(menu.menuPath) + '">' +
                        '<button class="menu-item menu-has-children' + (active ? ' active' : '') +
                            ' depth-' + depth +
                            '" data-menu="' + escA(menu.menuPath) +
                            '" data-menu-name="' + escA(menu.menuName) +
                            '" data-parent="' + escA(parentKey) +
                            '" data-order="' + order +
                            '" data-depth="' + depth +
                            '" data-expandkey="' + expandKey +
                            '" draggable="true" title="' + escA(name) + '">' +
                        dragHandle +
                        '<span class="menu-arrow">' + arrow + '</span>' +
                        escH(name) + '</button>' +
                        '<div class="menu-children' + (isExpanded ? '' : ' menu-collapsed') + '" data-drop-zone="' + escA(menu.menuPath) + '">';
                    renderMenu(menu.children, depth + 1, menu.menuPath);
                    html += '</div></div>';
                } else {
                    html += '<button class="menu-item' + (active ? ' active' : '') +
                        ' depth-' + depth +
                        '" data-menu="' + escA(menu.menuPath) +
                        '" data-menu-name="' + escA(menu.menuName) +
                        '" data-parent="' + escA(parentKey) +
                        '" data-order="' + order +
                        '" data-depth="' + depth +
                        '" draggable="true" title="' + escA(name) + '">' +
                        dragHandle + escH(name) + '</button>';
                }
            }
        };

        renderMenu(rootMenus, 0, 'root');
        treeEl.innerHTML = html;

        // 事件委托: 点击、折叠
        treeEl.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.menu-drag-handle')) return; // 拖拽手柄不触发点击
                const menuPath = item.dataset.menu;
                const expandKey = item.dataset.expandkey;
                if (expandKey) {
                    const group = item.closest('.menu-group');
                    const childrenDiv = group ? group.querySelector(':scope > .menu-children') : null;
                    if (childrenDiv) {
                        const isCollapsed = childrenDiv.classList.toggle('menu-collapsed');
                        this._menuCollapseState[expandKey] = !isCollapsed;
                        const arrow = item.querySelector('.menu-arrow');
                        if (arrow) arrow.textContent = isCollapsed ? '▶' : '▼';
                    }
                }
                if (menuPath !== undefined) {
                    onMenuClick(menuPath || null);
                    treeEl.querySelectorAll('.menu-item.active').forEach(el => el.classList.remove('active'));
                    item.classList.add('active');
                }
                e.stopPropagation();
            });
        });

        // === 拖拽排序 ===
        this._bindDragEvents(treeEl);

        // 重新绑定添加菜单按钮
        const addMenuBtn = document.getElementById('btn-add-menu');
        if (addMenuBtn && typeof AppState !== 'undefined' && AppState.handleAddMenu) {
            addMenuBtn.addEventListener('click', () => AppState.handleAddMenu());
        }
    },

    /* ============ 拖拽排序 ============ */

    _bindDragEvents(treeEl) {
        const self = this;

        // dragstart — 记录被拖拽菜单
        treeEl.addEventListener('dragstart', (e) => {
            const item = e.target.closest('.menu-item');
            if (!item || !item.dataset.menu || item.dataset.menu === '') return;
            if (item.dataset.parent === undefined) return;

            self._dragData = {
                menuPath: item.dataset.menu,
                menuName: item.dataset.menuName,
                parent: item.dataset.parent,
                order: parseInt(item.dataset.order) || 0,
                depth: parseInt(item.dataset.depth) || 0,
                el: item
            };

            item.classList.add('menu-dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', item.dataset.menu);
            // 设置拖拽图像为透明 — 改用 CSS 透明度
            setTimeout(() => { if (self._dragData) item.classList.add('menu-dragging'); }, 0);
        }, false);

        // dragover — 高亮潜在放置目标
        treeEl.addEventListener('dragover', (e) => {
            if (!self._dragData) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            // 查找同级菜单项作为目标
            const target = e.target.closest('.menu-item');
            if (!target || !target.dataset.menu || target === self._dragData.el) {
                self._clearDragOver();
                return;
            }

            // 只允许同深度拖拽
            const targetDepth = parseInt(target.dataset.depth) || 0;
            const targetParent = target.dataset.parent;
            if (targetDepth !== self._dragData.depth || targetParent !== self._dragData.parent) {
                self._clearDragOver();
                return;
            }

            self._clearDragOver();
            target.classList.add('menu-drag-over');
        }, false);

        // dragleave — 清除高亮
        treeEl.addEventListener('dragleave', (e) => {
            const item = e.target.closest('.menu-item');
            if (item) item.classList.remove('menu-drag-over');
        }, false);

        // drop — 执行排序
        treeEl.addEventListener('drop', (e) => {
            e.preventDefault();
            self._clearDragOver();

            if (!self._dragData) return;

            const dragged = self._dragData;
            const target = e.target.closest('.menu-item');
            if (!target || !target.dataset.menu || target === dragged.el) {
                self._endDrag();
                return;
            }

            const targetParent = target.dataset.parent;
            const targetDepth = parseInt(target.dataset.depth) || 0;
            if (targetParent !== dragged.parent || targetDepth !== dragged.depth) {
                self._endDrag();
                return;
            }

            // 收集同级菜单
            const siblings = treeEl.querySelectorAll(
                '.menu-item[data-parent="' + UICommon.escAttr(dragged.parent) +
                '"][data-depth="' + dragged.depth + '"]'
            );

            const targetOrder = parseInt(target.dataset.order) || 0;

            // 重新分配 displayOrder
            const ordered = [];
            for (const sib of siblings) {
                ordered.push({
                    el: sib,
                    menuPath: sib.dataset.menu,
                    menuName: sib.dataset.menuName,
                    order: parseInt(sib.dataset.order) || 0
                });
            }

            // 移除被拖拽项，再插入到目标位置
            const dragIdx = ordered.findIndex(o => o.menuPath === dragged.menuPath);
            if (dragIdx < 0) { self._endDrag(); return; }

            const [dragItem] = ordered.splice(dragIdx, 1);
            const insertIdx = ordered.findIndex(o => o.menuPath === target.dataset.menu);
            if (insertIdx < 0) { self._endDrag(); return; }

            ordered.splice(dragged.order > targetOrder ? insertIdx : insertIdx, 0, dragItem);

            // 更新 menuMap 的 displayOrder
            const profile = AppState.currentProfile;
            let changed = false;
            for (let i = 0; i < ordered.length; i++) {
                const item = ordered[i];
                if (item.menuName && profile.menuMap[item.menuName]) {
                    const menu = profile.menuMap[item.menuName];
                    if (menu.displayOrder !== i * 10) {
                        menu.displayOrder = i * 10;
                        changed = true;
                    }
                }
                // 更新 DOM
                item.el.dataset.order = i * 10;
            }

            if (changed && typeof debouncedSave !== 'undefined') {
                debouncedSave(profile, '菜单排序');
            }

            // 重新渲染侧边栏反映新顺序
            if (typeof AppState !== 'undefined' && AppState.currentProfile) {
                const active = AppState.activeMenu;
                const profile = AppState.currentProfile;
                self.renderSidebar(profile, active, (p) => AppState.navigateToMenu(p));
            }

            self._endDrag();
        }, false);

        // dragend — 清理
        treeEl.addEventListener('dragend', () => {
            self._endDrag();
        }, false);
    },

    _clearDragOver() {
        const treeEl = document.getElementById('menu-tree');
        if (!treeEl) return;
        treeEl.querySelectorAll('.menu-drag-over').forEach(el => el.classList.remove('menu-drag-over'));
    },

    _endDrag() {
        if (this._dragData && this._dragData.el) {
            this._dragData.el.classList.remove('menu-dragging');
        }
        this._dragData = null;
        this._clearDragOver();
    },

    /* ============ 机型选择器 ============ */

    async renderSystemSelector() {
        const select = document.getElementById('select-system');
        const systems = await Storage.listSystems();
        const currentValue = select.value;

        select.innerHTML = '<option value="">-- 选择机型 --</option>';
        for (const s of systems) {
            const label = s.productName || s.systemId;
            const selected = s.systemId === currentValue ? ' selected' : '';
            select.innerHTML += '<option value="' + UICommon.escAttr(s.systemId) + '"' + selected + '>' +
                UICommon.escHtml(label) + ' (' + (s.attrCount || 0) + '项)</option>';
        }

        this.updatePlatformFilter();
        this.updateScopeFilter();
    },

    updatePlatformFilter() {
        const profile = AppState.currentProfile;
        const filter = document.getElementById('filter-platform');
        if (!filter) return;
        if (!profile) {
            filter.innerHTML = '<option value="">全部平台</option>';
            return;
        }

        const platformSet = new Set();
        for (const attr of Object.values(profile.attrMap)) {
            if (attr.platforms && attr.platforms.length > 0) {
                for (const p of attr.platforms) platformSet.add(p);
            }
        }

        const currentVal = filter.value;
        filter.innerHTML = '<option value="">全部平台</option>';
        for (const p of Array.from(platformSet).sort()) {
            const sel = p === currentVal ? ' selected' : '';
            filter.innerHTML += '<option value="' + UICommon.escAttr(p) + '"' + sel + '>' + UICommon.escHtml(p) + '</option>';
        }
    },

    updateScopeFilter() {
        const profile = AppState.currentProfile;
        const filter = document.getElementById('filter-scope');
        if (!filter) return;
        if (!profile) {
            filter.innerHTML = '<option value="">全部来源</option>';
            return;
        }

        const scopeSet = new Set();
        for (const attr of Object.values(profile.attrMap)) {
            const scope = attr.attributeScope || '通用';
            scopeSet.add(scope);
        }

        const currentVal = filter.value;
        filter.innerHTML = '<option value="">全部来源</option>';
        for (const s of Array.from(scopeSet).sort()) {
            const sel = s === currentVal ? ' selected' : '';
            filter.innerHTML += '<option value="' + UICommon.escAttr(s) + '"' + sel + '>' + UICommon.escHtml(s) + '</option>';
        }
    },

    /**
     * 重置指定菜单路径的折叠状态（外部调用入口）
     */
    clearCollapseStateForPath(menuPath) {
        if (!menuPath) return;
        const parts = menuPath.replace(/^\.\//, '').split('/').filter(Boolean);
        let ancestor = './';
        for (let i = 0; i < parts.length; i++) {
            ancestor = ancestor + (i === 0 ? parts[i] : '/' + parts[i]);
            const key = 'menu_' + ancestor;
            if (this._menuCollapseState[key] !== undefined) {
                delete this._menuCollapseState[key];
            }
        }
    }
};
