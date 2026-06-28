/**
 * UI 渲染器 — 统一外观入口
 * 将 UICommon / UISidebar / UITable / UIForms 的方法代理到 UIRenderer 命名空间
 * 外部代码（app.js 等）继续使用 UIRenderer.xxx() 调用，无需感知子模块拆分
 *
 * 加载顺序: ui-common → ui-sidebar → ui-table → ui-forms → ui-renderer
 */

const UIRenderer = {

    // — 代理 UICommon —
    escHtml:        (...a) => UICommon.escHtml(...a),
    escAttr:        (...a) => UICommon.escAttr(...a),
    showNotification:(...a) => UICommon.showNotification(...a),
    showModal:      (...a) => UICommon.showModal(...a),
    hideModal:      ()      => UICommon.hideModal(),

    // — 代理 UISidebar —
    renderSidebar:          (...a) => UISidebar.renderSidebar(...a),
    renderSystemSelector:   ()      => UISidebar.renderSystemSelector(),
    updatePlatformFilter:   ()      => UISidebar.updatePlatformFilter(),
    updateScopeFilter:      ()      => UISidebar.updateScopeFilter(),
    clearCollapseStateForPath: (p)  => UISidebar.clearCollapseStateForPath(p),

    // 侧边栏折叠状态（供 app.js navigateToMenu 使用）
    get _menuCollapseState() { return UISidebar._menuCollapseState; },

    // — 代理 UITable —
    renderAttributeTable:   (...a) => UITable.renderAttributeTable(...a),
    renderActiveFilters:    ()      => UITable.renderActiveFilters(),
    search:                 (...a) => UITable.search(...a),
    renderSearchResults:    (...a) => UITable.renderSearchResults(...a),

    // — 代理 UIForms —
    buildAddMenuForm:       (...a) => UIForms.buildAddMenuForm(...a),
    extractAddMenuForm:     ()      => UIForms.extractAddMenuForm(),
    buildAddAttributeForm:  (...a) => UIForms.buildAddAttributeForm(...a),
    extractAddAttributeForm:()      => UIForms.extractAddAttributeForm(),
    buildEditAttributeForm: (...a) => UIForms.buildEditAttributeForm(...a),
    extractEditAttributeForm:()     => UIForms.extractEditAttributeForm()
};
