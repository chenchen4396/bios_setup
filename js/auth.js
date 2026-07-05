/**
 * 认证模块 — 登录 / 注册 / 角色权限
 * API 模式: 数据存储在 data/users.json（服务器端，重启不丢）
 * Local 模式: 回退到 localStorage（离线/本地开发）
 */

const Auth = {
    _usersKey: 'bios_manager_users',
    _sessionKey: 'bios_manager_session',
    _apiMode: null,      // null=未探测, true=api可用, false=仅local

    /** 探测后端 API 是否可用 */
    async _detect() {
        if (this._apiMode !== null) return;
        try {
            const r = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: '__probe__', password: '__probe__' }),
                signal: AbortSignal.timeout(2000)
            });
            // 即使 401 也说明 API 存在
            this._apiMode = (r.status === 401 || r.status === 400 || r.ok);
        } catch {
            this._apiMode = false;
        }
        if (!this._apiMode) this._localEnsureAdmin();
    },

    // ============ localStorage 兼容层 ============

    _localGetUsers() {
        try { return JSON.parse(localStorage.getItem(this._usersKey)) || []; }
        catch { return []; }
    },
    _localSaveUsers(users) {
        localStorage.setItem(this._usersKey, JSON.stringify(users));
    },
    _localEnsureAdmin() {
        const users = this._localGetUsers();
        const admin = users.find(u => u.role === 'admin');
        if (!admin) {
            users.push({ username: 'admin', password: '1', role: 'admin', createdAt: new Date().toISOString() });
            this._localSaveUsers(users);
        } else if (admin.password !== '1') {
            admin.password = '1';
            this._localSaveUsers(users);
        }
    },

    // ============ 公共接口 ============

    /** 当前登录用户 */
    get currentUser() {
        try {
            const s = sessionStorage.getItem(this._sessionKey);
            return s ? JSON.parse(s) : null;
        } catch { return null; }
    },

    get isLoggedIn() { return !!this.currentUser; },

    get isAdmin() {
        const u = this.currentUser;
        return !!(u && u.role === 'admin');
    },

    /** 登录 */
    async login(username, password) {
        await this._detect();
        const name = (username || '').trim();
        const pwd = password || '';
        if (!name || !pwd) return { success: false, error: '请填写用户名和密码' };

        if (this._apiMode) {
            try {
                const r = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: name, password: pwd })
                });
                const data = await r.json();
                if (!data.success) return { success: false, error: data.error };
                this._setSession(data.user);
                return { success: true, user: data.user };
            } catch (e) {
                return { success: false, error: '服务器连接失败，请确认服务已启动' };
            }
        }

        // local 模式
        this._localEnsureAdmin();
        const users = this._localGetUsers();
        const user = users.find(u => u.username === name && u.password === pwd);
        if (!user) return { success: false, error: '用户名或密码错误' };
        const session = { username: user.username, role: user.role, loginAt: new Date().toISOString() };
        this._setSession(session);
        return { success: true, user: session };
    },

    /** 注册 */
    async register(username, password) {
        await this._detect();
        const name = (username || '').trim();
        const pwd = password || '';

        if (!name || name.length < 2) return { success: false, error: '用户名至少 2 个字符' };
        if (!pwd || pwd.length < 6) return { success: false, error: '密码至少 6 位' };
        if (name.toLowerCase() === 'admin') return { success: false, error: '该用户名已被保留' };

        if (this._apiMode) {
            try {
                const r = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: name, password: pwd })
                });
                const data = await r.json();
                return { success: data.success, error: data.error };
            } catch (e) {
                return { success: false, error: '服务器连接失败，请确认服务已启动' };
            }
        }

        // local 模式
        this._localEnsureAdmin();
        const users = this._localGetUsers();
        if (users.some(u => u.username === name)) return { success: false, error: '用户名已存在' };
        users.push({ username: name, password: pwd, role: 'user', createdAt: new Date().toISOString() });
        this._localSaveUsers(users);
        return { success: true };
    },

    /** 登出 */
    logout() {
        sessionStorage.removeItem(this._sessionKey);
    },

    _setSession(user) {
        sessionStorage.setItem(this._sessionKey, JSON.stringify({
            username: user.username,
            role: user.role,
            loginAt: new Date().toISOString()
        }));
    },

    /** 管理员权限检查 */
    async requireAdmin(actionName) {
        await this._detect();
        if (this.isAdmin) return true;
        return new Promise((resolve) => {
            if (typeof UIRenderer === 'undefined') { resolve(false); return; }
            UIRenderer.showModal(
                '需要管理员权限',
                '<div style="text-align:center;padding:16px;">' +
                '<p style="font-size:40px;margin-bottom:12px;">🔒</p>' +
                '<p>操作「<strong>' + (actionName || '此操作') + '</strong>」需要<b>管理员</b>权限。</p>' +
                '<p style="color:var(--text-secondary);font-size:12px;">请使用管理员账户登录。</p>' +
                '</div>',
                () => resolve(false),
                () => resolve(false),
                { confirmText: '我知道了', hideCancel: true }
            );
        });
    },

    /** 显示登录/注册弹窗 */
    showLoginDialog(onSuccess) {
        const self = this;
        let currentMode = 'login';

        const buildBody = () => {
            const isReg = currentMode === 'register';
            const tabActive = 'flex:1;padding:10px;border:none;background:none;font-size:14px;cursor:pointer;border-bottom:2px solid var(--color-primary);color:var(--color-primary);font-weight:600;margin-bottom:-2px;transition:all 0.15s;';
            const tabInactive = 'flex:1;padding:10px;border:none;background:none;font-size:14px;cursor:pointer;border-bottom:2px solid transparent;color:var(--text-secondary);font-weight:400;margin-bottom:-2px;transition:all 0.15s;';

            return '<div id="auth-dialog">' +
                '<div style="display:flex;gap:0;margin-bottom:18px;border-bottom:2px solid var(--border-color);">' +
                '  <button id="auth-tab-login" style="' + (isReg ? tabInactive : tabActive) + '">登录</button>' +
                '  <button id="auth-tab-register" style="' + (isReg ? tabActive : tabInactive) + '">注册</button>' +
                '</div>' +
                '<div class="form-group">' +
                '  <label for="auth-username">用户名</label>' +
                '  <input id="auth-username" type="text" placeholder="请输入用户名" autocomplete="username" />' +
                '</div>' +
                '<div class="form-group">' +
                '  <label for="auth-password">密码</label>' +
                '  <input id="auth-password" type="password" placeholder="请输入密码" autocomplete="' + (isReg ? 'new-password' : 'current-password') + '" />' +
                '</div>' +
                (isReg ? '<p style="font-size:11px;color:var(--text-tertiary);margin-top:-4px;">注册后仅拥有浏览权限</p>' :
                 '<p style="font-size:11px;color:var(--text-tertiary);margin-top:-4px;">默认管理员: <code>admin</code> / <code>1</code></p>') +
                '<p id="auth-error" style="color:var(--color-danger);font-size:12px;margin-top:10px;display:none;"></p>' +
                '</div>';
        };

        const refreshDialog = () => {
            document.getElementById('modal-body').innerHTML = buildBody();
            const confirmBtn = document.getElementById('modal-confirm');
            if (confirmBtn) confirmBtn.textContent = currentMode === 'register' ? '注册并登录' : '登录';
            document.getElementById('modal-title').textContent = currentMode === 'register' ? '注册账户' : '账户登录';

            ['auth-tab-login', 'auth-tab-register'].forEach(btnId => {
                const el = document.getElementById(btnId);
                if (!el) return;
                const isLogin = btnId === 'auth-tab-login';
                el.addEventListener('click', () => {
                    const newMode = isLogin ? 'login' : 'register';
                    if (currentMode === newMode) return;
                    currentMode = newMode;
                    refreshDialog();
                });
            });

            const pwdEl = document.getElementById('auth-password');
            if (pwdEl) pwdEl.addEventListener('keydown', e => {
                if (e.key === 'Enter') document.getElementById('modal-confirm').click();
            });

            const userEl = document.getElementById('auth-username');
            if (userEl) setTimeout(() => userEl.focus(), 80);
        };

        UIRenderer.showModal(
            '账户登录', '',
            async () => {
                const username = document.getElementById('auth-username')?.value?.trim();
                const password = document.getElementById('auth-password')?.value?.trim();
                const errEl = document.getElementById('auth-error');
                const showErr = msg => { if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; } };
                if (errEl) errEl.style.display = 'none';

                if (!username || !password) { showErr('请填写用户名和密码'); return false; }

                if (currentMode === 'register') {
                    const regResult = await self.register(username, password);
                    if (!regResult.success) { showErr(regResult.error); return false; }
                    const loginResult = await self.login(username, password);
                    if (!loginResult.success) { showErr(loginResult.error); return false; }
                    if (onSuccess) onSuccess(loginResult.user);
                    if (typeof AppState !== 'undefined') AppState.refreshUI();
                    UIRenderer.showNotification('注册成功，欢迎 ' + username + '！', 'success');
                    return true;
                }

                const loginResult = await self.login(username, password);
                if (!loginResult.success) { showErr(loginResult.error); return false; }
                if (onSuccess) onSuccess(loginResult.user);
                if (typeof AppState !== 'undefined') AppState.refreshUI();
                UIRenderer.showNotification('登录成功，欢迎 ' + username + '！', 'success');
                return true;
            },
            null,
            { confirmText: '登录', cancelText: '取消' }
        );

        setTimeout(() => refreshDialog(), 50);
    }
};
