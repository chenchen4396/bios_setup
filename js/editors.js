/**
 * 类型感知编辑器 — 按 AttrType 分派渲染 HTML 控件并提供校验
 * 依赖: AttrType, toBool (models.js)
 */

const Editors = {

    /**
     * 渲染编辑器 HTML
     * @param {Object} attr
     * @param {string} editId — 唯一 DOM ID
     * @returns {string}
     */
    renderEditor(attr, editId) {
        const currentVal = attr.modifiedValue ?? attr.currentValue ?? attr.defaultValue;

        switch (attr.type) {
            case AttrType.Enumeration:
                return this.renderEnumEditor(attr, editId, currentVal);
            case AttrType.Integer:
                return this.renderIntegerEditor(attr, editId, currentVal);
            case AttrType.String:
                return this.renderStringEditor(attr, editId, currentVal);
            case AttrType.Boolean:
                return this.renderBooleanEditor(attr, editId, currentVal);
            case AttrType.Password:
                return this.renderPasswordEditor(attr, editId);
            default:
                return '<input class="inline-edit-input" id="' + editId + '" value="' + this.esc(currentVal || '') + '">';
        }
    },

    renderEnumEditor(attr, editId, currentVal) {
        let html = '<select class="inline-edit-select" id="' + editId + '" data-type="enum">';
        if (attr.value && attr.value.length > 0) {
            // 去重
            const seen = new Set();
            for (const v of attr.value) {
                const name = v.valueName || v.ValueName || '';
                if (!name || seen.has(name)) continue;
                seen.add(name);
                const display = v.valueDisplayName || v.ValueDisplayName || name;
                const selected = (name === currentVal || display === currentVal) ? ' selected' : '';
                html += '<option value="' + this.esc(name) + '"' + selected + '>' + this.esc(display) + '</option>';
            }
        }
        html += '</select>';
        return html;
    },

    renderIntegerEditor(attr, editId, currentVal) {
        const min = attr.lowerBound !== null ? attr.lowerBound : '';
        const max = attr.upperBound !== null ? attr.upperBound : '';
        const step = attr.scalarIncrement !== null ? attr.scalarIncrement : '';
        return '<input class="inline-edit-number" id="' + editId + '" type="number" value="' + (currentVal ?? '') +
            '" min="' + min + '" max="' + max + '" step="' + step + '" data-type="integer">';
    },

    renderStringEditor(attr, editId, currentVal) {
        const maxlen = attr.maxLength !== null ? ' maxlength="' + attr.maxLength + '"' : '';
        return '<input class="inline-edit-input" id="' + editId + '" type="text" value="' + this.esc(currentVal || '') + '"' + maxlen + ' data-type="string">';
    },

    renderBooleanEditor(attr, editId, currentVal) {
        // 复用 models.js 的 toBool 统一布尔解析
        const isTrue = toBool(currentVal, false);
        return '<label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;">' +
            '<input type="checkbox" id="' + editId + '" data-type="boolean" ' + (isTrue ? 'checked' : '') + '>' +
            '<span style="font-size:11px;">是</span></label>';
    },

    renderPasswordEditor(attr, editId) {
        return '<input class="inline-edit-input" id="' + editId + '" type="password" placeholder="输入新密码" data-type="password">';
    },

    /**
     * 提取编辑后的值
     * @param {HTMLElement} el
     * @param {string} type
     * @returns {*}
     */
    extractValue(el, type) {
        switch (type) {
            case AttrType.Boolean: {
                return el.checked;
            }
            case AttrType.Integer: {
                const v = parseInt(el.value, 10);
                return isNaN(v) ? null : v;
            }
            case AttrType.Password:
                return el.value || null;
            default:
                return el.value;
        }
    },

    /**
     * 验证输入值
     * @returns {{ valid: boolean, message: string }}
     */
    validate(value, attr) {
        if (value === null || value === undefined || value === '') {
            if (attr.type === AttrType.Password) return { valid: true, message: '' };
        }

        switch (attr.type) {
            case AttrType.Enumeration:
                return this.validateEnum(value, attr);
            case AttrType.Integer:
                return this.validateInteger(value, attr);
            case AttrType.String:
            case AttrType.Password:
                return this.validateString(value, attr);
            case AttrType.Boolean:
                return { valid: true, message: '' };
            default:
                return { valid: true, message: '' };
        }
    },

    validateEnum(value, attr) {
        if (!attr.value || attr.value.length === 0) return { valid: true, message: '' };
        const valid = attr.value.some(v =>
            (v.valueName || v.ValueName) === value ||
            (v.valueDisplayName || v.ValueDisplayName) === value
        );
        return valid ? { valid: true, message: '' } : { valid: false, message: '值不在可选范围内' };
    },

    validateInteger(value, attr) {
        const num = typeof value === 'number' ? value : parseInt(value, 10);
        if (isNaN(num)) return { valid: false, message: '请输入有效整数' };
        if (attr.lowerBound !== null && num < attr.lowerBound) return { valid: false, message: '最小值为 ' + attr.lowerBound };
        if (attr.upperBound !== null && num > attr.upperBound) return { valid: false, message: '最大值为 ' + attr.upperBound };
        if (attr.scalarIncrement && attr.lowerBound !== null) {
            const remainder = (num - attr.lowerBound) % attr.scalarIncrement;
            if (remainder !== 0) {
                return { valid: false, message: '必须按 ' + attr.scalarIncrement + ' 的步进值' };
            }
        }
        return { valid: true, message: '' };
    },

    validateString(value, attr) {
        const str = String(value);
        if (attr.minLength !== null && str.length < attr.minLength) return { valid: false, message: '最少 ' + attr.minLength + ' 个字符' };
        if (attr.maxLength !== null && str.length > attr.maxLength) return { valid: false, message: '最多 ' + attr.maxLength + ' 个字符' };
        if (attr.valueExpression) {
            try {
                const re = new RegExp(attr.valueExpression);
                if (!re.test(str)) return { valid: false, message: '格式不符合要求' };
            } catch (e) { /* 忽略非法正则 */ }
        }
        return { valid: true, message: '' };
    },

    /** HTML 转义 */
    esc(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
};
