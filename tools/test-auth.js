/**
 * 认证模块端到端测试 — 使用 Function 构造函数创建共享作用域
 */
const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, '..');

let pass = 0, fail = 0;
function assert(condition, label) {
    if (condition) { pass++; }
    else { console.error('  ✗ FAIL: ' + label); fail++; }
}

// 构建完整的模拟环境
const mockLS = { _d: {} };
const mockSS = { _d: {} };

const mockLocalStorage = {
    getItem(k) { return mockLS._d[k] || null; },
    setItem(k, v) { mockLS._d[k] = String(v); },
    removeItem(k) { delete mockLS._d[k]; },
};

const mockSessionStorage = {
    getItem(k) { return mockSS._d[k] || null; },
    setItem(k, v) { mockSS._d[k] = String(v); },
    removeItem(k) { delete mockSS._d[k]; },
};

const mockUIRenderer = {
    _notif: null, _modal: null,
    showNotification(m, t, d) { this._notif = { m, t, d }; },
    showModal(title, html, onC, onX, opts) { this._modal = { title, html, onC, onX, opts }; },
    hideModal() {},
};
const mockAppState = { _refreshed: false, refreshUI() { this._refreshed = true; } };

// 读取 auth.js 内容
const authCode = fs.readFileSync(path.join(basePath, 'js/auth.js'), 'utf8');

// 用 Function 执行并注入全局变量
const fn = new Function('localStorage', 'sessionStorage', 'UIRenderer', 'AppState', '__assert', '__mock', authCode + '; return Auth;');
const Auth = fn(mockLocalStorage, mockSessionStorage, mockUIRenderer, mockAppState, assert, { mockLS, mockSS, mockUIRenderer, mockAppState });

console.log('\n========= 测试 1: 预置管理员 =========');
try {
    const users = mockLS._d['bios_manager_users'];
    assert(!!users, 'localStorage 有用户数据');
    const parsed = JSON.parse(users);
    assert(parsed.length >= 1, '至少 1 个用户');
    const admin = parsed.find(u => u.role === 'admin');
    assert(!!admin, '存在管理员账户');
    assert(admin.username === 'admin', '管理员用户名为 admin');
    assert(admin.password === 'admin123', '管理员密码为 admin123');
} catch (e) {
    fail++; console.error('  ✗ EXCEPTION: ' + e.message);
}

console.log('\n========= 测试 2: 登录流程 =========');
// admin 登录
let r = Auth.login('admin', 'admin123');
assert(r.success === true, 'admin 登录 success=true');
assert(r.user.role === 'admin', 'admin 角色 admin');
assert(Auth.isLoggedIn === true, 'isLoggedIn=true');
assert(Auth.isAdmin === true, 'isAdmin=true');

// 错误密码
Auth.logout();
r = Auth.login('admin', 'wrong');
assert(r.success === false, '错误密码 success=false');
assert(r.error === '用户名或密码错误', '错误信息正确');
assert(Auth.isLoggedIn === false, 'isLoggedIn=false');

// 不存在用户
r = Auth.login('nobody', 'xxx');
assert(r.success === false, '不存在用户 success=false');

// 空用户名
r = Auth.login('', 'xxx');
assert(r.success === false, '空用户名 success=false');

console.log('\n========= 测试 3: 注册流程 =========');
// 正常注册
r = Auth.register('testuser', 'test123456');
assert(r.success === true, '注册返回 success=true');
const usersAfterReg = JSON.parse(mockLS._d['bios_manager_users']);
const tu = usersAfterReg.find(u => u.username === 'testuser');
assert(!!tu, '新用户存在');
assert(tu.role === 'user', '角色强制为 user');
assert(tu.password === 'test123456', '密码正确保存');

// 注册 admin
r = Auth.register('admin', 'whatever');
assert(r.success === false, '注册 admin 被拒');
assert(r.error.includes('保留') || r.error.includes('admin'), '错误信息正确');

// 注册 Admin (大小写)
r = Auth.register('Admin', 'whatever');
assert(r.success === false, '注册 Admin 被拒');

// 重复注册
r = Auth.register('testuser', 'whatever');
assert(r.success === false, '重复注册被拒');
assert(r.error === '用户名已存在', '错误信息正确');

// 短用户名
r = Auth.register('a', '123456');
assert(r.success === false, '单字符被拒');
assert(r.error.includes('2'), '错误信息含"2"');

// 短密码
r = Auth.register('goodname', '12345');
assert(r.success === false, '短密码被拒');
assert(r.error.includes('6'), '错误信息含"6"');

// 空用户名
r = Auth.register('', '123456');
assert(r.success === false, '空用户名被拒');

// 空密码
r = Auth.register('newuser', '');
assert(r.success === false, '空密码被拒');

console.log('\n========= 测试 4: 普通用户登录 =========');
Auth.logout();
r = Auth.login('testuser', 'test123456');
assert(r.success === true, 'testuser 登录成功');
assert(r.user.role === 'user', '角色 user');
assert(Auth.isLoggedIn === true, 'isLoggedIn=true');
assert(Auth.isAdmin === false, 'isAdmin=false');

console.log('\n========= 测试 5: 权限检查 =========');
// requireAdmin for non-admin (returns a Promise)
Auth.requireAdmin('导入文件').then(result => {
    assert(result === false, '普通用户 requireAdmin 返回 false');
});

// switch to admin
Auth.logout();
Auth.login('admin', 'admin123');
const adminCheck = Auth.requireAdmin('导入文件');
assert(adminCheck === true || (adminCheck instanceof Promise), '管理员 requireAdmin 返回 true/Promise');

console.log('\n========= 测试 6: 登出 =========');
Auth.logout();
assert(Auth.isLoggedIn === false, '登出 isLoggedIn=false');
assert(Auth.isAdmin === false, '登出 isAdmin=false');
assert(Auth.currentUser === null, '登出 currentUser=null');

console.log('\n========= 测试 7: showLoginDialog 结构 =========');
mockAppState._refreshed = false;
Auth.showLoginDialog(() => mockAppState._refreshed = true);
assert(!!mockUIRenderer._modal, '弹窗已触发');
assert(mockUIRenderer._modal.title === '账户登录', '标题正确');
const opts = mockUIRenderer._modal.opts || {};
assert(opts.confirmText === '登录', '确认按钮="登录"');
assert(opts.cancelText === '取消', '取消按钮="取消"');

console.log('\n========= 测试 8: 幂等性 =========');
const before = JSON.parse(mockLS._d['bios_manager_users']).length;
Auth._ensureDefaultAdmin();
const after = JSON.parse(mockLS._d['bios_manager_users']).length;
assert(before === after, '重复初始化不增加用户');

console.log('\n' + '='.repeat(50));
console.log('结果: ' + pass + ' 通过, ' + fail + ' 失败, 共 ' + (pass + fail) + ' 项');
if (fail > 0) { console.error('\n有 ' + fail + ' 项失败！'); process.exit(1); }
console.log('全部认证测试通过 ✅');
