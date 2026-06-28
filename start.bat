@echo off
echo ========================================
echo   BIOS 选项管理器 - 内网持久化版
echo   按 Ctrl+C 停止服务器
echo ========================================
echo.
echo 首次运行需要安装依赖: npm install
echo 启动后内网访问: http://你的IP:3000
echo.

:: 使用 Node.js Express 后端
node server.js
pause
