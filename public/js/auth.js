import { showToast } from './toast.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');

            const username = usernameInput.value;
            const password = passwordInput.value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                const result = await response.json();

                if (response.ok) {
                    showToast('登录成功！', 'success');
                    window.location.href = '/'; // 登录成功后跳转到主页
                } else {
                    showToast(result.message || '登录失败，请检查用户名和密码。', 'error');
                }
            } catch (error) {
                console.error('登录请求失败:', error);
                showToast('网络错误，请稍后重试。', 'error');
            }
        });
    }
});