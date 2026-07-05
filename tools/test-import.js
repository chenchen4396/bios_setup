/**
 * 独立测试 — 直接测试 parser 逻辑
 * 复刻 js/models.js / js/menu-tree.js / js/parser.js 的核心逻辑
 */
'use strict';
const fs = require('fs');

// ---- 复刻 models.js ----
function toBool(val, defaultVal) {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1' || val === '是';
    if (typeof val === 'number') return val !== 0;
    return defaultVal || false;
}
function parseValueList(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(v => typeof v === 'object' ? { valueName: v.ValueName || v.valueName || '', valueDisplayName: v.ValueDisplayName || v.valueDisplayName || '' } : { valueName: String(v), valueDisplayName: String(v) });
    return [];
}
function parsePlatforms(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(String).filter(Boolean);
    return String(val).split(/[,;，；]/).map(s => s.trim()).filter(Boolean);
}
function createMenu(raw) {
    return { menuName: raw.MenuName || raw.menuName || '', displayName: raw.DisplayName || raw.displayName || '', displayOrder: parseInt(raw.DisplayOrder || raw.displayOrder) || 0, menuPath: raw.MenuPath || raw.menuPath || './', readOnly: toBool(raw.ReadOnly ?? raw.readOnly), grayOut: toBool(raw.GrayOut ?? raw.grayOut), hidden: toBool(raw.Hidden ?? raw.hidden), source: raw.source || 'Redfish', children: [], depth: 0 };
}
function createAttribute(raw) {
    return {
        attributeName: raw.AttributeName || raw.attributeName || '',
        type: raw.Type || raw.type || 'Enumeration',
        currentValue: raw.CurrentValue ?? raw.currentValue ?? null,
        defaultValue: raw.DefaultValue ?? raw.defaultValue ?? null,
        modifiedValue: null,
        attributeScope: raw.AttributeScope || raw.attributeScope || '通用',
        platforms: parsePlatforms(raw.Platforms || raw.platforms),
        supportsRedfish: toBool(raw.SupportsRedfish ?? raw.supportsRedfish, false),
        displayName: raw.DisplayName || raw.displayName || '',
        displayNameZh: '',
        helpText: raw.HelpText || raw.helpText || '',
        helpTextZh: '',
        warningText: raw.WarningText || raw.warningText || '',
        menuPath: raw.MenuPath || raw.menuPath || './',
        displayOrder: parseInt(raw.DisplayOrder || raw.displayOrder) || 0,
        readOnly: toBool(raw.ReadOnly ?? raw.readOnly),
        grayOut: toBool(raw.GrayOut ?? raw.grayOut),
        hidden: toBool(raw.Hidden ?? raw.hidden),
        immutable: toBool(raw.Immutable ?? raw.immutable),
        resetRequired: toBool(raw.ResetRequired ?? raw.resetRequired),
        value: parseValueList(raw.Value || raw.value),
        lowerBound: raw.LowerBound ?? raw.lowerBound ?? null,
        upperBound: raw.UpperBound ?? raw.upperBound ?? null,
        scalarIncrement: raw.ScalarIncrement ?? raw.scalarIncrement ?? null,
        minLength: raw.MinLength ?? raw.minLength ?? null,
        maxLength: raw.MaxLength ?? raw.maxLength ?? null,
        valueExpression: raw.ValueExpression || raw.valueExpression || null,
        depHidden: false, depGrayedOut: false, depReadOnly: false
    };
}
function createDependency(raw) {
    return { dependencyFor: raw.DependencyFor || '', type: raw.Type || 'Map', mapFromAttribute: raw.MapFromAttribute || '', mapFromProperty: raw.MapFromProperty || 'CurrentValue', mapFromCondition: raw.MapFromCondition || 'EQU', mapFromValue: String(raw.MapFromValue ?? ''), mapTerms: raw.MapTerms || 'AND', mapToAttribute: raw.MapToAttribute || '', mapToProperty: raw.MapToProperty || '', mapToValue: raw.MapToValue ?? '' };
}

// ---- 复刻 parser.js parseRegistryJSON ----
function parseRegistryJSON(json) {
    const errors = [];
    const supportedSys = (json.SupportedSystems || [])[0] || {};
    const profile = {
        productName: supportedSys.ProductName || supportedSys.productName || json.Name || '',
        systemId: supportedSys.SystemId || supportedSys.systemId || json.Id || '',
        firmwareVersion: supportedSys.FirmwareVersion || supportedSys.firmwareVersion || '',
        menuMap: {}, attrMap: {}, dependencies: [], importErrors: []
    };

    for (const m of (json.Menus || [])) {
        const menu = createMenu(m);
        if (!menu.menuName) { errors.push('菜单缺少 MenuName'); continue; }
        profile.menuMap[menu.menuName] = menu;
    }
    for (const a of (json.Attributes || [])) {
        const attr = createAttribute(a);
        if (!attr.attributeName) { errors.push('属性缺少 AttributeName'); continue; }
        profile.attrMap[attr.attributeName] = attr;
    }
    // Dependencies: 展开 MapFrom 数组
    for (const dep of (json.Dependencies || [])) {
        const depData = dep.Dependency || dep.dependency || {};
        const mapFrom = depData.MapFrom || depData.mapFrom || [];
        const depFor = dep.DependencyFor || dep.dependencyFor;
        const mapToAttr = depData.MapToAttribute || depData.mapToAttribute || depFor;
        const mapToProp = depData.MapToProperty || depData.mapToProperty;
        const mapToVal = depData.MapToValue ?? depData.mapToValue;
        const mapTerms = depData.MapTerms || depData.mapTerms || 'AND';
        if (!depFor || !mapToProp || !mapFrom.length) continue;
        for (const cond of mapFrom) {
            const d = createDependency({
                DependencyFor: depFor, Type: dep.Type, MapFromAttribute: cond.MapFromAttribute || cond.mapFromAttribute,
                MapFromProperty: cond.MapFromProperty || cond.mapFromProperty, MapFromCondition: cond.MapFromCondition || cond.mapFromCondition,
                MapFromValue: cond.MapFromValue ?? cond.mapFromValue, MapTerms: mapTerms, MapToAttribute: mapToAttr, MapToProperty: mapToProp, MapToValue: mapToVal
            });
            if (d.mapFromAttribute && d.dependencyFor) profile.dependencies.push(d);
        }
    }
    profile.importErrors = errors;
    return profile;
}

// ---- 复刻 menu-tree.js buildTree ----
function getParentPath(menuPath) {
    if (!menuPath || menuPath === './') return null;
    const parts = menuPath.replace('./', '').split('/').filter(Boolean);
    if (parts.length <= 1) return null;
    return './' + parts.slice(0, -1).join('/');
}
function buildTree(menuMap) {
    const originalMenus = Object.values(menuMap);
    const workMap = {};
    const pathIndex = {};
    for (const menu of originalMenus) {
        const copy = { ...menu };
        if (!Array.isArray(copy.children)) copy.children = [];
        workMap[copy.menuName] = copy;
        pathIndex[copy.menuPath] = copy;
    }
    // 补全中间路径
    const pathSet = new Set(originalMenus.map(m => m.menuPath));
    const newPathSet = new Set(pathSet);
    for (const path of pathSet) {
        const parts = path.replace('./', '').split('/').filter(Boolean);
        for (let i = 1; i < parts.length; i++) {
            newPathSet.add('./' + parts.slice(0, i).join('/'));
        }
    }
    for (const path of newPathSet) {
        if (!pathIndex[path]) {
            const parts = path.replace('./', '').split('/').filter(Boolean);
            const key = '__auto_' + path;
            const v = { menuName: parts[parts.length - 1], displayName: parts[parts.length - 1], displayOrder: 0, menuPath: path, children: [], depth: 0, source: 'Redfish' };
            workMap[key] = v;
            pathIndex[path] = v;
        }
    }
    const allMenus = Object.values(workMap);
    allMenus.sort((a, b) => a.menuPath.localeCompare(b.menuPath) || (a.displayOrder || 0) - (b.displayOrder || 0));
    const rootMenus = [];
    for (const menu of allMenus) {
        const parts = menu.menuPath.replace('./', '').split('/').filter(Boolean);
        menu.depth = parts.length;
        const parentPath = getParentPath(menu.menuPath);
        if (!parentPath) { rootMenus.push(menu); continue; }
        const parent = pathIndex[parentPath];
        if (parent) { menu.parent = parent; parent.children.push(menu); } else { rootMenus.push(menu); }
    }
    // 对每个父节点的子节点按 displayOrder 排序
    for (const menu of allMenus) {
        if (menu.children && menu.children.length) {
            menu.children.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        }
    }
    return rootMenus;
}


// ======== 主测试 ========
console.log('读取 Registry JSON...');
const json = JSON.parse(fs.readFileSync('../data/BMC_AttributeRegistry_RS3600G3.json', 'utf8'));
console.log('  Menus:', json.Menus.length, ' Attrs:', json.Attributes.length, ' Deps:', json.Dependencies.length);

console.log('\n解析 Profile...');
const profile = parseRegistryJSON(json);
console.log('  ProductName:', profile.productName);
console.log('  SystemId:', profile.systemId);
console.log('  FirmwareVersion:', profile.firmwareVersion);
console.log('  menuMap entries:', Object.keys(profile.menuMap).length);
console.log('  attrMap entries:', Object.keys(profile.attrMap).length);
console.log('  dependencies:', profile.dependencies.length);
console.log('  importErrors:', profile.importErrors);

// 检查所有属性
const attrs = Object.values(profile.attrMap);
const issues = [];

// 检查 SupportsRedfish
const noSR = attrs.filter(a => !a.supportsRedfish);
console.log('\nSupportsRedfish = false:', noSR.length, '->', noSR.map(a => a.attributeName).join(', '));

// 检查枚举值
const enums = attrs.filter(a => a.type === 'Enumeration');
const enumsNoVal = enums.filter(a => !a.value || !a.value.length);
enums.forEach(a => {
    if (!a.value || !a.value.length) issues.push('枚举 ' + a.attributeName + ' 无可选值');
    else {
        a.value.forEach(v => { if (!v.valueName) issues.push('枚举 ' + a.attributeName + ' valueName 为空'); });
    }
});
console.log('枚举属性:', enums.length, '无值:', enumsNoVal.length);

// 检查整数
const ints = attrs.filter(a => a.type === 'Integer');
ints.forEach(a => {
    if (a.lowerBound === null) issues.push('整数 ' + a.attributeName + ' 无 lowerBound');
    if (a.upperBound === null) issues.push('整数 ' + a.attributeName + ' 无 upperBound');
});
console.log('整数属性:', ints.length);

// 检查 menuPath
const missingMenus = [];
attrs.forEach(a => {
    const path = a.menuPath;
    // 检查中间路径是否都有对应菜单（属性引用路径的祖先）
    const parts = path.replace('./', '').split('/').filter(Boolean);
    for (let i = 1; i < parts.length; i++) {
        const ancestor = './' + parts.slice(0, i).join('/');
        if (!Object.values(profile.menuMap).some(m => m.menuPath === ancestor)) {
            if (!missingMenus.includes(ancestor)) missingMenus.push(ancestor);
        }
    }
});
if (missingMenus.length > 0) {
    console.log('\n属性引用了但无直接菜单定义的中间路径 (' + missingMenus.length + '):');
    missingMenus.forEach(p => console.log('  ' + p));
    console.log('  (buildTree 会自动补全这些虚拟节点)');
}

// 构建菜单树并验证
console.log('\n构建菜单树...');
const rootMenus = buildTree(profile.menuMap);
console.log('Root menus:', rootMenus.length);
function showTree(menus, indent) {
    menus.forEach(m => {
        const virtual = m.menuName && m.menuName.startsWith('__auto_') ? ' [虚拟]' : '';
        console.log(indent + m.menuPath + ' ' + m.menuName + virtual);
        if (m.children && m.children.length) showTree(m.children, indent + '  ');
    });
}
showTree(rootMenus, '');

// 依赖验证
console.log('\n依赖关系:', profile.dependencies.length);
let depIssues = 0;
profile.dependencies.forEach(d => {
    const srcOk = !!profile.attrMap[d.mapFromAttribute];
    const tgtOk = !!profile.attrMap[d.dependencyFor];
    if (!srcOk || !tgtOk) {
        depIssues++;
        issues.push('依赖: ' + d.mapFromAttribute + '→' + d.dependencyFor + (srcOk ? '' : ' SRC_MISSING') + (tgtOk ? '' : ' TGT_MISSING'));
    }
});
if (depIssues) console.log('  !! ' + depIssues + ' 依赖问题');

// 最终总结
console.log('\n======= 问题汇总 =======');
if (issues.length === 0) {
    console.log('✓ 没有问题，导入完全正常');
} else {
    console.log(issues.length + ' 个问题:');
    issues.forEach(i => console.log('  ✗ ' + i));
}
console.log('\n======= 测试完成 =======');
