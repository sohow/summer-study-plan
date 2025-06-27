/**
 * 获取或创建用于存放所有 toast 通知的容器。
 * @returns {HTMLElement} toast 容器元素
 */
function getToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

// 定义不同类型 Toast 的 SVG 图标
const toastIcons = {
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>', // Info icon
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-8.93"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>', // Check icon
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>' // X icon
};

/**
 * 显示一个自定义的消息提醒 (toast)。
 * @param {string} message - 要显示的消息内容。
 * @param {'info'|'success'|'error'} type - 消息类型，用于决定样式。
 * @param {number} duration - 消息显示的持续时间（毫秒）。
 */
function showToast(message, type = 'info', duration = 3000) {
    const container = getToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // 创建一个 div 用于包裹图标和消息文本
    const contentDiv = document.createElement('div');
    contentDiv.className = 'toast-content';

    // 添加图标
    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.innerHTML = toastIcons[type] || toastIcons.info; // 默认使用 info 图标
    contentDiv.appendChild(iconSpan);

    const messageEl = document.createElement('span');
    messageEl.className = 'toast-message';
    messageEl.textContent = message;
    contentDiv.appendChild(messageEl);

    const closeButton = document.createElement('button');
    closeButton.className = 'toast-close-btn';
    closeButton.innerHTML = '&times;';
    closeButton.setAttribute('aria-label', 'Close');

    toast.appendChild(contentDiv); // 将内容 div 添加到 toast
    toast.appendChild(closeButton);

    container.appendChild(toast);

    // 触发淡入动画
    setTimeout(() => toast.classList.add('show'), 10);

    const removeToast = () => {
        toast.classList.remove('show');
        // 等待淡出动画结束后再移除元素
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    };

    const timeoutId = setTimeout(removeToast, duration);

    closeButton.addEventListener('click', () => {
        clearTimeout(timeoutId);
        removeToast();
    });
}

export { showToast };