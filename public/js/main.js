import Calendar from './calendar.js';
import UploadHandler from './upload.js';
import Modal from './modal.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 初始化元素
    const calendarContainer = document.getElementById('calendar-container');
    const totalScoreEl = document.getElementById('total-score');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');
    const modalTitle = document.getElementById('modal-title');
    const uploadForm = document.getElementById('upload-form');
    const previewArea = document.getElementById('preview-area');
    const formDateInput = document.getElementById('form-date');
    const closeModalBtn = document.getElementById('close-modal-btn');

    // 初始化模块
    const todayStr = new Date().toISOString().split('T')[0];
    const calendar = new Calendar(calendarContainer, todayStr);
    const uploadHandler = new UploadHandler(uploadForm, previewArea, formDateInput);
    const modal = new Modal(modalOverlay, modalContent, modalTitle, uploadForm, formDateInput);

    let allData = {};

    // 初始化数据
    async function initialize() {
        allData = await fetchData();
        await calendar.initialize(allData);
        updateTotalScore();
        return allData; // 返回更新后的数据
    }

    async function fetchData() {
        try {
            const response = await fetch('/api/data');
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('获取数据失败:', error);
            alert('无法从服务器加载数据，请刷新页面重试。');
            return {};
        }
    }

    function updateTotalScore() {
        let total = 0;
        for (const date in allData) {
            total += allData[date].score;
        }
        totalScoreEl.textContent = total;
    }

    // 事件监听
    calendarContainer.addEventListener('click', (e) => {
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

    closeModalBtn.addEventListener('click', () => modalOverlay.classList.add('hidden'));
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) modalOverlay.classList.add('hidden');
    });

    uploadForm.addEventListener('click', (e) => uploadHandler.handleUpload(e, allData, initialize, modal.showModal.bind(modal)));
    uploadForm.addEventListener('change', (e) => uploadHandler.handleFileChange(e));

    // 启动应用
    initialize();
});
