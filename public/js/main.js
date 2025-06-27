import Calendar from './calendar.js';
import UploadHandler from './upload.js';
import Modal from './modal.js';
import { showToast } from './toast.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 将所有 DOM 元素组织到一个对象中，便于管理和传递
    const elements = {
        calendarContainer: document.getElementById('calendar-container'),
        totalScoreEl: document.getElementById('total-score'),
        logoutBtn: document.getElementById('logout-btn'),
        modal: {
            overlay: document.getElementById('modal-overlay'),
            content: document.getElementById('modal-content'),
            title: document.getElementById('modal-title'),
            closeBtn: document.getElementById('close-modal-btn'),
            uploadForm: document.getElementById('upload-form'),
            previewArea: document.getElementById('preview-area'),
            formDateInput: document.getElementById('form-date'),
        },
        confirmDialog: {
            overlay: document.getElementById('confirm-dialog-overlay'),
            title: document.getElementById('confirm-dialog-title'),
            message: document.getElementById('confirm-dialog-message'),
            cancelBtn: document.getElementById('confirm-dialog-cancel-btn'),
            confirmBtn: document.getElementById('confirm-dialog-confirm-btn'),
            closeBtn: document.getElementById('confirm-dialog-close-btn'),
        }
    };

    // 初始化模块
    const todayStr = new Date().toISOString().split('T')[0];
    const calendar = new Calendar(elements.calendarContainer, todayStr);
    const uploadHandler = new UploadHandler(elements.modal.uploadForm, elements.modal.previewArea, elements.modal.formDateInput);
    const modal = new Modal(elements.modal, elements.confirmDialog, calendar);

    let allData = {};

    // 初始化数据
    async function initialize() {
        allData = await fetchData();
        await calendar.initialize(allData);
        updateTotalScore(allData);
        return allData; // 返回更新后的数据
    }

    async function fetchData() {
        try {
            const response = await fetch('/api/data');
            if (!response.ok) {
                // 如果响应不是2xx，特别是401，则重定向到登录页
                if (response.status === 401) {
                    showToast('会话已过期，请重新登录。', 'info');
                    window.location.href = '/login.html';
                    // 抛出错误以阻止后续处理，因为已经重定向
                    throw new Error('Authentication required, redirecting.');
                }
                throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('获取数据失败:', error);
            showToast('无法从服务器加载数据，请刷新页面重试。', 'error');
            return {};
        }
    }

    function updateTotalScore(data) {
        let total = 0;
        for (const date in data) {
            total += data[date].score;
        }
        elements.totalScoreEl.textContent = total;
    }

    // 事件监听
    elements.calendarContainer.addEventListener('click', (e) => {
        const cell = e.target.closest('.day-cell');
        if (!cell || cell.classList.contains('empty')) return;

        const dateStr = cell.dataset.date;
        console.log('点击日历单元格，日期:', dateStr); // 调试日志
        if (!dateStr) {
            console.error('日历单元格缺少date属性');
            return;
        }

        const clickedDate = new Date(dateStr);
        clickedDate.setHours(0,0,0,0);

        if (clickedDate > calendar.today) {
            modal.showMessage('未来不再遥远，脚踏实地');
        } else {
            modal.showModal(dateStr, clickedDate < calendar.today, allData);
        }
    });

    elements.modal.closeBtn.addEventListener('click', () => modal.hide());
    elements.modal.overlay.addEventListener('click', (e) => {
        if (e.target === elements.modal.overlay) modal.hide();
    });

    elements.modal.uploadForm.addEventListener('click', (e) => {
        const videoLink = e.target.closest('.video-preview-link');

        if (videoLink && videoLink.dataset.videoUrl) {
            e.preventDefault();
            const videoUrl = videoLink.dataset.videoUrl;
            const videoName = videoLink.dataset.videoName;
            modal.showVideo(videoUrl, videoName);
            return;
        }

        uploadHandler.handleUpload(e, allData, modal, () => updateTotalScore(allData));
    });
    elements.modal.uploadForm.addEventListener('change', (e) => uploadHandler.handleFileChange(e, allData, modal, () => updateTotalScore(allData)));

    // 登出事件监听
    elements.logoutBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST'
            });
            const result = await response.json();
            if (response.ok) {
                showToast('已成功退出登录。', 'info');
                window.location.href = '/login.html'; // 登出成功后跳转到登录页
            } else {
                showToast(result.message || '登出失败。', 'error');
            }
        } catch (error) {
            showToast('网络错误，无法登出。', 'error');
        }
    });

    // 启动应用
    initialize();
});
