import '../css/style.css';
import '../css/base.css'; // 引入基础样式，确保 CSS 变量可用
import '../css/toast.css';
import { showToast } from './toast.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) {
        console.error('Login form not found!');
        return;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const result = await response.json();

            if (response.ok) {
                showToast('登录成功，正在跳转...', 'success');
                setTimeout(() => { window.location.href = '/'; }, 1000);
            } else {
                showToast(result.message || '登录失败', 'error');
            }
        } catch (error) {
            showToast('登录请求失败，请检查网络连接。', 'error');
        }
    });
});