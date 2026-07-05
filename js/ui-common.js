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

    showModal(title, contentHtml, onConfirm, onCancel, options) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = contentHtml;
        document.getElementById('modal-overlay').classList.remove('hidden');

        const confirmBtn = document.getElementById('modal-confirm');
        const cancelBtn = document.getElementById('modal-cancel');
        const closeBtn = document.getElementById('modal-close');
        const footer = document.getElementById('modal-footer');

        const opts = options || {};
        // 按钮文字
        confirmBtn.textContent = opts.confirmText || '确认';
        cancelBtn.textContent = opts.cancelText || '取消';
        // 按钮可见性
        confirmBtn.style.display = opts.hideConfirm ? 'none' : '';
        cancelBtn.style.display = opts.hideCancel ? 'none' : '';
        // 按钮 class
        confirmBtn.className = 'btn ' + (opts.confirmClass || 'btn-primary');
        cancelBtn.className = 'btn ' + (opts.cancelClass || '');
        // 宽度
        if (opts.modalWidth) {
            document.getElementById('modal-container').style.width = opts.modalWidth;
        }

        let closed = false;
        const close = () => {
            if (closed) return;
            closed = true;
            document.getElementById('modal-overlay').classList.add('hidden');
            // 恢复默认宽度
            document.getElementById('modal-container').style.width = '';
            if (onCancel) onCancel();
        };

        confirmBtn.onclick = async () => {
            if (onConfirm) {
                try {
                    const result = onConfirm();
                    // 支持 Promise 返回值
                    const resolved = result instanceof Promise ? await result : result;
                    if (resolved === false) return; // 表单验证失败，不关闭
                } catch (e) {
                    console.error('[Modal] onConfirm error:', e);
                    return;
                }
            }
            close();
        };
        cancelBtn.onclick = close;
        closeBtn.onclick = close;

        // 点击遮罩关闭（除非设置 noOverlayClose）
        if (!opts.noOverlayClose) {
            document.getElementById('modal-overlay').onclick = (e) => {
                if (e.target === e.currentTarget) close();
            };
        } else {
            document.getElementById('modal-overlay').onclick = null;
        }
    },

    hideModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
    }
};
