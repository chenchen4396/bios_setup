/**
 * 机型管理面板 — 展示所有已加载机型，支持切换、删除
 */
const SystemManager = {

    /**
     * 打开机型管理面板
     */
    async open() {
        const systems = await Storage.listSystems();
        if (!systems.length) {
            UIRenderer.showNotification('暂无已加载的机型', 'info');
            return;
        }

        const profile = AppState.currentProfile;
        const currentId = profile ? profile.systemId : null;

        let html = '<div class="sys-mgr-grid">';
        for (const sys of systems) {
            const isActive = sys.systemId === currentId;
            html += '<div class="sys-card' + (isActive ? ' sys-card-active' : '') + '" data-id="' + UICommon.escAttr(sys.systemId) + '">' +
                '<div class="sys-card-header">' +
                '  <span class="sys-card-name">' + UICommon.escHtml(sys.productName || sys.systemId) + '</span>' +
                (isActive ? '<span class="sys-card-badge">当前</span>' : '') +
                '</div>' +
                '<div class="sys-card-body">' +
                '  <div class="sys-card-row"><span class="sys-card-label">ID:</span><span>' + UICommon.escHtml(sys.systemId) + '</span></div>' +
                '  <div class="sys-card-row"><span class="sys-card-label">固件:</span><span>' + UICommon.escHtml(sys.firmwareVersion || '—') + '</span></div>' +
                '  <div class="sys-card-row"><span class="sys-card-label">属性:</span><span>' + (sys.attrCount || 0) + ' 项</span></div>' +
                '  <div class="sys-card-row"><span class="sys-card-label">菜单:</span><span>' + (sys.menuCount || 0) + ' 个</span></div>' +
                '</div>' +
                '<div class="sys-card-actions">' +
                (!isActive ? '<button class="btn btn-small btn-secondary sys-btn-switch" data-id="' + UICommon.escAttr(sys.systemId) + '">切换</button>' : '') +
                (Auth.isAdmin ? '<button class="btn btn-small btn-danger sys-btn-delete" data-id="' + UICommon.escAttr(sys.systemId) + '" data-name="' + UICommon.escAttr(sys.productName || sys.systemId) + '">删除</button>' : '') +
                '</div>' +
                '</div>';
        }
        html += '</div>';

        UIRenderer.showModal(
            '机型管理 (' + systems.length + ' 个)',
            html,
            null, null,
            { hideConfirm: true, cancelText: '关闭' }
        );

        // 绑定事件
        const modalBody = document.getElementById('modal-body');
        if (modalBody) {
            // 切换机型
            modalBody.querySelectorAll('.sys-btn-switch').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    UIRenderer.hideModal();
                    await AppState.switchSystem(id);
                });
            });

            // 删除机型
            modalBody.querySelectorAll('.sys-btn-delete').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    const name = e.target.dataset.name;
                    // 二次确认
                    UIRenderer.showModal(
                        '确认删除',
                        '<p>确定要删除机型 <strong>' + UICommon.escHtml(name) + '</strong> 吗？</p>' +
                        '<p style="color:var(--color-danger);font-size:12px;">此操作不可恢复，该机型的所有属性和菜单将被永久删除。</p>',
                        async () => {
                            await Storage.deleteSystem(id);
                            UIRenderer.showNotification('已删除: ' + name, 'success');
                            await AppState.refreshAfterDelete();
                            // 重新打开管理面板
                            UIRenderer.hideModal();
                            setTimeout(() => SystemManager.open(), 200);
                        },
                        null
                    );
                });
            });
        }
    }
};
