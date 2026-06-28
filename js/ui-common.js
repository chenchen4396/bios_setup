/**
 * UI 公共工具 — 转义、通知、模态框
 * 被 ui-sidebar / ui-table / ui-forms / app.js 共享调用
 */

const UICommon = {

    /* ============ HTML 转义 ============ */

    escHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    escAttr(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },

    /* ============ 通知 ============ */

    showNotification(message, type = 'info', duration = 3000) {
        const container = document.getElementById('notification-container');
        if (!container) return;
        const el = document.createElement('div');
        el.className = 'notification notification-' + type;
        el.textContent = message;
        container.appendChild(el);

        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.3s';
            setTimeout(() => el.remove(), 300);
        }, duration);
    },

    /* ============ 模态框 ============ */

    showModal(title, contentHtml, onConfirm, onCancel) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = contentHtml;
        document.getElementById('modal-overlay').classList.remove('hidden');

        const confirmBtn = document.getElementById('modal-confirm');
        const cancelBtn = document.getElementById('modal-cancel');
        const closeBtn = document.getElementById('modal-close');

        const close = () => {
            document.getElementById('modal-overlay').classList.add('hidden');
            if (onCancel) onCancel();
        };

        confirmBtn.onclick = () => {
            if (onConfirm) {
                const result = onConfirm();
                if (result === false) return; // 表单验证失败，不关闭
            }
            close();
        };
        cancelBtn.onclick = close;
        closeBtn.onclick = close;

        // 点击遮罩关闭
        document.getElementById('modal-overlay').onclick = (e) => {
            if (e.target === e.currentTarget) close();
        };
    },

    hideModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
    }
};
