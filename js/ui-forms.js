/**
 * UI 表单构建 — 添加菜单 / 添加选项 / 编辑选项 的弹窗表单
 * 依赖: UICommon, AttrType
 */

const UIForms = {

    /* ============ 添加菜单表单 ============ */

    buildAddMenuForm(profile) {
        const escA = UICommon.escAttr, escH = UICommon.escHtml;
        const existingPaths = Object.values(profile.menuMap).map(m => m.menuPath).sort();
        let pathOptions = '<option value="">(根级菜单)</option>';
        for (const p of existingPaths) {
            const m = Object.values(profile.menuMap).find(x => x.menuPath === p);
            const label = (m ? (m.displayNameZh || m.displayName || m.menuName) : p);
            pathOptions += '<option value="' + escA(p) + '">' + escH(label + ' (' + p + ')') + '</option>';
        }

        return '' +
            '<div class="form-group">' +
            '  <label>菜单标识 <span style="color:red;">*</span></label>' +
            '  <input id="add-menu-name" type="text" placeholder="英文标识，如 CustomMenu" />' +
            '  <span class="form-hint">唯一菜单名称，用于内部标识</span>' +
            '</div>' +
            '<div class="form-group">' +
            '  <label>显示名称 (英文)</label>' +
            '  <input id="add-menu-display" type="text" placeholder="如 Custom Options" />' +
            '</div>' +
            '<div class="form-group">' +
            '  <label>中文显示名称</label>' +
            '  <input id="add-menu-displayzh" type="text" placeholder="如 自定义选项" />' +
            '</div>' +
            '<div class="form-group">' +
            '  <label>父级菜单元路径</label>' +
            '  <select id="add-menu-parent">' + pathOptions + '</select>' +
            '  <span class="form-hint">选择已有菜单作为父级，或留空创建顶级菜单。如需新路径可手动输入</span>' +
            '  <input id="add-menu-parent-input" type="text" placeholder="或手动输入父级路径，如 ./SystemOptions" style="margin-top:4px;" />' +
            '</div>' +
            '<div class="form-group-inline">' +
            '  <input type="checkbox" id="add-menu-hidden" />' +
            '  <label style="font-size:12px;cursor:pointer;">隐藏 (菜单树中不可见)</label>' +
            '</div>';
    },

    extractAddMenuForm() {
        return {
            menuName: document.getElementById('add-menu-name').value.trim(),
            displayName: document.getElementById('add-menu-display').value.trim(),
            displayNameZh: document.getElementById('add-menu-displayzh').value.trim(),
            parentPath: document.getElementById('add-menu-parent-input').value.trim() || document.getElementById('add-menu-parent').value,
            hidden: document.getElementById('add-menu-hidden').checked
        };
    },

    /* ============ 添加选项表单 ============ */

    buildAddAttributeForm(profile, defaultMenuPath) {
        const escA = UICommon.escAttr;

        const menuPaths = Object.values(profile.menuMap)
            .map(m => m.menuPath)
            .filter((v, i, a) => a.indexOf(v) === i)
            .sort();

        let menuDatalist = '';
        for (const p of menuPaths) {
            menuDatalist += '<option value="' + escA(p) + '" />';
        }

        return '' +
            '<div class="form-row">' +
            '  <div class="form-group">' +
            '    <label>属性标识 <span style="color:red;">*</span></label>' +
            '    <input id="add-attr-name" type="text" placeholder="如 CustomOption" />' +
            '  </div>' +
            '  <div class="form-group">' +
            '    <label>类型 <span style="color:red;">*</span></label>' +
            '    <select id="add-attr-type">' +
            '      <option value="Enumeration">枚举</option>' +
            '      <option value="String">字符串</option>' +
            '      <option value="Integer">整数</option>' +
            '      <option value="Boolean">布尔</option>' +
            '      <option value="Password">密码</option>' +
            '    </select>' +
            '  </div>' +
            '</div>' +
            '<div class="form-row">' +
            '  <div class="form-group">' +
            '    <label>显示名称 (英文)</label>' +
            '    <input id="add-attr-display" type="text" placeholder="如 Custom Option" />' +
            '  </div>' +
            '  <div class="form-group">' +
            '    <label>中文显示名称</label>' +
            '    <input id="add-attr-displayzh" type="text" placeholder="如 自定义选项" />' +
            '  </div>' +
            '</div>' +
            '<div class="form-group">' +
            '  <label>默认值</label>' +
            '  <input id="add-attr-default" type="text" placeholder="出厂默认值" />' +
            '</div>' +
            '<div class="form-group" id="add-attr-enum-group">' +
            '  <label>可选值列表 (枚举)</label>' +
            '  <textarea id="add-attr-values" placeholder="每行一个值，或用逗号分隔&#10;如: Enabled, Disabled" rows="3"></textarea>' +
            '  <span class="form-hint">枚举类型专用，逗号或换行分隔每个可选值</span>' +
            '</div>' +
            '<div class="form-row hidden" id="add-attr-int-group">' +
            '  <div class="form-group"><label>最小值</label><input id="add-attr-lb" type="number" placeholder="0" /></div>' +
            '  <div class="form-group"><label>最大值</label><input id="add-attr-ub" type="number" placeholder="100" /></div>' +
            '  <div class="form-group"><label>步进</label><input id="add-attr-step" type="number" placeholder="1" /></div>' +
            '</div>' +
            '<div class="form-row hidden" id="add-attr-str-group">' +
            '  <div class="form-group"><label>最小长度</label><input id="add-attr-minlen" type="number" placeholder="0" /></div>' +
            '  <div class="form-group"><label>最大长度</label><input id="add-attr-maxlen" type="number" placeholder="256" /></div>' +
            '</div>' +
            '<div class="form-row">' +
            '  <div class="form-group">' +
            '    <label>说明 (英文)</label>' +
            '    <input id="add-attr-help" type="text" placeholder="BIOS option description" />' +
            '  </div>' +
            '  <div class="form-group">' +
            '    <label>中文说明</label>' +
            '    <input id="add-attr-helpzh" type="text" placeholder="BIOS 选项说明" />' +
            '  </div>' +
            '</div>' +
            '<div class="form-row">' +
            '  <div class="form-group">' +
            '    <label>菜单元路径 <span style="color:red;">*</span></label>' +
            '    <input id="add-attr-menu" type="text" list="add-menu-datalist" value="' + escA(defaultMenuPath || '') + '" placeholder="手动输入或从建议中选择" />' +
            '    <datalist id="add-menu-datalist">' + menuDatalist + '</datalist>' +
            '  </div>' +
            '  <div class="form-group">' +
            '    <label>适用平台</label>' +
            '    <input id="add-attr-platforms" type="text" placeholder="逗号分隔, 留空=全平台" />' +
            '  </div>' +
            '</div>' +
            '<div class="form-group">' +
            '  <label>适用客户</label>' +
            '  <input id="add-attr-scope" type="text" value="通用" list="scope-suggestions" placeholder="通用 / 字节 / 百度..." />' +
            '</div>' +
            '<div class="form-group-inline">' +
            '  <input type="checkbox" id="add-attr-readonly" />' +
            '  <label style="font-size:12px;cursor:pointer;">只读</label>' +
            '</div>' +
            '<div class="form-group-inline">' +
            '  <input type="checkbox" id="add-attr-redfish" />' +
            '  <label style="font-size:12px;cursor:pointer;">支持 Redfish (可通过 Redfish API 管理此选项)</label>' +
            '</div>' +
            '<div class="form-group-inline">' +
            '  <input type="checkbox" id="add-attr-unicfg" />' +
            '  <label style="font-size:12px;cursor:pointer;">支持 Unicfg</label>' +
            '</div>';
    },

    extractAddAttributeForm() {
        const attrName = document.getElementById('add-attr-name').value.trim();
        const type = document.getElementById('add-attr-type').value;
        const displayName = document.getElementById('add-attr-display').value.trim();
        const displayNameZh = document.getElementById('add-attr-displayzh').value.trim();
        const defaultValue = document.getElementById('add-attr-default').value.trim();
        const valuesRaw = document.getElementById('add-attr-values').value.trim();
        const menuPath = document.getElementById('add-attr-menu').value;
        const platforms = document.getElementById('add-attr-platforms').value.trim();
        const helpText = document.getElementById('add-attr-help').value.trim();
        const helpTextZh = document.getElementById('add-attr-helpzh').value.trim();
        const readOnly = document.getElementById('add-attr-readonly').checked;
        const supportsRedfish = document.getElementById('add-attr-redfish').checked;
        const supportsUnicfg = document.getElementById('add-attr-unicfg').checked;
        const scope = (document.getElementById('add-attr-scope')?.value?.trim()) || '通用';

        let lb = null, ub = null, step = null, minlen = null, maxlen = null;
        if (type === 'Integer') {
            lb = document.getElementById('add-attr-lb').value;
            ub = document.getElementById('add-attr-ub').value;
            step = document.getElementById('add-attr-step').value;
        }
        if (type === 'String' || type === 'Password') {
            minlen = document.getElementById('add-attr-minlen').value;
            maxlen = document.getElementById('add-attr-maxlen').value;
        }

        // 解析可选值
        let value = [];
        if (valuesRaw && type === 'Enumeration') {
            const items = valuesRaw.split(/[,\n\r]+/).filter(Boolean).map(s => s.trim());
            value = items.map(v => ({ valueName: v, valueDisplayName: v }));
        }

        return {
            attrName, type, displayName, displayNameZh, defaultValue,
            value, menuPath, platforms, helpText, helpTextZh, readOnly, supportsRedfish, supportsUnicfg, scope,
            lowerBound: lb ? Number(lb) : null,
            upperBound: ub ? Number(ub) : null,
            scalarIncrement: step ? Number(step) : null,
            minLength: minlen ? Number(minlen) : null,
            maxLength: maxlen ? Number(maxlen) : null
        };
    },

    /* ============ 编辑选项表单 ============ */

    buildEditAttributeForm(attr, profile) {
        const escA = UICommon.escAttr, escH = UICommon.escHtml;
        const currentVal = attr.modifiedValue ?? attr.currentValue ?? attr.defaultValue;
        const defaultVal = attr.defaultValue !== null && attr.defaultValue !== undefined ? attr.defaultValue : '(空)';
        const isEnum = attr.type === 'Enumeration' || attr.type === AttrType.Enumeration;

        // 菜单路径 datalist
        let menuDatalistHtml = '';
        const existingPaths = profile ? Object.values(profile.menuMap).map(m => m.menuPath).filter((v, i, a) => a.indexOf(v) === i).sort() : [];
        for (const p of existingPaths) {
            menuDatalistHtml += '<option value="' + escA(p) + '" />';
        }

        // 枚举值文本框
        const existingEnumValues = (attr.value || []).map(v => v.valueName || v.ValueName || '').join('\n');

        // 类型映射
        const typeMap = {'Enumeration':'枚举','String':'字符串','Integer':'整数','Boolean':'布尔','Password':'密码'};
        const typesHtml = Object.entries(typeMap).map(([v, l]) => {
            const sel = v === attr.type ? ' selected' : '';
            return '<option value="' + v + '"' + sel + '>' + l + '</option>';
        }).join('');

        const platformsVal = (attr.platforms || []).join(', ');

        return '' +
            '<div class="edit-form-scroll">' +
            // 属性标识 + 类型
            '<div class="form-row">' +
            '  <div class="form-group">' +
            '    <label>属性标识 <span style="color:red;">*</span></label>' +
            '    <input id="edit-attr-name" type="text" value="' + escA(attr.attributeName) + '" />' +
            '  </div>' +
            '  <div class="form-group">' +
            '    <label>类型 <span style="color:red;">*</span></label>' +
            '    <select id="edit-attr-type" onchange="window._toggleEditTypeFields()">' + typesHtml + '</select>' +
            '  </div>' +
            '</div>' +
            // 中英文显示名
            '<div class="form-row">' +
            '  <div class="form-group">' +
            '    <label>显示名称 (英文)</label>' +
            '    <input id="edit-attr-display" type="text" value="' + escA(attr.displayName || '') + '" />' +
            '  </div>' +
            '  <div class="form-group">' +
            '    <label>中文显示名称</label>' +
            '    <input id="edit-attr-displayzh" type="text" value="' + escA(attr.displayNameZh || '') + '" />' +
            '  </div>' +
            '</div>' +
            // 默认值 + 当前值
            '<div class="form-row">' +
            '  <div class="form-group">' +
            '    <label>默认值</label>' +
            '    <input id="edit-attr-default" type="text" value="' + escA(String(defaultVal === '(空)' ? '' : defaultVal)) + '" placeholder="出厂默认值" />' +
            '  </div>' +
            '  <div class="form-group">' +
            '    <label>当前值 / 新值</label>' +
            '    <div id="edit-attr-value-wrapper" style="display:flex;flex-direction:column;gap:4px;">' +
            '      <input id="edit-attr-value" type="text" value="' + escA(String(currentVal ?? '')) + '" placeholder="修改后的值" />' +
            '    </div>' +
            '  </div>' +
            '</div>' +
            // 枚举可选值
            '<div class="form-group" id="edit-attr-enum-group"' + (isEnum ? '' : ' style="display:none;"') + '>' +
            '  <label>可选值列表 (枚举类型)</label>' +
            '  <textarea id="edit-attr-values" rows="3" placeholder="每行一个值&#10;如:&#10;Enabled&#10;Disabled">' + escH(existingEnumValues) + '</textarea>' +
            '  <span class="form-hint">枚举类型专用，每行一个值。修改后请更新值域。</span>' +
            '</div>' +
            // 整数约束
            '<div class="form-row" id="edit-attr-int-group"' + (attr.type === 'Integer' || attr.type === AttrType.Integer ? '' : ' style="display:none;"') + '>' +
            '  <div class="form-group"><label>最小值</label><input id="edit-attr-lb" type="number" value="' + (attr.lowerBound ?? '') + '" /></div>' +
            '  <div class="form-group"><label>最大值</label><input id="edit-attr-ub" type="number" value="' + (attr.upperBound ?? '') + '" /></div>' +
            '  <div class="form-group"><label>步进值</label><input id="edit-attr-step" type="number" value="' + (attr.scalarIncrement ?? '') + '" /></div>' +
            '</div>' +
            // 字符串约束
            '<div class="form-row" id="edit-attr-str-group"' + ((attr.type === 'String' || attr.type === 'Password' || attr.type === AttrType.String || attr.type === AttrType.Password) ? '' : ' style="display:none;"') + '>' +
            '  <div class="form-group"><label>最小长度</label><input id="edit-attr-minlen" type="number" value="' + (attr.minLength ?? '') + '" /></div>' +
            '  <div class="form-group"><label>最大长度</label><input id="edit-attr-maxlen" type="number" value="' + (attr.maxLength ?? '') + '" /></div>' +
            '</div>' +
            // 中英文说明
            '<div class="form-row">' +
            '  <div class="form-group"><label>说明 (英文)</label><input id="edit-attr-help" type="text" value="' + escA(attr.helpText || '') + '" /></div>' +
            '  <div class="form-group"><label>中文说明</label><input id="edit-attr-helpzh" type="text" value="' + escA(attr.helpTextZh || '') + '" /></div>' +
            '</div>' +
            // 菜单路径 + 平台
            '<div class="form-row">' +
            '  <div class="form-group">' +
            '    <label>菜单元路径 <span style="color:red;">*</span></label>' +
            '    <input id="edit-attr-menupath" type="text" list="edit-menu-datalist" value="' + escA(attr.menuPath || '') + '" placeholder="手动输入或从建议中选择" />' +
            '    <datalist id="edit-menu-datalist">' + menuDatalistHtml + '</datalist>' +
            '  </div>' +
            '  <div class="form-group">' +
            '    <label>适用平台</label>' +
            '    <input id="edit-attr-platforms" type="text" value="' + escA(platformsVal) + '" placeholder="逗号分隔, 留空=全平台" />' +
            '  </div>' +
            '</div>' +
            // 适用客户 + Redfish + 只读
            '<div class="form-row" style="align-items:center;">' +
            '  <div class="form-group">' +
            '    <label>适用客户</label>' +
            '    <input id="edit-attr-scope" type="text" value="' + escA((attr.attributeScope === 'Standard') ? '通用' : (attr.attributeScope || '通用')) + '" list="scope-suggestions" placeholder="通用 / 字节 / 百度..." />' +
            '    <datalist id="scope-suggestions">' +
            '      <option value="通用"><option value="字节"><option value="百度"><option value="阿里">' +
            '      <option value="腾讯"><option value="华为"><option value="京东"><option value="快手"><option value="美团">' +
            '    </datalist>' +
            '  </div>' +
            '  <div class="form-group-inline" style="flex:1;padding-top:20px;">' +
            '    <input type="checkbox" id="edit-attr-redfish"' + (attr.supportsRedfish ? ' checked' : '') + ' />' +
            '    <label style="font-size:12px;cursor:pointer;">支持 Redfish</label>' +
            '  </div>' +
            '  <div class="form-group-inline" style="flex:1;padding-top:20px;">' +
            '    <input type="checkbox" id="edit-attr-unicfg"' + (attr.supportsUnicfg ? ' checked' : '') + ' />' +
            '    <label style="font-size:12px;cursor:pointer;">支持 Unicfg</label>' +
            '  </div>' +
            '  <div class="form-group-inline" style="flex:1;padding-top:20px;">' +
            '    <input type="checkbox" id="edit-attr-readonly"' + (attr.readOnly ? ' checked' : '') + ' />' +
            '    <label style="font-size:12px;cursor:pointer;">只读</label>' +
            '  </div>' +
            '</div>' +
            (attr.warningText ? '<div class="form-group"><span style="color:var(--color-warning);font-size:12px;">⚠ ' + escH(attr.warningText) + '</span></div>' : '') +
            '<div style="border-top:1px solid var(--border-color);padding-top:12px;margin-top:12px;text-align:right;">' +
            '  <button id="btn-delete-attr" class="btn btn-danger-solid btn-small">🗑 删除此选项</button>' +
            '</div>' +
            '</div>' +
            '<script>window._toggleEditTypeFields = function(){' +
            'var t=document.getElementById("edit-attr-type").value;' +
            'document.getElementById("edit-attr-enum-group").style.display=(t==="Enumeration"?"":"none");' +
            'document.getElementById("edit-attr-int-group").style.display=(t==="Integer"?"":"none");' +
            'document.getElementById("edit-attr-str-group").style.display=(t==="String"||t==="Password"?"":"none");' +
            '}</script>';
    },

    extractEditAttributeForm() {
        const getVal = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
        const getBool = (id) => { const el = document.getElementById(id); return el ? el.checked : false; };

        const attrName = getVal('edit-attr-name');
        if (!attrName) return null;

        const type = getVal('edit-attr-type');
        const displayName = getVal('edit-attr-display');
        const displayNameZh = getVal('edit-attr-displayzh');
        const defaultValue = getVal('edit-attr-default');
        const newValue = getVal('edit-attr-value');
        const valuesRaw = getVal('edit-attr-values');
        const menuPath = getVal('edit-attr-menupath');
        const platforms = getVal('edit-attr-platforms');
        const helpText = getVal('edit-attr-help');
        const helpTextZh = getVal('edit-attr-helpzh');
        const readOnly = getBool('edit-attr-readonly');
        const supportsRedfish = getBool('edit-attr-redfish');
        const supportsUnicfg = getBool('edit-attr-unicfg');
        const attributeScope = getVal('edit-attr-scope') || '通用';

        // 枚举值
        let enumValues = [];
        if (type === 'Enumeration' && valuesRaw) {
            enumValues = valuesRaw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
                .map(v => ({ valueName: v, valueDisplayName: v }));
        }

        // 平台
        const platformList = platforms ? platforms.split(/[,，]+/).map(s => s.trim()).filter(Boolean) : [];

        // 整数约束
        let lowerBound = null, upperBound = null, scalarIncrement = null;
        if (type === 'Integer') {
            const lb = getVal('edit-attr-lb');
            const ub = getVal('edit-attr-ub');
            const si = getVal('edit-attr-step');
            if (lb) lowerBound = Number(lb);
            if (ub) upperBound = Number(ub);
            if (si) scalarIncrement = Number(si);
        }

        // 字符串长度
        let minLength = null, maxLength = null;
        if (type === 'String' || type === 'Password') {
            const mn = getVal('edit-attr-minlen');
            const mx = getVal('edit-attr-maxlen');
            if (mn) minLength = Number(mn);
            if (mx) maxLength = Number(mx);
        }

        return {
            attributeName: attrName,
            type,
            displayName, displayNameZh,
            defaultValue,
            newValue: newValue || null,
            value: enumValues,
            menuPath,
            platforms: platformList,
            helpText, helpTextZh,
            readOnly, supportsRedfish, supportsUnicfg,
            attributeScope,
            lowerBound, upperBound, scalarIncrement,
            minLength, maxLength
        };
    }
};
