/**
 * UI 侧边栏 — 菜单树渲染、机型选择器、筛选下拉更新
 * 依赖: MenuTree, Storage, UICommon, AppState
 */

const UISidebar = {

    _menuCollapseState: {},

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

        // 全部属性入口
        const allActive = activeMenu === null || activeMenu === undefined;
        html += '<button class="menu-item' + (allActive ? ' active' : '') + '" data-menu="">所有属性</button>';

        // 递归渲染
        const escH = UICommon.escHtml, escA = UICommon.escAttr;
        const renderMenu = (menus, depth) => {
            for (const menu of menus) {
                const hasChildren = menu.children && menu.children.length > 0;
                const name = menu.displayName || menu.displayNameZh || menu.menuName;
                const active = activeMenu === menu.menuPath;

                const expandKey = 'menu_' + menu.menuPath;
                const isExpanded = this._menuCollapseState[expandKey] !== undefined
                    ? this._menuCollapseState[expandKey]
                    : true; // 默认展开

                if (hasChildren) {
                    const arrow = isExpanded ? '▼' : '▶';
                    html += '<div class="menu-group">' +
                        '<button class="menu-item menu-has-children' + (active ? ' active' : '') +
                            ' depth-' + depth +
                            '" data-menu="' + escA(menu.menuPath) +
                            '" data-expandkey="' + expandKey + '" title="' + escA(name) + '">' +
                        '<span class="menu-arrow">' + arrow + '</span>' +
                        escH(name) + '</button>' +
                        '<div class="menu-children' + (isExpanded ? '' : ' menu-collapsed') + '">';
                    renderMenu(menu.children, depth + 1);
                    html += '</div></div>';
                } else {
                    html += '<button class="menu-item' + (active ? ' active' : '') +
                        ' depth-' + depth +
                        '" data-menu="' + escA(menu.menuPath) + '" title="' + escA(name) + '">' +
                        escH(name) + '</button>';
                }
            }
        };

        renderMenu(rootMenus, 0);
        treeEl.innerHTML = html;

        // 事件绑定
        treeEl.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const menuPath = item.dataset.menu;
                const expandKey = item.dataset.expandkey;
                if (expandKey) {
                    const childrenDiv = item.nextElementSibling;
                    if (childrenDiv && childrenDiv.classList.contains('menu-children')) {
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

        // 重新绑定添加菜单按钮
        const addMenuBtn = document.getElementById('btn-add-menu');
        if (addMenuBtn && typeof AppState !== 'undefined' && AppState.handleAddMenu) {
            addMenuBtn.addEventListener('click', () => AppState.handleAddMenu());
        }
    },

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
