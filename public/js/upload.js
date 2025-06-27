import { showToast } from './toast.js';

class UploadHandler {
  constructor(form, previewArea, formDateInput) {
    this.form = form;
    this.previewArea = previewArea;
    this.formDateInput = formDateInput;
    this.todayStr = new Date().toISOString().split('T')[0];
  }

  async handleUpload(e, allData, modal, updateTotalScore) {
    const target = e.target;
    
    if (target.classList.contains('upload-btn')) {
      document.getElementById(target.dataset.targetId).click();
      return;
    }

    if (target.classList.contains('file-delete-btn')) {
      e.preventDefault();
      const uploadType = target.dataset.type;
      const filePath = target.dataset.path;
      const date = this.formDateInput.value;
      const dayData = allData[date]?.items || {};

      // 验证：如果删除的是最后一个题目文档，必须先清空对应的讲解视频
      if (uploadType.endsWith('-doc')) {
          const docFiles = dayData[uploadType] || [];
          const videoType = uploadType.replace('-doc', '-video');
          const videoFiles = dayData[videoType] || [];

          if (docFiles.length === 1 && videoFiles.length > 0) {
              showToast('清空题目文件前，请先删除对应的讲解视频。', 'error');
              return;
          }
      }

      modal.showConfirm('确定要删除这个文件吗？', async () => {
        try {
          const response = await fetch('/api/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: this.formDateInput.value,
              uploadType: uploadType,
              filePath: filePath
            })
          });

          const result = await response.json();
          if (!response.ok) throw new Error(result.message);

          showToast('删除成功！', 'success');
          
          const updatedDayData = result.data; // 从后端获取更新后的日期数据
          allData[date] = updatedDayData; // 更新本地 allData 缓存
          modal.calendar.updateDayCell(date, updatedDayData); // 局部更新日历单元格
          updateTotalScore(); // 更新总分数
          const isCurrentDatePast = new Date(this.formDateInput.value).setHours(0,0,0,0) < new Date(this.todayStr).setHours(0,0,0,0);
          modal.showModal(this.formDateInput.value, isCurrentDatePast, allData); // 刷新模态框内容
        } catch (error) {
          showToast(`删除失败: ${error.message}`, 'error');
        }
      });
      return;
    }
  }

  async handleFileChange(e, allData, modal, updateTotalScore) {
    if (e.target.type === 'file') {
      const fileInput = e.target;
      const uploadType = fileInput.id; // 获取 uploadType
      const parent = fileInput.closest('.item-action') || fileInput.closest('.sub-item-action');
      const selectBtn = parent.querySelector('.upload-btn');

      const updateButtonState = (text, disabled) => {
        selectBtn.textContent = text;
        selectBtn.disabled = disabled;
      };

      if (fileInput.files.length > 0) {
        updateButtonState('上传中...', true);

        await this._performUpload(uploadType, fileInput.files, allData, modal, updateTotalScore);

        // 上传完成后，根据当前文件数量更新按钮文本
        const currentFiles = allData[this.formDateInput.value]?.items?.[uploadType] || [];
        const canUploadMore = currentFiles.length < 10;
        const newButtonText = currentFiles.length > 0 ? `继续上传 (${currentFiles.length}/10)` : '选择文件';
        updateButtonState(newButtonText, !canUploadMore);

        fileInput.value = ''; // 清空已选择的文件，以便可以再次选择相同文件
      } else {
        updateButtonState('选择文件', false);
      }
    }
  }

  /**
   * 执行实际的文件上传操作。
   * @param {string} uploadType - 上传类型
   * @param {FileList} files - 用户选择的文件列表
   * @param {object} allData - 全局数据对象
   * @param {Modal} modal - Modal 实例
   * @param {function} updateTotalScore - 更新总分数的函数
   * @private
   */
  async _performUpload(uploadType, files, allData, modal, updateTotalScore) {
    const dateValue = this.formDateInput.value;
    const dayData = allData[dateValue]?.items || {};

    // 验证：上传视频前必须先上传题目
    if (uploadType.endsWith('-task-video')) {
      const docType = uploadType.replace('-video', '-doc');
      const docFiles = dayData[docType] || [];
      if (docFiles.length === 0) {
        showToast('先上传题目图片或PDF，再上传讲解视频', 'error');
        return;
      }
    }

    const formData = new FormData();
    formData.append('date', dateValue);
    formData.append('uploadType', uploadType);

    for (const file of files) {
      formData.append(uploadType, file);
      if (file.type.startsWith('video/')) {
        try {
          const thumbnailBlob = await this.generateVideoThumbnailBlob(file);
          const thumbnailFileName = `${file.name.split('.').slice(0, -1).join('.')}_thumbnail.jpeg`;
          formData.append(`${uploadType}_thumbnail`, thumbnailBlob, thumbnailFileName);
        } catch (error) {
          console.error('视频缩略图生成失败:', error);
          showToast('视频缩略图生成失败，可能不支持此格式或文件损坏。', 'error');
        }
      }
    }

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message);
      }

      showToast('上传成功！', 'success');

      const updatedDayData = result.data;
      allData[dateValue] = updatedDayData;
      modal.calendar.updateDayCell(dateValue, updatedDayData);
      updateTotalScore();
      const isCurrentDatePast = new Date(this.formDateInput.value).setHours(0, 0, 0, 0) < new Date(this.todayStr).setHours(0, 0, 0, 0);
      modal.showModal(this.formDateInput.value, isCurrentDatePast, allData);
    } catch (error) {
      showToast(`上传失败: ${error.message}`, 'error');
      console.error('上传错误:', error);
    }
  }

  /**
   * 客户端生成视频缩略图的 Blob。
   * @param {File} videoFile - 视频文件对象。
   * @returns {Promise<Blob>} - 缩略图的 Blob 对象。
   */
  generateVideoThumbnailBlob(videoFile) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous'; // 确保 CORS 兼容性
      video.src = URL.createObjectURL(videoFile);

      video.addEventListener('loadeddata', () => { video.currentTime = 0.5; }, { once: true }); // 0.5秒处
      video.addEventListener('seeked', () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 200; // 缩略图最大宽度
        const maxHeight = 150; // 缩略图最大高度
        let width = video.videoWidth;
        let height = video.videoHeight;

        // 等比例缩放
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, width, height);

        canvas.toBlob((blob) => {
          URL.revokeObjectURL(video.src); // 释放 Blob URL
          resolve(blob);
        }, 'image/jpeg', 0.8); // JPEG 格式，80% 质量
      }, { once: true });

      video.addEventListener('error', (e) => {
        URL.revokeObjectURL(video.src);
        reject(new Error('视频加载错误，无法生成缩略图。'));
      }, { once: true });
    });
  }
}

export default UploadHandler;