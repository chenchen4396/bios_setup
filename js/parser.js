/**
 * 多格式解析器 - 支持 Registry JSON (.json/.json.gz) 和 Excel (.xlsx)
 */

const Parser = {

    /**
     * 自动识别格式并解析
     * @param {File} file
     * @returns {Promise<Object>} SystemProfile
     */
    async parseFile(file) {
        const name = file.name.toLowerCase();

        if (name.endsWith('.json') || name.endsWith('.json.gz')) {
            return this.parseRegistryFile(file);
        }
        if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
            return this.parseExcelFile(file);
        }
        throw new Error('不支持的文件格式: ' + file.name + '，请使用 .json / .json.gz / .xlsx');
    },

    /* ============ Registry JSON 解析 ============ */

    async parseRegistryFile(file) {
        let text;
        if (file.name.toLowerCase().endsWith('.gz')) {
            const buf = await file.arrayBuffer();
            const inflated = pako.inflate(new Uint8Array(buf), { to: 'string' });
            text = inflated;
        } else {
            text = await file.text();
        }

        // 解析 JSON — BMC 导出的 JSON 可能含字符串内未转义的控制字符
        let json;
        try {
            json = JSON.parse(text);
        } catch (e) {
            // 修复: 将 JSON 字符串内的裸控制字符替换为空格
            const cleaned = cleanJsonControlChars(text);
            json = JSON.parse(cleaned);
        }
        return this.parseRegistryJSON(json);
    },

    /** @param {Object} json - Registry JSON (支持两种格式) */
    parseRegistryJSON(json) {
        const errors = [];

        // === 格式兼容 ===
        // 格式 A: { SupportedSystems, Menus, Attributes, Dependencies }  — 旧版/自行导出
        // 格式 B: { RegistryEntries: { Attributes, Menus?, Dependencies? } }  — BMC 标准导出
        const entries = json.RegistryEntries || json;
        const supportedSys = (json.SupportedSystems || entries.SupportedSystems || [])[0] || {};

        const profile = createSystemProfile(
            supportedSys.ProductName || supportedSys.productName || json.Name || entries.Name || json.OwningEntity || '',
            supportedSys.SystemId || supportedSys.systemId || json.Id || entries.Id || '',
            supportedSys.FirmwareVersion || supportedSys.firmwareVersion || json.RegistryVersion || entries.RegistryVersion || ''
        );

        // 解析 Menus (格式 A/B)
        const menus = entries.Menus || json.Menus || json.menus || [];
        for (const m of menus) {
            const menu = createMenu(m);
            if (!menu.menuName) {
                errors.push('菜单缺少 MenuName，已跳过');
                continue;
            }
            profile.menuMap[menu.menuName] = menu;
        }

        // 解析 Attributes (格式 A/B)
        const attrs = entries.Attributes || json.Attributes || json.attributes || [];
        const attrMenuPaths = new Set();
        for (const a of attrs) {
            const attr = createAttribute(a);
            if (!attr.attributeName) {
                errors.push('属性缺少 AttributeName，已跳过');
                continue;
            }
            attr.displayNameZh = '';
            attr.helpTextZh = '';
            profile.attrMap[attr.attributeName] = attr;
            attrMenuPaths.add(attr.menuPath);
        }

        // 如果没有显式定义菜单，从属性路径自动推导
        if (menus.length === 0 && attrMenuPaths.size > 0) {
            const existingPaths = new Set(Object.values(profile.menuMap).map(m => m.menuPath));
            for (const path of attrMenuPaths) {
                if (existingPaths.has(path)) continue;
                const parts = path.replace('./', '').split('/').filter(Boolean);
                const lastName = parts[parts.length - 1] || path;
                const menu = createMenu({
                    MenuName: path.replace(/[.\/]/g, '_').replace(/^_+/, ''),
                    DisplayName: lastName,
                    MenuPath: path,
                    source: MenuSource.Redfish
                });
                profile.menuMap[menu.menuName] = menu;
                existingPaths.add(path);
            }
        }

        // 解析 Dependencies (格式 A/B)
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

            if (!dependencyFor || !mapToProp) continue;
            if (!mapFrom.length) continue;

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

        profile.importErrors = errors;
        return profile;
    },

    /* ============ Excel 解析 ============ */

    async parseExcelFile(file) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        return this.parseExcelWorkbook(workbook, file);
    },

    /**
     * @param {Object} workbook - SheetJS Workbook
     * @param {File} [file] - 原始文件对象（可选，用于推断机型名）
     */
    parseExcelWorkbook(workbook, file) {
        const errors = [];

        // 识别 Sheet
        const menuSheet = this.findSheet(workbook, ['Menus', '菜单', 'Menu']);
        const attrSheet = this.findSheet(workbook, ['Attributes', '属性', 'Attribute', 'BIOS选项']);
        const depSheet = this.findSheet(workbook, ['Dependencies', '依赖', 'Dependency', '依赖关系']);
        const sysSheet = this.findSheet(workbook, ['SupportedSystems', '支持系统', 'Supported Systems']);

        if (!attrSheet) {
            throw new Error('未找到 Attributes / BIOS选项 Sheet，请检查 Excel 格式');
        }

        // 解析 SupportedSystems
        let productName = '', systemId = '', firmwareVersion = '';
        if (sysSheet) {
            const sysRows = XLSX.utils.sheet_to_json(sysSheet, { defval: '' });
            if (sysRows.length > 0) {
                const s = sysRows[0];
                productName = s['ProductName'] || s['产品名称'] || s['productName'] || '';
                systemId = s['SystemId'] || s['系统ID'] || s['systemId'] || '';
                firmwareVersion = s['FirmwareVersion'] || s['固件版本'] || s['firmwareVersion'] || '';
            }
        }

        // 从属性数据中尝试提取系统信息
        if (!systemId) {
            // systemId 缺失时，后续从文件名推断
        }

        const profile = createSystemProfile(productName, systemId || 'unknown', firmwareVersion);

        // 解析 Menus
        if (menuSheet) {
            const menuRows = XLSX.utils.sheet_to_json(menuSheet, { defval: '' });
            for (const row of menuRows) {
                const menuName = this.getCell(row, ['MenuName', '菜单标识', 'menuName']);
                if (!menuName) continue;
                const menu = createMenu({
                    MenuName: menuName,
                    DisplayName: this.getCell(row, ['DisplayName', '显示名称', 'displayName']),
                    DisplayOrder: this.getCell(row, ['DisplayOrder', '排序', 'displayOrder']),
                    MenuPath: this.getCell(row, ['MenuPath', '菜单元路径', 'menuPath']),
                    ReadOnly: this.getCell(row, ['ReadOnly', '只读', 'readOnly']),
                    GrayOut: this.getCell(row, ['GrayOut', '灰显', 'grayOut']),
                    Hidden: this.getCell(row, ['Hidden', '隐藏', 'hidden'])
                });
                profile.menuMap[menu.menuName] = menu;
            }
        }

        // 解析 Attributes
        const attrRows = XLSX.utils.sheet_to_json(attrSheet, { defval: '' });
        for (const row of attrRows) {
            const attrName = this.getCell(row, [
                'AttributeName', '属性标识', 'attributeName',
                'B' // 如果第一列是菜单路径，则第二列是属性标识
            ]);
            if (!attrName) continue;

            // 尝试各种列名映射
            const rawAttr = {
                AttributeName: attrName,
                Type: this.getCell(row, ['Type', '类型', 'type']),
                DefaultValue: this.getCell(row, ['DefaultValue', '默认值', 'defaultValue', 'E']),
                DisplayName: this.getCell(row, ['DisplayName', '显示名称', 'displayName', 'C']),
                displayNameZh: this.getCell(row, ['中文名称', '中文显示名称', 'displayNameZh', 'D']) || '',
                HelpText: this.getCell(row, ['HelpText', '说明', 'helpText', 'G']),
                helpTextZh: this.getCell(row, ['中文说明', 'helpTextZh', 'H']) || '',
                WarningText: this.getCell(row, ['WarningText', '警告信息', 'warningText']),
                MenuPath: this.getCell(row, ['MenuPath', '菜单元路径', 'menuPath', 'A']),
                DisplayOrder: this.getCell(row, ['DisplayOrder', '显示顺序', 'displayOrder', 'N']),
                ReadOnly: this.getCell(row, ['ReadOnly', '只读', 'readOnly', 'J']),
                GrayOut: this.getCell(row, ['GrayOut', '灰显', 'grayOut']),
                Hidden: this.getCell(row, ['Hidden', '隐藏', 'hidden']),
                Immutable: this.getCell(row, ['Immutable', '不可变', 'immutable']),
                ResetRequired: this.getCell(row, ['ResetRequired', '需重启', 'resetRequired']),
                AttributeScope: this.getCell(row, ['AttributeScope', '来源', 'attributeScope', 'I']),
                SupportsRedfish: this.getCell(row, ['SupportsRedfish', '支持Redfish', 'supportsRedfish']),
                SupportsUnicfg: this.getCell(row, ['SupportsUnicfg', '支持Unicfg', 'supportsUnicfg']),
                Platforms: this.getCell(row, ['Platforms', '适用平台', 'platforms', 'K']),
                Value: this.getCell(row, ['Value', '可选值', 'value', 'F']),
                LowerBound: this.getCell(row, ['LowerBound', '数值下限', 'lowerBound']),
                UpperBound: this.getCell(row, ['UpperBound', '数值上限', 'upperBound']),
                ScalarIncrement: this.getCell(row, ['ScalarIncrement', '步进值', 'scalarIncrement']),
                MinLength: this.getCell(row, ['MinLength', '最小长度', 'minLength']),
                MaxLength: this.getCell(row, ['MaxLength', '最大长度', 'maxLength']),
                ValueExpression: this.getCell(row, ['ValueExpression', '正则校验', 'valueExpression']),
                UefiKeywordName: this.getCell(row, ['UefiKeywordName', 'UEFI变量', 'uefiKeywordName', 'L']),
                UefiNamespaceId: this.getCell(row, ['UefiNamespaceId', 'uefiNamespaceId'])
            };

            // 如果 Value 列包含逗号分隔的普通字符串而非 JSON，需要特殊处理
            if (rawAttr.Value && typeof rawAttr.Value === 'string') {
                const v = rawAttr.Value.trim();
                // 如果看起来像是枚举值的逗号分隔列表（不是 JSON，不带花括号）
                // 类型如果无法从列中获取，则从可选值推断
                if (rawAttr.Type === 'Enum' || rawAttr.Type === '枚举' || rawAttr.Type === 'Enumeration') {
                    rawAttr.Type = 'Enumeration';
                }
                if (!rawAttr.Type || rawAttr.Type === '') {
                    // 根据 Value 列推断类型
                    if (v.startsWith('[') || v.startsWith('{')) {
                        rawAttr.Type = 'Enumeration';
                    } else if (v === '是 / 否' || v === 'True / False') {
                        rawAttr.Type = 'Boolean';
                    } else if (/^\d+ ~ \d+/.test(v)) {
                        rawAttr.Type = 'Integer';
                    } else if (/^长度:/.test(v)) {
                        rawAttr.Type = 'String';
                    } else if (v.indexOf(',') > -1) {
                        rawAttr.Type = 'Enumeration';
                    }
                }
            }

            // 映射类型
            const typeMap = {
                'Enum': 'Enumeration', '枚举': 'Enumeration', 'Enumeration': 'Enumeration',
                'String': 'String', '字符串': 'String',
                'Integer': 'Integer', '整数': 'Integer', 'Int': 'Integer',
                'Boolean': 'Boolean', '布尔': 'Boolean', 'Bool': 'Boolean',
                'Password': 'Password', '密码': 'Password', 'Pwd': 'Password'
            };
            rawAttr.Type = typeMap[rawAttr.Type] || rawAttr.Type || 'Enumeration';

            // 映射来源（Excel导入：Standard→通用, Custom→定制，其他保持原文）
            if (!rawAttr.AttributeScope || rawAttr.AttributeScope === 'Standard') {
                rawAttr.AttributeScope = '通用';
            } else if (rawAttr.AttributeScope === 'Custom') {
                rawAttr.AttributeScope = '定制';
            }
            // 否则保留原始文本（如"字节"、"百度"等客户名）

            // 支持Redfish默认 true（Excel 导入时若无此列，默认支持）
            if (rawAttr.SupportsRedfish === undefined || rawAttr.SupportsRedfish === null || rawAttr.SupportsRedfish === '') {
                rawAttr.SupportsRedfish = true;
            }

            const attr = createAttribute(rawAttr);
            if (attr.attributeName) {
                profile.attrMap[attr.attributeName] = attr;
            }
        }

        // 解析 Dependencies
        if (depSheet) {
            const depRows = XLSX.utils.sheet_to_json(depSheet, { defval: '' });
            for (const row of depRows) {
                const d = createDependency({
                    DependencyFor: this.getCell(row, ['DependencyFor', '受影响属性', 'dependencyFor']),
                    Type: this.getCell(row, ['Type', '类型', 'type']),
                    MapFromAttribute: this.getCell(row, ['MapFromAttribute', '源属性', 'mapFromAttribute']),
                    MapFromProperty: this.getCell(row, ['MapFromProperty', '源字段', 'mapFromProperty']),
                    MapFromCondition: this.getCell(row, ['MapFromCondition', '条件', 'mapFromCondition']),
                    MapFromValue: this.getCell(row, ['MapFromValue', '比较值', 'mapFromValue']),
                    MapTerms: this.getCell(row, ['MapTerms', '连接词', 'mapTerms']),
                    MapToAttribute: this.getCell(row, ['MapToAttribute', '目标属性', 'mapToAttribute']),
                    MapToProperty: this.getCell(row, ['MapToProperty', '目标字段', 'mapToProperty']),
                    MapToValue: this.getCell(row, ['MapToValue', '目标值', 'mapToValue'])
                });
                if (d.dependencyFor && d.mapFromAttribute && d.mapToProperty) {
                    profile.dependencies.push(d);
                }
            }
        }

        // 如果还没有系统信息，从属性数据推测
        if (!profile.systemId || profile.systemId === 'unknown') {
            profile.systemId = 'system_' + Date.now();
            profile.id = profile.systemId;
            profile.productName = (file && file.name) ? file.name.replace(/\.(xlsx|xls)$/i, '') : '未知机型';
        }

        profile.importErrors = errors;
        return profile;
    },

    /* ============ 工具方法 ============ */

    /** 从可能的键名中获取值 */
    getCell(row, keys) {
        for (const key of keys) {
            if (row[key] !== undefined && row[key] !== '') return row[key];
        }
        return '';
    },

    /** 在 Workbook 中按可能的名称查找 Sheet */
    findSheet(workbook, possibleNames) {
        const sheetNames = workbook.SheetNames;
        for (const name of possibleNames) {
            const lower = name.toLowerCase();
            for (const sn of sheetNames) {
                if (sn.toLowerCase() === lower || sn.toLowerCase().includes(lower)) {
                    return workbook.Sheets[sn];
                }
            }
        }
        // 尝试模糊匹配
        for (const sn of sheetNames) {
            for (const name of possibleNames) {
                if (sn.toLowerCase().includes(name.toLowerCase())) {
                    return workbook.Sheets[sn];
                }
            }
        }
        return null;
    }
};

/**
 * 清理 JSON 字符串中的未转义控制字符
 * BMC 导出的 registry JSON 中，HelpText 等字段可能含有未转义的换行符
 * 此函数扫描 JSON 文本，将字符串内的控制字符替换为空格
 */
function cleanJsonControlChars(text) {
    let result = '';
    let inString = false;
    let escape = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const code = text.charCodeAt(i);

        if (escape) {
            result += ch;
            escape = false;
            continue;
        }

        if (ch === '\\' && inString) {
            escape = true;
            result += ch;
            continue;
        }

        if (ch === '"') {
            inString = !inString;
            result += ch;
            continue;
        }

        // 字符串内遇到控制字符（\t 除外），替换为空格
        if (inString && code < 0x20 && code !== 0x09) {
            result += ' ';
            continue;
        }

        result += ch;
    }

    return result;
}
