/**
 * 导出功能 — 支持 Excel (.xlsx) 和 Registry JSON (.json)
 * 依赖: XLSX (CDN), formatAvailableValues (models.js)
 */

const Exporter = {

    /**
     * 导出为 Excel (.xlsx)
     */
    exportToExcel(profile) {
        const wb = XLSX.utils.book_new();

        // Sheet 1: Menus
        const menuData = this.buildMenuSheet(profile);
        const menuWs = XLSX.utils.json_to_sheet(menuData);
        XLSX.utils.book_append_sheet(wb, menuWs, 'Menus');

        // Sheet 2: Attributes
        const attrData = this.buildAttributeSheet(profile);
        const attrWs = XLSX.utils.json_to_sheet(attrData);
        XLSX.utils.book_append_sheet(wb, attrWs, 'Attributes');

        // Sheet 3: Dependencies
        const depData = this.buildDependencySheet(profile);
        const depWs = XLSX.utils.json_to_sheet(depData);
        XLSX.utils.book_append_sheet(wb, depWs, 'Dependencies');

        // Sheet 4: SupportedSystems
        const sysData = [{
            'ProductName': profile.productName || '',
            'SystemId': profile.systemId || '',
            'FirmwareVersion': profile.firmwareVersion || ''
        }];
        const sysWs = XLSX.utils.json_to_sheet(sysData);
        XLSX.utils.book_append_sheet(wb, sysWs, 'SupportedSystems');

        XLSX.writeFile(wb, (profile.productName || 'bios_options') + '.xlsx');
    },

    /**
     * 导出为 Redfish AttributeRegistry JSON (.json)
     * 符合 DMTF DSP8010 v1.3.0 规范
     */
    exportToRegistryJSON(profile) {
        const registry = {
            '@Redfish.Copyright': 'Exported from BIOS Manager',
            '@odata.type': '#AttributeRegistry.v1_3_0.AttributeRegistry',
            Id: profile.systemId || 'BiosAttributeRegistry',
            Name: 'BIOS Attribute Registry',
            Description: 'This registry defines a representation of BIOS attributes',
            Language: 'en',
            RegistryVersion: '1.0.0',
            Owner: profile.productName || '',
            SupportedSystems: [{
                ProductName: profile.productName || '',
                SystemId: profile.systemId || '',
                FirmwareVersion: profile.firmwareVersion || ''
            }],
            Menus: this.buildMenuRegistry(profile),
            Attributes: this.buildAttributeRegistry(profile),
            Dependencies: this.buildDependencyRegistry(profile)
        };

        const json = JSON.stringify(registry, (k, v) => {
            if (k === 'parent' || k === 'children' || k === 'depth') return undefined;
            return v;
        }, 2);

        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (profile.systemId || 'bios') + '_registry.json';
        a.click();
        URL.revokeObjectURL(url);
    },

    /* ============ Excel Sheet 构建 ============ */

    buildMenuSheet(profile) {
        const rows = [];
        for (const menu of Object.values(profile.menuMap)) {
            rows.push({
                'MenuName': menu.menuName,
                'DisplayName': menu.displayName,
                'DisplayOrder': menu.displayOrder,
                'MenuPath': menu.menuPath,
                'ReadOnly': menu.readOnly,
                'GrayOut': menu.grayOut,
                'Hidden': menu.hidden
            });
        }
        rows.sort((a, b) => (a.MenuPath || '').localeCompare(b.MenuPath || '') ||
            (a.DisplayOrder || 0) - (b.DisplayOrder || 0));
        return rows;
    },

    buildAttributeSheet(profile) {
        const rows = [];
        for (const attr of Object.values(profile.attrMap)) {
            // 枚举值保留中文显示名
            let valueStr = '';
            if (attr.type === 'Enumeration' && attr.value && attr.value.length > 0) {
                valueStr = attr.value.map(v => {
                    const name = v.valueName || v.ValueName || '';
                    const disp = v.valueDisplayName || v.ValueDisplayName || '';
                    return disp && disp !== name ? (name + '(' + disp + ')') : name;
                }).join(', ');
            }

            let descStr = (attr.helpText || '') + (attr.helpText && attr.helpTextZh ? '\n' : '') + (attr.helpTextZh || '');

            rows.push({
                '菜单路径': attr.menuPath || '',
                '属性标识': attr.attributeName,
                '显示名称': attr.displayName || '',
                '中文名称': attr.displayNameZh || '',
                '默认值': attr.defaultValue !== null ? attr.defaultValue : '',
                '可选值': attr.type !== 'Enumeration' ? formatAvailableValues(attr) : valueStr,
                '来源': attr.attributeScope || '通用',
                '支持Redfish': attr.supportsRedfish ? '是' : '否',
                '平台': (attr.platforms || []).join(', ') || '全部',
                '说明': descStr
            });
        }
        rows.sort((a, b) => (a['菜单路径'] || '').localeCompare(b['菜单路径'] || ''));
        return rows;
    },

    buildDependencySheet(profile) {
        const rows = [];
        for (const dep of profile.dependencies) {
            rows.push({
                'DependencyFor': dep.dependencyFor,
                'Type': dep.type,
                'MapFromAttribute': dep.mapFromAttribute,
                'MapFromProperty': dep.mapFromProperty,
                'MapFromCondition': dep.mapFromCondition,
                'MapFromValue': dep.mapFromValue,
                'MapTerms': dep.mapTerms || 'AND',
                'MapToAttribute': dep.mapToAttribute || dep.dependencyFor,
                'MapToProperty': dep.mapToProperty,
                'MapToValue': dep.mapToValue
            });
        }
        return rows;
    },

    /* ============ Registry JSON 构建 ============ */

    buildMenuRegistry(profile) {
        const menus = [];
        for (const menu of Object.values(profile.menuMap)) {
            if (menu.menuName && menu.menuName.startsWith('__auto_')) continue; // 跳过虚拟节点
            menus.push({
                MenuName: menu.menuName,
                DisplayName: menu.displayName || menu.menuName,
                DisplayOrder: menu.displayOrder || 0,
                MenuPath: menu.menuPath || '',
                ReadOnly: !!menu.readOnly,
                GrayOut: !!menu.grayOut,
                Hidden: !!menu.hidden
            });
        }
        menus.sort((a, b) => (a.MenuPath || '').localeCompare(b.MenuPath || '') ||
            (a.DisplayOrder || 0) - (b.DisplayOrder || 0));
        return menus;
    },

    buildAttributeRegistry(profile) {
        const attrs = [];
        for (const attr of Object.values(profile.attrMap)) {
            const entry = {
                AttributeName: attr.attributeName,
                DisplayName: attr.displayName || attr.attributeName,
                DisplayOrder: attr.displayOrder || 0,
                Type: attr.type,
                DefaultValue: attr.defaultValue,
                ReadOnly: !!attr.readOnly,
                Immutable: !!attr.immutable,
                ResetRequired: !!attr.resetRequired,
                SupportsRedfish: !!attr.supportsRedfish,
                AttributeScope: attr.attributeScope || 'Standard',
                MenuPath: attr.menuPath || '',
                HelpText: attr.helpText || '',
                WarningText: attr.warningText || ''
            };

            if (attr.platforms && attr.platforms.length > 0) {
                entry.Platforms = attr.platforms;
            }

            // 类型约束
            if (attr.type === 'Enumeration' && attr.value && attr.value.length > 0) {
                entry.Value = attr.value.map(v => ({
                    ValueName: v.valueName || v.ValueName,
                    ValueDisplayName: v.valueDisplayName || v.ValueDisplayName || v.valueName || v.ValueName
                }));
            } else if (attr.type === 'Integer') {
                entry.LowerBound = attr.lowerBound;
                entry.UpperBound = attr.upperBound;
                entry.ScalarIncrement = attr.scalarIncrement;
            } else if (attr.type === 'String' || attr.type === 'Password') {
                entry.MinLength = attr.minLength;
                entry.MaxLength = attr.maxLength;
                if (attr.valueExpression) entry.ValueExpression = attr.valueExpression;
            }

            attrs.push(entry);
        }
        attrs.sort((a, b) => (a.MenuPath || '').localeCompare(b.MenuPath || '') ||
            (a.DisplayOrder || 0) - (b.DisplayOrder || 0));
        return attrs;
    },

    buildDependencyRegistry(profile) {
        // 按 DependencyFor 分组合并 MapFrom 数组
        const grouped = {};
        for (const dep of profile.dependencies) {
            if (!dep.dependencyFor || !dep.mapFromAttribute) continue;
            const key = dep.dependencyFor + '|' + (dep.mapToAttribute || dep.dependencyFor) +
                '|' + (dep.mapToProperty || '') + '|' + (dep.mapToValue ?? '');
            if (!grouped[key]) {
                grouped[key] = {
                    DependencyFor: dep.dependencyFor,
                    Type: dep.type || 'Map',
                    Dependency: {
                        MapFrom: [],
                        MapTerms: dep.mapTerms || 'AND',
                        MapToAttribute: dep.mapToAttribute || dep.dependencyFor,
                        MapToProperty: dep.mapToProperty,
                        MapToValue: dep.mapToValue
                    }
                };
            }
            grouped[key].Dependency.MapFrom.push({
                MapFromAttribute: dep.mapFromAttribute,
                MapFromProperty: dep.mapFromProperty || 'CurrentValue',
                MapFromCondition: dep.mapFromCondition || 'EQU',
                MapFromValue: dep.mapFromValue
            });
        }
        return Object.values(grouped);
    }
};
