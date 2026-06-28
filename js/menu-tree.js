/**
 * 菜单树构建器 - 根据 MenuPath 构建层级菜单树
 */

const MenuTree = {

    /**
     * 构建菜单树
     * 不修改原始 menuMap — 虚拟节点存在独立的工作副本中
     * @param {Object} menuMap - key=menuName
     * @returns {Array} 顶级菜单列表（含 children）
     */
    buildTree(menuMap) {
        const originalMenus = Object.values(menuMap);
        if (originalMenus.length === 0) return [];

        // 工作副本：不修改原始 menuMap
        const workMap = {};
        const pathIndex = {}; // path → menu 的 O(1) 索引

        // 复制已有菜单到工作副本
        for (const menu of originalMenus) {
            const copy = Object.assign(Object.create(Object.getPrototypeOf(menu)), menu);
            if (!Array.isArray(copy.children)) copy.children = [];
            workMap[copy.menuName] = copy;
            pathIndex[copy.menuPath] = copy;
        }

        // 收集所有中间路径，自动补全缺失的父级菜单
        const pathSet = new Set(originalMenus.map(m => m.menuPath));
        const newPathSet = new Set(pathSet);
        for (const path of pathSet) {
            const parts = path.replace('./', '').split('/').filter(Boolean);
            for (let i = 1; i < parts.length; i++) {
                const ancestor = './' + parts.slice(0, i).join('/');
                newPathSet.add(ancestor);
            }
        }

        // 为缺失的中间路径创建虚拟菜单节点（写入工作副本，不污染原 map）
        for (const path of newPathSet) {
            if (!pathIndex[path]) {
                const parts = path.replace('./', '').split('/').filter(Boolean);
                const lastName = parts[parts.length - 1];
                const key = '__auto_' + path;
                const virtual = createMenu({
                    MenuName: lastName,
                    DisplayName: lastName,
                    displayNameZh: '',
                    MenuPath: path,
                    source: MenuSource.Redfish
                });
                if (!Array.isArray(virtual.children)) virtual.children = [];
                workMap[key] = virtual;
                pathIndex[path] = virtual;
            }
        }

        const allMenus = Object.values(workMap);
        // 全局按 menuPath 字典序 → 同路径按 displayOrder
        allMenus.sort((a, b) => {
            if (a.menuPath !== b.menuPath) return a.menuPath.localeCompare(b.menuPath);
            return (a.displayOrder || 0) - (b.displayOrder || 0);
        });

        // 计算深度 + 构建父子关系（用 pathIndex 实现 O(1) 查找）
        const rootMenus = [];
        for (const menu of allMenus) {
            const parts = menu.menuPath.replace('./', '').split('/').filter(Boolean);
            menu.depth = parts.length;

            const parentPath = this.getParentPath(menu.menuPath);
            if (!parentPath) {
                rootMenus.push(menu);
                continue;
            }
            const parent = pathIndex[parentPath];
            if (parent) {
                menu.parent = parent;
                parent.children.push(menu);
            } else {
                rootMenus.push(menu);
            }
        }

        // 每个父节点下按 displayOrder 排序子节点（支持拖拽重排后可恢复自定义顺序）
        const sortChildren = (menus) => {
            menus.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
            for (const m of menus) {
                if (m.children && m.children.length > 0) sortChildren(m.children);
            }
        };
        sortChildren(rootMenus);

        return rootMenus;
    },

    /**
     * 获取父路径
     * @param {string} menuPath 如 "./SystemOptions/ProcessorOptions"
     * @returns {string|null} "./SystemOptions"
     */
    getParentPath(menuPath) {
        const parts = menuPath.replace('./', '').split('/').filter(Boolean);
        if (parts.length <= 1) return null;
        return './' + parts.slice(0, -1).join('/');
    },

    /**
     * 获取指定菜单路径下的所有属性（包含子菜单）
     * @param {Object} profile
     * @param {string|null} menuPath - null 表示全部
     * @returns {Array}
     */
    getAttributesForMenu(profile, menuPath) {
        if (!menuPath) {
            return Object.values(profile.attrMap);
        }
        // 找到所有匹配此路径及子路径的属性
        return Object.values(profile.attrMap).filter(attr => {
            return attr.menuPath === menuPath || attr.menuPath.startsWith(menuPath + '/');
        });
    },

    /**
     * 构建扁平化菜单列表
     * @param {Array} rootMenus
     * @param {string} parentName
     * @returns {Array<{menu, path: string, depth: number}>}
     */
    flattenTree(rootMenus, parentName) {
        const result = [];
        const walk = (menus, depth, prefix) => {
            for (const menu of menus) {
                const display = menu.displayNameZh || menu.displayName || menu.menuName;
                const path = prefix ? prefix + ' / ' + display : display;
                result.push({ menu, path, depth });
                if (menu.children && menu.children.length > 0) {
                    walk(menu.children, depth + 1, path);
                }
            }
        };
        walk(rootMenus, 0, '');
        return result;
    },

    /**
     * 根据属性构建菜单树（兜底方案 - 当没导入菜单时从属性反推）
     * @param {Object} attrMap
     */
    buildTreeFromAttributes(attrMap) {
        const pathMap = {};
        for (const attr of Object.values(attrMap)) {
            if (!attr.menuPath) continue;
            pathMap[attr.menuPath] = true;
        }

        // 构建所有中间路径
        const allPaths = new Set();
        for (const path of Object.keys(pathMap)) {
            const parts = path.replace('./', '').split('/').filter(Boolean);
            for (let i = 0; i < parts.length; i++) {
                allPaths.add('./' + parts.slice(0, i + 1).join('/'));
            }
        }

        const menuMap = {};
        let order = 1;
        for (const path of Array.from(allPaths).sort()) {
            const parts = path.replace('./', '').split('/').filter(Boolean);
            const name = parts[parts.length - 1] || 'Root';
            menuMap[name] = createMenu({
                MenuName: name,
                DisplayName: name,
                DisplayOrder: order++,
                MenuPath: path
            });
        }
        return this.buildTree(menuMap);
    }
};
