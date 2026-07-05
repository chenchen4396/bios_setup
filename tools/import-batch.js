#!/usr/bin/env node
/**
 * 批量导入 Registry JSON 到 BIOS 管理器后端
 * 直接写入 data/{systemId}.json + 更新 _index.json
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const REGISTRY_DIR = path.join(DATA_DIR, 'registries');
const INDEX_FILE = path.join(DATA_DIR, '_index.json');
const MODELS_FILE = path.join(__dirname, '..', 'js', 'models.js');

// ============ 加载 models.js 中的工厂函数 ============

const vm = require('vm');
const modelsCode = fs.readFileSync(MODELS_FILE, 'utf-8');
const sandbox = { console, result: null };
vm.createContext(sandbox);
vm.runInContext(modelsCode + '\nresult = { createSystemProfile, createMenu, createAttribute, createDependency, MenuSource };', sandbox);
const { createSystemProfile, createMenu, createAttribute, createDependency, MenuSource } = sandbox.result;

// ============ 解析 Registry JSON → Profile ============

function parseRegistryJSON(json) {
    const entries = json.RegistryEntries || json;
    const supportedSys = (json.SupportedSystems || entries.SupportedSystems || [])[0] || {};

    const profile = createSystemProfile(
        supportedSys.ProductName || supportedSys.productName || json.Name || entries.Name || json.OwningEntity || '',
        supportedSys.SystemId || supportedSys.systemId || json.Id || entries.Id || '',
        supportedSys.FirmwareVersion || supportedSys.firmwareVersion || json.RegistryVersion || entries.RegistryVersion || ''
    );

    // 解析 Menus
    const menus = entries.Menus || json.Menus || json.menus || [];
    for (const m of menus) {
        const menu = createMenu(m);
        if (!menu.menuName) continue;
        profile.menuMap[menu.menuName] = menu;
    }

    // 解析 Attributes
    const attrs = entries.Attributes || json.Attributes || json.attributes || [];
    const attrMenuPaths = new Set();
    for (const a of attrs) {
        const attr = createAttribute(a);
        if (!attr.attributeName) continue;
        profile.attrMap[attr.attributeName] = attr;
        attrMenuPaths.add(attr.menuPath);
    }

    // 从属性路径自动推导菜单
    if (menus.length === 0 && attrMenuPaths.size > 0) {
        const existingPaths = new Set(Object.values(profile.menuMap).map(m => m.menuPath));
        for (const menuPath of attrMenuPaths) {
            if (existingPaths.has(menuPath)) continue;
            const parts = menuPath.replace('./', '').split('/').filter(Boolean);
            const lastName = parts[parts.length - 1] || menuPath;
            const menu = createMenu({
                MenuName: menuPath.replace(/[.\/]/g, '_').replace(/^_+/, ''),
                DisplayName: lastName,
                MenuPath: menuPath,
                source: MenuSource.Redfish
            });
            profile.menuMap[menu.menuName] = menu;
            existingPaths.add(menuPath);
        }
    }

    // 解析 Dependencies
    const deps = entries.Dependencies || json.Dependencies || json.dependencies || [];
    for (const dep of deps) {
        const depData = dep.Dependency || dep.dependency || {};
        const mapFrom = depData.MapFrom || depData.mapFrom || [];
        const dependencyFor = dep.DependencyFor || dep.dependencyFor;
        const mapToAttr = depData.MapToAttribute || depData.mapToAttribute || dependencyFor;
        const mapToProp = depData.MapToProperty || depData.mapToProperty;
        const mapToVal = depData.MapToValue ?? depData.mapToValue;
        const mapTerms = depData.MapTerms || depData.mapTerms || 'AND';
        const depType = dep.Type || dep.type;

        if (!dependencyFor || !mapToProp || !mapFrom.length) continue;

        for (const cond of mapFrom) {
            const d = createDependency({
                DependencyFor: dependencyFor,
                Type: depType,
                MapFromAttribute: cond.MapFromAttribute || cond.mapFromAttribute,
                MapFromProperty: cond.MapFromProperty || cond.mapFromProperty,
                MapFromCondition: cond.MapFromCondition || cond.mapFromCondition,
                MapFromValue: cond.MapFromValue ?? cond.mapFromValue,
                MapTerms: mapTerms,
                MapToAttribute: mapToAttr,
                MapToProperty: mapToProp,
                MapToValue: mapToVal
            });
            if (d.mapFromAttribute && d.dependencyFor) {
                profile.dependencies.push(d);
            }
        }
    }

    return profile;
}

// ============ 主函数 ============

function main() {
    // 读取 index
    let index = [];
    try {
        index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
    } catch (e) { /* 不存在就新建 */ }

    const files = fs.readdirSync(REGISTRY_DIR).filter(f => f.endsWith('.json'));
    console.log(`导入 ${files.length} 个 Registry 文件...\n`);

    let imported = 0;
    for (const file of files) {
        const registryPath = path.join(REGISTRY_DIR, file);
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));

        // 解析
        const profile = parseRegistryJSON(registry);

        // 用 productName 作为 systemId（安全化）
        const systemId = (profile.systemId || profile.productName || file.replace('.json', ''))
            .replace(/[^a-zA-Z0-9_\-]/g, '_')
            .substring(0, 64);

        profile.systemId = systemId;
        profile.id = systemId;

        // 写入 data/{systemId}.json
        const outPath = path.join(DATA_DIR, systemId + '.json');
        fs.writeFileSync(outPath, JSON.stringify(profile, null, 2), 'utf-8');

        // 更新 index
        const attrCount = Object.keys(profile.attrMap).length;
        const menuCount = Object.keys(profile.menuMap).length;
        const entry = {
            systemId: systemId,
            productName: profile.productName || systemId,
            firmwareVersion: profile.firmwareVersion || '',
            attrCount: attrCount,
            updatedAt: new Date().toISOString()
        };
        const existingIdx = index.findIndex(s => s.systemId === systemId);
        if (existingIdx >= 0) index[existingIdx] = entry;
        else index.push(entry);

        console.log(`  ✅ ${profile.productName.padEnd(30)} ${String(attrCount).padStart(4)} 属性  ${String(menuCount).padStart(3)} 菜单  → ${systemId}.json`);
        imported++;
    }

    // 写入 index
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
    console.log(`\n完成！已导入 ${imported} 个机型到 data/ 目录`);
}

main();
