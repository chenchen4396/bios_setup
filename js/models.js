/**
 * Redfish BIOS 数据模型
 * 符合 DMTF DSP8010 AttributeRegistry v1_3_0 规范
 */

const AttrType = {
    Enumeration: 'Enumeration',
    String: 'String',
    Integer: 'Integer',
    Boolean: 'Boolean',
    Password: 'Password'
};

const AttrScope = {
    Standard: '通用',
    // Custom is free text now — stores customer name like "字节", "百度" etc.
};

const MenuSource = {
    Redfish: 'Redfish',
    Manual: 'Manual'
};

/**
 * @param {string} productName
 * @param {string} systemId
 * @param {string} firmwareVersion
 * @returns {SystemProfile}
 */
function createSystemProfile(productName, systemId, firmwareVersion) {
    return {
        id: systemId,
        productName: productName || '',
        systemId: systemId || '',
        firmwareVersion: firmwareVersion || '',
        importTimestamp: new Date().toISOString(),
        menuMap: {},
        attrMap: {},
        dependencies: [],
        importErrors: []
    };
}

/**
 * @param {Object} raw - 原始数据
 * @returns {Object} Attribute 对象
 */
function createAttribute(raw) {
    const attr = {
        attributeName: raw.AttributeName || raw.attributeName || '',
        type: raw.Type || raw.type || 'Enumeration',
        currentValue: raw.CurrentValue ?? raw.currentValue ?? null,
        defaultValue: raw.DefaultValue ?? raw.defaultValue ?? null,
        modifiedValue: null,
        attributeScope: raw.AttributeScope || raw.attributeScope || AttrScope.Standard,
        platforms: parsePlatforms(raw.Platforms || raw.platforms),
        supportsRedfish: toBool(raw.SupportsRedfish ?? raw.supportsRedfish ?? raw.sr, true), // 是否支持Redfish管理（Registry JSON默认为true）
        supportsUnicfg: toBool(raw.SupportsUnicfg ?? raw.supportsUnicfg, false), // 是否支持Unicfg
        displayName: raw.DisplayName || raw.displayName || '',
        displayNameZh: raw.displayNameZh || '',    // 中文显示名称 (Excel专属)
        helpText: raw.HelpText || raw.helpText || '',
        helpTextZh: raw.helpTextZh || '',           // 中文帮助说明 (Excel专属)
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
        uefiKeywordName: raw.UefiKeywordName || raw.uefiKeywordName || null,
        uefiNamespaceId: raw.UefiNamespaceId || raw.uefiNamespaceId || null,

        depHidden: false,
        depGrayedOut: false,
        depReadOnly: false
    };

    // 确保数字约束是数字类型
    if (attr.lowerBound !== null) attr.lowerBound = Number(attr.lowerBound);
    if (attr.upperBound !== null) attr.upperBound = Number(attr.upperBound);
    if (attr.scalarIncrement !== null) attr.scalarIncrement = Number(attr.scalarIncrement);
    if (attr.minLength !== null) attr.minLength = Number(attr.minLength);
    if (attr.maxLength !== null) attr.maxLength = Number(attr.maxLength);

    return attr;
}

/**
 * @param {Object} raw
 * @returns {Object} Menu 对象
 */
function createMenu(raw) {
    return {
        menuName: raw.MenuName || raw.menuName || '',
        displayName: raw.DisplayName || raw.displayName || '',
        displayNameZh: raw.displayNameZh || '',
        displayOrder: parseInt(raw.DisplayOrder || raw.displayOrder) || 0,
        menuPath: raw.MenuPath || raw.menuPath || './',
        readOnly: toBool(raw.ReadOnly ?? raw.readOnly),
        grayOut: toBool(raw.GrayOut ?? raw.grayOut),
        hidden: toBool(raw.Hidden ?? raw.hidden),
        source: raw.source || raw.Source || MenuSource.Redfish, // Redfish 或 Manual
        parent: null,
        children: [],
        depth: 0
    };
}

/**
 * @param {Object} raw
 * @returns {Object} Dependency 对象
 */
function createDependency(raw) {
    return {
        dependencyFor: raw.DependencyFor || raw.dependencyFor || '',
        type: raw.Type || raw.type || 'Map',
        mapFromAttribute: raw.MapFromAttribute || raw.mapFromAttribute || '',
        mapFromProperty: raw.MapFromProperty || raw.mapFromProperty || 'CurrentValue',
        mapFromCondition: raw.MapFromCondition || raw.mapFromCondition || 'EQU',
        mapFromValue: String(raw.MapFromValue ?? raw.mapFromValue ?? ''),
        mapTerms: raw.MapTerms || raw.mapTerms || 'AND',
        mapToAttribute: raw.MapToAttribute || raw.mapToAttribute || '',
        mapToProperty: raw.MapToProperty || raw.mapToProperty || '',
        mapToValue: raw.MapToValue ?? raw.mapToValue ?? ''
    };
}

/* ==================== 计算属性 ==================== */

function isEffectivelyHidden(attr) {
    return attr.hidden || attr.depHidden;
}

function isEffectivelyGrayedOut(attr) {
    return !isEffectivelyHidden(attr) && (attr.grayOut || attr.depGrayedOut);
}

function isEffectivelyReadOnly(attr) {
    return !isEffectivelyHidden(attr) && !isEffectivelyGrayedOut(attr) && (attr.readOnly || attr.depReadOnly);
}

function isEffectivelyDisabled(attr) {
    return attr.immutable || isEffectivelyHidden(attr) || isEffectivelyGrayedOut(attr);
}

function getEffectiveValue(attr) {
    if (attr.modifiedValue !== null) return attr.modifiedValue;
    if (attr.currentValue !== null && attr.currentValue !== undefined) return attr.currentValue;
    return attr.defaultValue;
}

function hasPendingChanges(attr) {
    return attr.modifiedValue !== null && attr.modifiedValue !== attr.currentValue && attr.modifiedValue !== attr.defaultValue;
}

/* ==================== 可选值格式化 ==================== */

function formatAvailableValues(attr) {
    switch (attr.type) {
        case AttrType.Enumeration:
            if (attr.value && attr.value.length > 0) {
                return attr.value.map(v => v.valueName || v.ValueName || v).join(', ');
            }
            return '';
        case AttrType.Integer:
            if (attr.lowerBound !== null && attr.upperBound !== null) {
                let s = attr.lowerBound + ' ~ ' + attr.upperBound;
                if (attr.scalarIncrement !== null && attr.scalarIncrement > 1) {
                    s += ' (步进: ' + attr.scalarIncrement + ')';
                }
                return s;
            }
            return '';
        case AttrType.String:
            if (attr.minLength !== null || attr.maxLength !== null) {
                const min = attr.minLength ?? 0;
                const max = attr.maxLength ?? '∞';
                return '长度: ' + min + ' ~ ' + max;
            }
            return '';
        case AttrType.Password:
            if (attr.minLength !== null || attr.maxLength !== null) {
                const min = attr.minLength ?? 0;
                const max = attr.maxLength ?? '∞';
                return '长度: ' + min + ' ~ ' + max;
            }
            return '';
        case AttrType.Boolean:
            return '是 / 否';
        default:
            return '';
    }
}

/* ==================== 工具函数 ==================== */

function toBool(val, defaultVal) {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
        if (val === '') return defaultVal !== undefined ? defaultVal : false;
        return val.toLowerCase() === 'true' || val === '1' || val === '是' || val === 'yes';
    }
    if (typeof val === 'number') return val !== 0;
    if (val === null || val === undefined) return defaultVal !== undefined ? defaultVal : false;
    return defaultVal !== undefined ? defaultVal : false;
}

function parsePlatforms(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(String).filter(Boolean);
    return String(val).split(/[,;，；]/).map(s => s.trim()).filter(Boolean);
}

function parseValueList(val) {
    if (!val) return [];
    if (Array.isArray(val)) {
        return val.map(v => {
            if (typeof v === 'object') return { valueName: v.ValueName || v.valueName || '', valueDisplayName: v.ValueDisplayName || v.valueDisplayName || '' };
            return { valueName: String(v), valueDisplayName: String(v) };
        });
    }
    // 尝试 JSON 解析
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) {
                return parsed.map(v => {
                    if (typeof v === 'object') return { valueName: v.ValueName || v.valueName || '', valueDisplayName: v.ValueDisplayName || v.valueDisplayName || '' };
                    return { valueName: String(v), valueDisplayName: String(v) };
                });
            }
        } catch (e) { /* not JSON */ }
        // 分号分隔: "Enabled;Disabled" or "Enabled=启用;Disabled=禁用"
        return val.split(';').filter(Boolean).map(item => {
            const parts = item.split('=');
            return { valueName: parts[0].trim(), valueDisplayName: (parts[1] || parts[0]).trim() };
        });
    }
    return [];
}

/**
 * 获取可读的类型名称
 */
function getTypeDisplay(type) {
    const map = {
        'Enumeration': '枚举',
        'String': '字符串',
        'Integer': '整数',
        'Boolean': '布尔',
        'Password': '密码'
    };
    return map[type] || type;
}

/**
 * 获取属性适用客户的显示标签
 * "通用" = 蓝色标签，其他 = 橙色自定义标签
 */
function getScopeDisplay(scope) {
    if (!scope || scope === 'Standard' || scope === '通用') return { text: '通用', cls: 'tag-standard' };
    return { text: scope, cls: 'tag-custom' };
}
