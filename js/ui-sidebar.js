/**
 * UI 侧边栏 — 菜单树渲染、机型选择器、筛选下拉更新、拖拽排序
 * 依赖: MenuTree, Storage, UICommon, AppState
 */

const UISidebar = {

    _menuCollapseState: {},
    _dragData: null,
    _dragGhost: null,
    _currentDragOverItem: null, // 当前拖拽悬停的菜单项（避免 onDragLeave 误删高亮）
    _menuTreeData: null, // 缓存菜单树数据，支持懒加载
    _menuTreeRoot: null, // 根菜单引用
    _platformCacheHash: null, // 平台筛选缓存哈希
    _scopeCacheHash: null, // 适用客户筛选缓存哈希
    _activeMenu: null, // 当前激活的菜单路径

    renderSidebar(profile, activeMenu, onMenuClick) {
        // 刷新机型选择器
        this.renderSystemSelector();

        // 保存当前激活菜单路径，供懒加载使用
        this._activeMenu = activeMenu;

        // 构建菜单树
        const menuMap = profile.menuMap;
        let rootMenus;
        if (Object.keys(menuMap).length > 0) {
            rootMenus = MenuTree.buildTree(menuMap);
        } else {
            rootMenus = MenuTree.buildTreeFromAttributes(profile.attrMap);
        }

        // 缓存菜单树数据
        this._menuTreeData = menuMap;
        this._menuTreeRoot = rootMenus;

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
            '<button id="btn-add-menu" title="添加自定义菜单"' +
                (Auth.isAdmin ? '' : ' class="hidden"') +
                '>＋ 菜单</button></div>';

        // 全部属性入口（不可拖拽）
        const allActive = activeMenu === null || activeMenu === undefined;
        html += '<button class="menu-item' + (allActive ? ' active' : '') + '" data-menu="">所有属性</button>';

        // 递归渲染（懒加载优化：只渲染展开的节点）
        const escH = UICommon.escHtml, escA = UICommon.escAttr;
        const renderMenu = (menus, depth, parentPath) => {
            for (let idx = 0; idx < menus.length; idx++) {
                const menu = menus[idx];
                const hasChildren = menu.children && menu.children.length > 0;
                const name = menu.displayName || menu.displayNameZh || menu.menuName;
                const active = activeMenu === menu.menuPath;

                const expandKey = 'menu_' + menu.menuPath;
                // 检查是否需要自动展开（激活菜单的祖先）
                const shouldAutoExpand = expandedPaths.has(menu.menuPath);
                const isExpanded = this._menuCollapseState[expandKey] !== undefined
                    ? this._menuCollapseState[expandKey]
                    : shouldAutoExpand;

                const parentKey = parentPath || 'root';
                const order = menu.displayOrder ?? idx;

                // 拖拽手柄
                const dragHandle = '<span class="menu-drag-handle" title="拖拽排序" draggable="true">⋮⋮</span>';

                if (hasChildren) {
                    const arrow = isExpanded ? '▼' : '▶';
                    html += '<div class="menu-group" data-menu-group="' + escA(menu.menuPath) + '">' +
                        '<div class="menu-item menu-has-children' + (active ? ' active' : '') +
                            ' depth-' + depth +
                            '" tabindex="0" role="button"' +
                            ' data-menu="' + escA(menu.menuPath) +
                            '" data-menu-name="' + escA(menu.menuName) +
                            '" data-parent="' + escA(parentKey) +
                            '" data-order="' + order +
                            '" data-depth="' + depth +
                            '" data-expandkey="' + expandKey +
                            '" title="' + escA(name) + '">' +
                        dragHandle +
                        '<span class="menu-arrow">' + arrow + '</span>' +
                        escH(name) + '</div>' +
                        '<div class="menu-children' + (isExpanded ? '' : ' menu-collapsed') + '" data-drop-zone="' + escA(menu.menuPath) + '">';
                    // 懒加载：只在展开时渲染子节点
                    if (isExpanded) {
                        renderMenu(menu.children, depth + 1, menu.menuPath);
                    }
                    html += '</div></div>';
                } else {
                    html += '<div class="menu-item' + (active ? ' active' : '') +
                        ' depth-' + depth +
                        '" tabindex="0" role="button"' +
                        ' data-menu="' + escA(menu.menuPath) +
                        '" data-menu-name="' + escA(menu.menuName) +
                        '" data-parent="' + escA(parentKey) +
                        '" data-order="' + order +
                        '" data-depth="' + depth +
                        '" title="' + escA(name) + '">' +
                        dragHandle + escH(name) + '</div>';
                }
            }
        };

        renderMenu(rootMenus, 0, 'root');
        treeEl.innerHTML = html;

        // 事件委托（移除旧的委托避免累积）
        if (this._menuClickHandler) {
            treeEl.removeEventListener('click', this._menuClickHandler);
        }
        this._menuClickHandler = (e) => {
            const item = e.target.closest('.menu-item');
            if (!item) return;
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

                    // 懒加载：展开时动态渲染子节点
                    if (!isCollapsed && childrenDiv.children.length === 0) {
                        const depth = parseInt(item.dataset.depth) || 0;
                        this._renderLazyChildren(menuPath, childrenDiv, depth + 1);
                    }
                }
            }
            if (menuPath !== undefined) {
                onMenuClick(menuPath || null);
                treeEl.querySelectorAll('.menu-item.active').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
            }
            e.stopPropagation();
        };
        treeEl.addEventListener('click', this._menuClickHandler);

        // === 拖拽排序 ===
        this._bindDragEvents(treeEl);

        // 重新绑定添加菜单按钮
        const addMenuBtn = document.getElementById('btn-add-menu');
        if (addMenuBtn && typeof AppState !== 'undefined' && AppState.handleAddMenu) {
            addMenuBtn.addEventListener('click', () => AppState.handleAddMenu());
        }
    },

    /**
     * 懒加载渲染子菜单节点（性能优化）
     */
    _renderLazyChildren(menuPath, container, depth) {
        if (!this._menuTreeRoot || !menuPath) return;

        // 查找对应的菜单节点
        const findMenu = (menus, path) => {
            for (const menu of menus) {
                if (menu.menuPath === path) return menu;
                if (menu.children) {
                    const found = findMenu(menu.children, path);
                    if (found) return found;
                }
            }
            return null;
        };

        const menu = findMenu(this._menuTreeRoot, menuPath);
        if (!menu || !menu.children || menu.children.length === 0) return;

        // 使用 DocumentFragment 批量插入，减少重排
        const frag = document.createDocumentFragment();
        const escH = UICommon.escHtml, escA = UICommon.escAttr;

        menu.children.forEach((child, idx) => {
            const hasChildren = child.children && child.children.length > 0;
            const name = child.displayName || child.displayNameZh || child.menuName;
            const childExpandKey = 'menu_' + child.menuPath;
            const childExpanded = this._menuCollapseState[childExpandKey] !== undefined
                ? this._menuCollapseState[childExpandKey]
                : true;
            const order = child.displayOrder ?? idx;
            // 检查是否为当前激活菜单
            const isActive = this._activeMenu === child.menuPath;

            const dragHandle = document.createElement('span');
            dragHandle.className = 'menu-drag-handle';
            dragHandle.title = '拖拽排序';
            dragHandle.draggable = true;
            dragHandle.textContent = '⋮⋮';

            if (hasChildren) {
                const group = document.createElement('div');
                group.className = 'menu-group';
                group.dataset.menuGroup = child.menuPath;

                const item = document.createElement('div');
                item.className = 'menu-item menu-has-children depth-' + depth + (isActive ? ' active' : '');
                item.tabIndex = 0;
                item.role = 'button';
                item.dataset.menu = child.menuPath;
                item.dataset.menuName = child.menuName;
                item.dataset.parent = menuPath;
                item.dataset.order = order;
                item.dataset.depth = depth;
                item.dataset.expandkey = childExpandKey;
                item.title = name;

                const arrow = document.createElement('span');
                arrow.className = 'menu-arrow';
                arrow.textContent = childExpanded ? '▼' : '▶';

                item.appendChild(dragHandle);
                item.appendChild(arrow);
                item.appendChild(document.createTextNode(name));

                const childrenDiv = document.createElement('div');
                childrenDiv.className = 'menu-children' + (childExpanded ? '' : ' menu-collapsed');
                childrenDiv.dataset.dropZone = child.menuPath;

                // 懒加载：只在展开时渲染子节点
                if (childExpanded) {
                    this._renderLazyChildren(child.menuPath, childrenDiv, depth + 1);
                }

                group.appendChild(item);
                group.appendChild(childrenDiv);
                frag.appendChild(group);
            } else {
                const item = document.createElement('div');
                item.className = 'menu-item depth-' + depth + (isActive ? ' active' : '');
                item.tabIndex = 0;
                item.role = 'button';
                item.dataset.menu = child.menuPath;
                item.dataset.menuName = child.menuName;
                item.dataset.parent = menuPath;
                item.dataset.order = order;
                item.dataset.depth = depth;
                item.title = name;

                item.appendChild(dragHandle);
                item.appendChild(document.createTextNode(name));
                frag.appendChild(item);
            }
        });

        container.appendChild(frag);
    },

    /* ============ 拖拽排序 ============ */

    _bindDragEvents(treeEl) {
        // 移除旧监听器避免累积
        if (this._dragCleanup) { this._dragCleanup(); }

        const self = this;

        const onDragStart = (e) => {
            const item = e.target.closest('.menu-item');
            if (!item || !item.dataset.menu || item.dataset.menu === '') { e.preventDefault(); return; }
            if (item.dataset.parent === undefined) { e.preventDefault(); return; }

            self._dragData = {
                menuPath: item.dataset.menu,
                menuName: item.dataset.menuName,
                parent: item.dataset.parent,
                order: parseInt(item.dataset.order) || 0,
                depth: parseInt(item.dataset.depth) || 0,
                el: item
            };
            self._currentDragOverItem = null;

            item.classList.add('menu-dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', item.dataset.menu);
            setTimeout(() => { if (self._dragData) item.classList.add('menu-dragging'); }, 0);
        };

        const onDragOver = (e) => {
            if (!self._dragData) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const target = e.target.closest('.menu-item');
            if (!target || !target.dataset.menu || target === self._dragData.el) {
                // 移到无效区域：清除当前高亮
                if (self._currentDragOverItem) {
                    self._currentDragOverItem.classList.remove('menu-drag-over');
                    self._currentDragOverItem = null;
                }
                return;
            }

            const targetDepth = parseInt(target.dataset.depth) || 0;
            const targetParent = target.dataset.parent;
            if (targetDepth !== self._dragData.depth || targetParent !== self._dragData.parent) {
                // 不同层级/父级：清除当前高亮
                if (self._currentDragOverItem) {
                    self._currentDragOverItem.classList.remove('menu-drag-over');
                    self._currentDragOverItem = null;
                }
                return;
            }

            // 同级同父的有效目标：只在切换目标时更新高亮
            if (self._currentDragOverItem !== target) {
                if (self._currentDragOverItem) {
                    self._currentDragOverItem.classList.remove('menu-drag-over');
                }
                self._currentDragOverItem = target;
                target.classList.add('menu-drag-over');
            }
        };

        const onDragEnter = (e) => {
            // dragenter 用于跟踪进入的新菜单项（补充 dragover 在子元素间移动时的盲区）
            // 具体验证和高亮由 onDragOver 负责
        };

        const onDragLeave = (e) => {
            // 只有当光标真正离开当前高亮的菜单项时才移除高亮
            // 检查 relatedTarget（光标移入的元素）是否仍在当前高亮项内部
            const item = e.target.closest('.menu-item');
            if (!item || item !== self._currentDragOverItem) return;

            const related = e.relatedTarget;
            if (related && item.contains(related)) {
                // 光标还在当前菜单项内部（移到子元素），不移除高亮
                return;
            }
            // 光标真正离开了当前菜单项
            item.classList.remove('menu-drag-over');
            if (self._currentDragOverItem === item) {
                self._currentDragOverItem = null;
            }
        };

        const onDrop = (e) => {
            e.preventDefault();
            self._clearDragOver();
            self._currentDragOverItem = null;

            if (!self._dragData) {
                console.warn('[DRAG] onDrop: no _dragData');
                return;
            }

            if (typeof Auth !== 'undefined' && !Auth.isAdmin) {
                if (typeof UIRenderer !== 'undefined') {
                    UIRenderer.showNotification('拖拽排序需要管理员权限，请先登录管理员账户', 'warn', 3000);
                }
                self._endDrag();
                return;
            }

            const dragged = self._dragData;
            const target = e.target.closest('.menu-item');
            if (!target || !target.dataset.menu || target === dragged.el) {
                self._endDrag();
                return;
            }

            const targetParent = target.dataset.parent;
            const targetDepth = parseInt(target.dataset.depth) || 0;
            if (targetParent !== dragged.parent || targetDepth !== dragged.depth) {
                console.warn('[DRAG] onDrop: depth/parent mismatch', {
                    dragged: { parent: dragged.parent, depth: dragged.depth, menuPath: dragged.menuPath },
                    target: { parent: targetParent, depth: targetDepth, menuPath: target.dataset.menu }
                });
                self._endDrag();
                return;
            }

            const siblings = treeEl.querySelectorAll(
                '.menu-item[data-parent="' + UICommon.escAttr(dragged.parent) +
                '"][data-depth="' + dragged.depth + '"]'
            );
            console.log('[DRAG] onDrop: siblings found', siblings.length, {
                parent: dragged.parent,
                depth: dragged.depth,
                draggedPath: dragged.menuPath,
                targetPath: target.dataset.menu
            });

            const targetOrder = parseInt(target.dataset.order) || 0;

            const ordered = [];
            for (const sib of siblings) {
                ordered.push({
                    el: sib,
                    menuPath: sib.dataset.menu,
                    menuName: sib.dataset.menuName,
                    order: parseInt(sib.dataset.order) || 0
                });
            }

            const dragIdx = ordered.findIndex(o => o.menuPath === dragged.menuPath);
            if (dragIdx < 0) {
                console.warn('[DRAG] onDrop: dragIdx not found', { draggedPath: dragged.menuPath, ordered: ordered.map(o => o.menuPath) });
                self._endDrag();
                return;
            }

            const [dragItem] = ordered.splice(dragIdx, 1);
            const insertIdx = ordered.findIndex(o => o.menuPath === target.dataset.menu);
            if (insertIdx < 0) {
                console.warn('[DRAG] onDrop: insertIdx not found', { targetPath: target.dataset.menu, ordered: ordered.map(o => o.menuPath) });
                self._endDrag();
                return;
            }

            // 向前拖动（源在目标之前）：插入到目标之后
            // 向后拖动（源在目标之后）：插入到目标之前
            if (dragged.order < targetOrder) {
                ordered.splice(insertIdx + 1, 0, dragItem);
            } else {
                ordered.splice(insertIdx, 0, dragItem);
            }
            console.log('[DRAG] onDrop: reordered', ordered.map((o, i) => ({ i, path: o.menuPath, order: i * 10 })));

            const profile = AppState.currentProfile;
            let changed = false;
            // 构建 menuPath → menu 索引（兼容 __auto_ 前缀的虚拟节点 key）
            const pathToMenu = {};
            for (const key of Object.keys(profile.menuMap)) {
                const m = profile.menuMap[key];
                if (m && m.menuPath) pathToMenu[m.menuPath] = m;
            }
            for (let i = 0; i < ordered.length; i++) {
                const item = ordered[i];
                const menu = item.menuPath ? pathToMenu[item.menuPath] : null;
                if (menu) {
                    if (menu.displayOrder !== i * 10) {
                        menu.displayOrder = i * 10;
                        changed = true;
                    }
                }
                item.el.dataset.order = i * 10;
            }

            if (changed && typeof debouncedSave !== 'undefined') {
                debouncedSave(profile, '菜单排序');
            }

            console.log('[DRAG] onDrop: displayOrder updated', {
                changed,
                menuMapKeys: Object.keys(profile.menuMap).slice(0, 10),
                pathToMenuSample: Object.entries(pathToMenu).slice(0, 5).map(([k, v]) => ({ path: k, order: v.displayOrder }))
            });

            // 先清理拖拽状态，再重建 DOM（避免 _dragData 引用已销毁的元素）
            self._dragData = null;
            self._currentDragOverItem = null;

            if (typeof AppState !== 'undefined' && AppState.currentProfile) {
                const active = AppState.activeMenu;
                const profile = AppState.currentProfile;
                self.renderSidebar(profile, active, (p) => AppState.navigateToMenu(p));
            }
        };

        const onDragEnd = () => {
            self._currentDragOverItem = null;
            self._endDrag();
        };

        treeEl.addEventListener('dragstart', onDragStart);
        treeEl.addEventListener('dragover', onDragOver);
        treeEl.addEventListener('dragenter', onDragEnter);
        treeEl.addEventListener('dragleave', onDragLeave);
        treeEl.addEventListener('drop', onDrop);
        treeEl.addEventListener('dragend', onDragEnd);

        this._dragCleanup = () => {
            treeEl.removeEventListener('dragstart', onDragStart);
            treeEl.removeEventListener('dragover', onDragOver);
            treeEl.removeEventListener('dragenter', onDragEnter);
            treeEl.removeEventListener('dragleave', onDragLeave);
            treeEl.removeEventListener('drop', onDrop);
            treeEl.removeEventListener('dragend', onDragEnd);
        };
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
        this._currentDragOverItem = null;
        this._clearDragOver();
    },

    /* ============ 机型选择器 ============ */

    async renderSystemSelector() {
        const nameEl = document.getElementById('current-system-name');
        if (nameEl) {
            if (AppState.currentProfile) {
                const profile = AppState.currentProfile;
                const label = profile.productName || profile.systemId;
                const count = Object.keys(profile.attrMap).length;
                nameEl.textContent = label + ' (' + count + '项)';
            } else {
                nameEl.textContent = '-- 选择机型 --';
            }
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
            this._platformCacheHash = null;
            return;
        }

        // 计算 attrMap 的哈希值，仅变化时重建
        const currentHash = this._computeAttrMapHash(profile.attrMap);
        if (currentHash === this._platformCacheHash) return;
        this._platformCacheHash = currentHash;

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
            filter.innerHTML = '<option value="">全部适用客户</option>';
            this._scopeCacheHash = null;
            return;
        }

        // 计算 attrMap 的哈希值，仅变化时重建
        const currentHash = this._computeAttrMapHash(profile.attrMap);
        if (currentHash === this._scopeCacheHash) return;
        this._scopeCacheHash = currentHash;

        const scopeSet = new Set();
        for (const attr of Object.values(profile.attrMap)) {
            const scope = attr.attributeScope || '通用';
            scopeSet.add(scope);
        }

        const currentVal = filter.value;
        filter.innerHTML = '<option value="">全部适用客户</option>';
        for (const s of Array.from(scopeSet).sort()) {
            const sel = s === currentVal ? ' selected' : '';
            filter.innerHTML += '<option value="' + UICommon.escAttr(s) + '"' + sel + '>' + UICommon.escHtml(s) + '</option>';
        }
    },

    /**
     * 计算 attrMap 的快速哈希值（用于缓存判断）
     */
    _computeAttrMapHash(attrMap) {
        if (!attrMap) return null;
        const keys = Object.keys(attrMap);
        return keys.length + '_' + (keys[0] || '') + '_' + (keys[keys.length - 1] || '');
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
