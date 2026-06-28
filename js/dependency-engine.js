/**
 * Redfish 依赖评估引擎
 * 实现 DMTF Map 依赖的评估与级联更新（隐藏/灰显/只读/值联动）
 *
 * 评估流程:
 *   1. resetState()  — 清空所有 dep* 运行时状态
 *   2. evaluateAll() — 遍历所有依赖，按源属性分组触发
 *   3. _evaluate()   — 递归级联，visited 防环
 */

const DependencyEngine = {

    /** 重置所有属性的依赖运行时状态 */
    resetState(profile) {
        for (const attr of Object.values(profile.attrMap)) {
            attr.depHidden = false;
            attr.depGrayedOut = false;
            attr.depReadOnly = false;
        }
    },

    /**
     * 全量评估所有依赖（导入/加载时调用）
     * @param {Object} profile
     * @returns {string[]} 所有受影响属性名
     */
    evaluateAll(profile) {
        this.resetState(profile);
        const allAffected = new Set();

        for (const dep of profile.dependencies) {
            const sourceAttr = profile.attrMap[dep.mapFromAttribute];
            if (!sourceAttr) continue;
            const value = this.getEffectiveValue(sourceAttr);
            this._evaluate(profile, dep.mapFromAttribute, value, new Set())
                .forEach(a => allAffected.add(a));
        }

        return Array.from(allAffected);
    },

    /**
     * 当属性值变更时增量评估
     * @param {Object} profile
     * @param {string} changedAttrName
     * @param {*} newValue
     * @returns {string[]} 受影响属性名
     */
    evaluate(profile, changedAttrName, newValue) {
        return this._evaluate(profile, changedAttrName, newValue, new Set());
    },

    /**
     * 递归评估依赖（内部方法）
     * @param {Object} profile
     * @param {string} sourceAttrName - 触发源属性名
     * @param {*} newValue - 源属性新值
     * @param {Set} visited - 环检测集合
     * @returns {string[]} 受影响属性名
     */
    _evaluate(profile, sourceAttrName, newValue, visited) {
        const affected = [];
        if (visited.has(sourceAttrName)) return affected;
        visited.add(sourceAttrName);

        const relevantDeps = profile.dependencies.filter(d => d.mapFromAttribute === sourceAttrName);
        if (relevantDeps.length === 0) return affected;

        // 按 dependencyFor（目标属性）分组
        const grouped = {};
        for (const dep of relevantDeps) {
            const key = dep.dependencyFor;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(dep);
        }

        for (const [targetAttrName, deps] of Object.entries(grouped)) {
            const targetAttr = profile.attrMap[targetAttrName];
            if (!targetAttr) continue;

            // 按 mapToProperty 再分组
            const byProperty = {};
            for (const dep of deps) {
                const prop = dep.mapToProperty || 'GrayOut';
                if (!byProperty[prop]) byProperty[prop] = [];
                byProperty[prop].push(dep);
            }

            let anyApplied = false;

            for (const [property, propDeps] of Object.entries(byProperty)) {
                const result = this._evaluateConditions(propDeps, profile);
                if (result.conditionMet) {
                    this._applyResult(targetAttr, propDeps, property);
                    anyApplied = true;
                } else {
                    // 条件不满足时重置该属性的对应状态
                    this._resetProperty(targetAttr, property);
                }
            }

            if (anyApplied) {
                affected.push(targetAttrName);
                // 递归处理间接依赖
                const targetValue = this.getEffectiveValue(targetAttr);
                affected.push(...this._evaluate(profile, targetAttrName, targetValue, visited));
            }
        }

        return affected;
    },

    /**
     * 评估条件组（AND/OR 聚合）
     * @param {Array} deps - 同一目标属性同一 property 的依赖列表
     * @param {Object} profile
     * @returns {{ conditionMet: boolean }}
     */
    _evaluateConditions(deps, profile) {
        const conditionsMet = deps.map(dep => {
            const sourceAttr = profile.attrMap[dep.mapFromAttribute];
            if (!sourceAttr) return false;
            const sourceValue = String(this.getSourcePropertyValue(sourceAttr, dep.mapFromProperty));
            return this._compareValues(sourceValue, dep.mapFromCondition, String(dep.mapFromValue));
        });

        const term = deps[0].mapTerms || 'AND';
        return {
            conditionMet: term === 'AND'
                ? conditionsMet.every(Boolean)
                : conditionsMet.some(Boolean)
        };
    },

    /**
     * 值比较（支持数字和字符串）
     */
    _compareValues(sourceVal, condition, compareVal) {
        const s = parseFloat(sourceVal);
        const c = parseFloat(compareVal);
        const sIsNaN = isNaN(s);
        const cIsNaN = isNaN(c);

        switch (condition) {
            case 'EQU': return sourceVal === compareVal;
            case 'NEQ': return sourceVal !== compareVal;
            case 'GTR': return !sIsNaN && !cIsNaN ? s > c : sourceVal > compareVal;
            case 'GEQ': return !sIsNaN && !cIsNaN ? s >= c : sourceVal >= compareVal;
            case 'LSS': return !sIsNaN && !cIsNaN ? s < c : sourceVal < compareVal;
            case 'LEQ': return !sIsNaN && !cIsNaN ? s <= c : sourceVal <= compareVal;
            default: return false;
        }
    },

    /**
     * 获取源属性的指定字段值
     * 支持 CurrentValue / DefaultValue / Hidden / GrayOut / ReadOnly
     */
    getSourcePropertyValue(attr, property) {
        switch (property) {
            case 'CurrentValue':
                return attr.modifiedValue ?? attr.currentValue ?? attr.defaultValue;
            case 'DefaultValue':
                return attr.defaultValue;
            case 'Hidden':
                return (attr.hidden || attr.depHidden) ? 'true' : 'false';
            case 'GrayOut':
                return (attr.grayOut || attr.depGrayedOut) ? 'true' : 'false';
            case 'ReadOnly':
                return (attr.readOnly || attr.depReadOnly) ? 'true' : 'false';
            default:
                return attr[property] !== undefined ? attr[property] : '';
        }
    },

    /**
     * 获取属性的有效值（modifiedValue > currentValue > defaultValue）
     */
    getEffectiveValue(attr) {
        if (attr.modifiedValue !== null && attr.modifiedValue !== undefined) return attr.modifiedValue;
        if (attr.currentValue !== null && attr.currentValue !== undefined) return attr.currentValue;
        return attr.defaultValue;
    },

    /**
     * 应用依赖结果到目标属性
     */
    _applyResult(targetAttr, deps, property) {
        for (const dep of deps) {
            const propValue = dep.mapToValue;
            const boolValue = this._toBool(propValue);
            switch (property) {
                case 'Hidden':     targetAttr.depHidden = boolValue; break;
                case 'GrayOut':    targetAttr.depGrayedOut = boolValue; break;
                case 'ReadOnly':   targetAttr.depReadOnly = boolValue; break;
                case 'CurrentValue':
                    targetAttr.modifiedValue = this._parseValueByType(targetAttr, propValue);
                    break;
            }
        }
    },

    /**
     * 条件不满足时重置目标属性的对应状态
     */
    _resetProperty(targetAttr, property) {
        switch (property) {
            case 'Hidden':     targetAttr.depHidden = false; break;
            case 'GrayOut':    targetAttr.depGrayedOut = false; break;
            case 'ReadOnly':   targetAttr.depReadOnly = false; break;
            case 'CurrentValue': targetAttr.modifiedValue = null; break;
        }
    },

    /** 统一布尔值解析 */
    _toBool(value) {
        return value === 'true' || value === true || value === '1';
    },

    /** 按属性类型解析值 */
    _parseValueByType(attr, value) {
        switch (attr.type) {
            case 'Integer':
                const n = parseInt(value, 10);
                return isNaN(n) ? 0 : n;
            case 'Boolean':
                return this._toBool(value);
            default:
                return String(value);
        }
    }
};
