/**
 * 导出功能 — 支持 Excel (.xlsx) 和 Registry JSON (.json)
 * 依赖: XLSX (CDN), formatAvailableValues (models.js)
 */

const Exporter = {

    /**
     * 导出实例模板 Excel (.xlsx)
     * 包含示例数据，供用户按格式填写后导入
     */
    exportTemplateExcel() {
        const wb = XLSX.utils.book_new();

        // Sheet 1: 菜单结构
        const menuHeader = ['菜单标识', '显示名称', '排序', '菜单元路径', '只读', '灰显', '隐藏'];
        const menuSamples = [
            ['Main', 'Main / BIOS Information', 1, './', '否', '否', '否'],
            ['SysProc', 'System / Processor', 2, './System/Processor', '否', '否', '否'],
            ['SysMem', 'System / Memory', 3, './System/Memory', '否', '否', '否'],
            ['Boot', 'Boot Configuration', 4, './Boot', '否', '否', '否'],
            ['Security', 'Security', 5, './Security', '否', '否', '否'],
            ['AdvCPU', 'Advanced / CPU Configuration', 6, './Advanced/CPU', '否', '否', '否'],
            ['Custom', 'Custom Settings', 7, './Custom', '否', '否', '否'],
        ];
        const menuWs = XLSX.utils.aoa_to_sheet([menuHeader, ...menuSamples]);
        menuWs['!cols'] = menuHeader.map(() => ({ wch: 25 }));
        XLSX.utils.book_append_sheet(wb, menuWs, '菜单结构');

        // Sheet 2: BIOS选项 (主表)
        const attrHeader = ['菜单路径', '属性标识', '显示名称', '中文名称', '默认值', '可选值', '适用客户', '支持Redfish', '平台', '说明'];
        const attrSamples = [
            ['./System/Processor', 'IntelHyperThreading', 'Intel Hyper-Threading Technology', 'Intel 超线程技术', 'Enabled', 'Enabled, Disabled', '通用', '是', '', '启用后每个物理核心可同时运行两个逻辑线程'],
            ['./System/Processor', 'ActiveCores', 'Active Processor Cores', '活动处理器核心数', '0', '0 ~ 56 (步进: 1)', '通用', '是', '', '启用核心数，0=全部'],
            ['./System/Processor', 'IntelVT', 'Intel Virtualization Technology', 'Intel 虚拟化技术', 'Enabled', 'Enabled, Disabled', '通用', '是', '', '启用Intel VT-x硬件虚拟化'],
            ['./System/Memory', 'MemSpeed', 'Memory Speed', '内存速率', 'Auto', 'Auto, 4800, 4400, 4000', '通用', '是', '', '设置内存总线速率'],
            ['./System/Memory', 'MemMirrorMode', 'Memory Mirror Mode', '内存镜像模式', 'Disabled', 'Disabled, Enabled, Spare', '通用', '是', '', '内存镜像容错模式，容量减半'],
            ['./Boot', 'BootMode', 'Boot Mode', '启动模式', 'Uefi', 'UEFI Boot Mode, Legacy BIOS Mode', '通用', '是', '', 'UEFI支持GPT和Secure Boot'],
            ['./Security', 'SecureBoot', 'Secure Boot', '安全启动', 'Disabled', 'Enabled, Disabled', '通用', '是', '', '仅允许签名引导程序'],
            ['./Security', 'AdminPassword', 'Administrator Password', '管理员密码', '', '长度: 8 ~ 32', '通用', '是', '', 'BIOS管理员密码，输入即设置'],
            ['./Custom', 'OemFeature', 'OEM Custom Feature', 'OEM自定义特性', 'Disabled', 'Enabled, Disabled', '字节', '否', '2288H V7', '厂商自定义特性说明'],
            ['./Custom', 'OemDebugLevel', 'OEM Debug Level', 'OEM调试级别', '100', '0 ~ 255 (步进: 1)', '字节', '否', '2288H V7', '厂商调试级别设置'],
        ];
        const attrWs = XLSX.utils.aoa_to_sheet([attrHeader, ...attrSamples]);
        attrWs['!cols'] = attrHeader.map((_, i) => {
            if (i === 0) return { wch: 28 };
            if (i === 9) return { wch: 50 };
            return { wch: 22 };
        });
        XLSX.utils.book_append_sheet(wb, attrWs, 'BIOS选项');

        // Sheet 3: 依赖关系
        const depHeader = ['DependencyFor', 'Type', 'MapFromAttribute', 'MapFromProperty', 'MapFromCondition', 'MapFromValue', 'MapTerms', 'MapToAttribute', 'MapToProperty', 'MapToValue'];
        const depSamples = [
            ['SecureBoot', 'Map', 'BootMode', 'CurrentValue', 'EQU', 'LegacyBios', 'AND', 'SecureBoot', 'GrayOut', true],
            ['SriovEnabled', 'Map', 'IntelVTd', 'CurrentValue', 'EQU', 'Disabled', 'AND', 'SriovEnabled', 'GrayOut', true],
        ];
        const depWs = XLSX.utils.aoa_to_sheet([depHeader, ...depSamples]);
        depWs['!cols'] = depHeader.map(() => ({ wch: 20 }));
        XLSX.utils.book_append_sheet(wb, depWs, '依赖关系');

        // Sheet 4: 支持系统
        const sysHeader = ['ProductName', 'SystemId', 'FirmwareVersion'];
        const sysSamples = [['FusionServer 2288H V7', '2288HV7', 'iBMC V678 v3.21']];
        const sysWs = XLSX.utils.aoa_to_sheet([sysHeader, ...sysSamples]);
        sysWs['!cols'] = sysHeader.map(() => ({ wch: 30 }));
        XLSX.utils.book_append_sheet(wb, sysWs, '支持系统');

        XLSX.writeFile(wb, 'BIOS选项导入模板.xlsx');
    },

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
                '适用客户': attr.attributeScope || '通用',
                '支持Redfish': attr.supportsRedfish ? '是' : '否',
                '支持Unicfg': attr.supportsUnicfg ? '是' : '否',
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
                SupportsUnicfg: !!attr.supportsUnicfg,
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
