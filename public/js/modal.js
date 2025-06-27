import { TASKS_CONFIG } from '../../config/tasks.js';

class Modal {
  constructor(modalElements, confirmDialogElements, calendar) {
    this.elements = {
        modal: modalElements,
        confirmDialog: confirmDialogElements,
    };
    this.calendar = calendar;

    // 用于懒加载视频缩略图
    this.thumbnailObserver = null;
    this.thumbnailQueue = [];
    this.processingThumbnails = 0;
    this.MAX_CONCURRENT_THUMBNAILS = 3; // 限制并发生成数量
  }

  showModal(dateStr, isPastDate, allData) {
    console.log('显示模态框，日期参数:', dateStr); // 调试日志
    if (!dateStr) {
      console.error('showModal调用时dateStr参数为空');
      return;
    }
    
    // 初始化模态框状态
    this.initModalState(dateStr);
    
    const tasks = this.getTasks();
    console.log('allData: ', allData, 'dateStr: ', dateStr);
    const dayData = allData[dateStr]?.items || {};
    
    if (isPastDate) {
      // 过去日期显示只读表单
      this.renderUploadForm(tasks, dayData, true);
    } else {
      // 当前日期显示可编辑表单
      this.renderUploadForm(tasks, dayData);
    }

    this.showModalOverlay();
    this.initThumbnailGeneration(); // 初始化懒加载
  }

  initModalState(dateStr) {
    this.elements.modal.title.textContent = `${dateStr} 学习记录`;
    this.elements.modal.formDateInput.value = dateStr;
    this.elements.modal.uploadForm.innerHTML = '';
    this.elements.modal.uploadForm.style.display = 'none';
  }

  /**
   * 初始化视频缩略图的懒加载。
   * 使用 IntersectionObserver 监视所有需要客户端生成的视频缩略图占位符。
   */
  initThumbnailGeneration() {
    if (this.thumbnailObserver) {
      this.thumbnailObserver.disconnect();
    }
    this.thumbnailQueue = [];
    this.processingThumbnails = 0;

    const thumbnailImages = this.elements.modal.content.querySelectorAll('img[data-video-src-for-thumbnail]');
    if (thumbnailImages.length === 0) return;

    this.thumbnailObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          this.thumbnailQueue.push({ img, videoSrc: img.dataset.videoSrcForThumbnail });
          this.processThumbnailQueue();
          observer.unobserve(img);
        }
      });
    }, { root: this.elements.modal.content, rootMargin: '100px' });

    thumbnailImages.forEach(img => this.thumbnailObserver.observe(img));
  }

  /**
   * 处理缩略图生成队列，限制并发数量。
   */
  processThumbnailQueue() {
    while (this.thumbnailQueue.length > 0 && this.processingThumbnails < this.MAX_CONCURRENT_THUMBNAILS) {
      const { img, videoSrc } = this.thumbnailQueue.shift();
      this.processingThumbnails++;
      this._generateVideoThumbnailInternal(img, videoSrc);
    }
  }

  /**
   * 内部方法，用于创建临时video元素并生成缩略图。
   * @param {HTMLImageElement} img - The <img> element to update.
   * @param {string} videoSrc - The URL of the video.
   * @private
   */
  _generateVideoThumbnailInternal(img, videoSrc) {
    const video = document.createElement('video');
    video.style.display = 'none';
    video.src = videoSrc;
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    const cleanupAndProcessNext = () => {
      video.remove();
      this.processingThumbnails--;
      this.processThumbnailQueue();
    };

    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        img.src = canvas.toDataURL('image/jpeg');
      }
      cleanupAndProcessNext();
    }, { once: true });

    video.addEventListener('loadeddata', () => { video.currentTime = 0.5; }, { once: true });
    video.onerror = () => {
      img.src = 'images/error-placeholder.png'; // Fallback on error
      cleanupAndProcessNext();
    };

    document.body.appendChild(video);
  }

  renderUploadForm(tasks, dayData, isReadOnly = false) {
    this.elements.modal.uploadForm.style.display = 'block';
    const fragment = document.createDocumentFragment();
    
    tasks.forEach(task => {
      const itemDiv = this.createUploadItem(task, dayData, isReadOnly);
      fragment.appendChild(itemDiv);
    });
    
    this.elements.modal.uploadForm.appendChild(fragment);
  }

  showModalOverlay() {
    this.elements.modal.overlay.classList.remove('hidden');
  }

  hide() {
    this.elements.modal.overlay.classList.add('hidden');
  }

  showMessage(message) {
    this.initModalState('提示');
    this.elements.modal.uploadForm.innerHTML = `<p class="no-record-all">${message}</p>`;
    this.elements.modal.uploadForm.style.display = 'block';
    this.showModalOverlay();
  }

  showVideo(videoUrl, videoName) {
    const videoOverlay = document.createElement('div');
    videoOverlay.className = 'video-overlay';
    // 注意: 这需要相应的 CSS 来美化视频播放器浮层。
    videoOverlay.innerHTML = `
      <div class="video-player-container">
        <div class="video-header">
          <span class="video-title">${videoName}</span>
          <button class="close-video-btn" title="关闭">&times;</button>
        </div>
        <video src="${videoUrl}" controls autoplay>你的浏览器不支持播放此视频。</video>
      </div>
    `;
    document.body.appendChild(videoOverlay);
    document.body.style.overflow = 'hidden'; // 防止背景滚动

    const close = () => {
      videoOverlay.remove();
      document.body.style.overflow = '';
    };

    videoOverlay.querySelector('.close-video-btn').addEventListener('click', close);
    videoOverlay.addEventListener('click', (e) => {
      if (e.target === videoOverlay) close();
    });
  }

  /**
   * 显示确认弹窗。
   * @param {string} message - 确认消息。
   * @param {function} onConfirm - 用户点击“确定”时执行的回调函数。
   * @param {string} [title='请确认'] - 弹窗标题。
   */
  showConfirm(message, onConfirm) {
    this.elements.confirmDialog.message.textContent = message;
    this.elements.confirmDialog.overlay.classList.remove('hidden');

    // 确保每次打开时，事件监听器都是新的，避免重复触发
    const handleConfirm = () => { onConfirm(); this.hideConfirm(); };
    const handleCancel = () => { this.hideConfirm(); };

    this.elements.confirmDialog.confirmBtn.onclick = handleConfirm;
    this.elements.confirmDialog.cancelBtn.onclick = handleCancel;
    this.elements.confirmDialog.closeBtn.onclick = handleCancel; // 关闭按钮也视为取消
    this.elements.confirmDialog.overlay.onclick = (e) => { // 点击背景关闭
      if (e.target === this.elements.confirmDialog.overlay) handleCancel();
    };
  }

  hideConfirm() {
    this.elements.confirmDialog.overlay.classList.add('hidden');
  }

  getTasks() {
    return TASKS_CONFIG;
  }

  generateFilePreview(file, uploadType, isReadOnly) {
    const previewDiv = document.createElement('div');
    previewDiv.className = 'file-preview';

    if (!isReadOnly) {
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'file-delete-btn';
      deleteButton.title = '删除文件';
      deleteButton.innerHTML = '&times;';
      deleteButton.dataset.path = file.path;
      deleteButton.dataset.type = uploadType;
      previewDiv.appendChild(deleteButton);
    }

    const fileNameDiv = document.createElement('div');
    fileNameDiv.className = 'file-name';
    fileNameDiv.textContent = file.name;

    let previewContent;
    if (file.type.startsWith('image/')) {
      previewContent = document.createElement('a');
      previewContent.href = file.path;
      previewContent.target = '_blank';
      const img = document.createElement('img');
      img.src = file.path;
      img.alt = file.name;
      img.onerror = () => {
        img.style.display = 'none';
        fileNameDiv.textContent = '图片加载失败: ' + file.name;
      };
      previewContent.appendChild(img);
    } else if (file.type.startsWith('video/')) {
      previewDiv.classList.add('video-preview');
      previewContent = document.createElement('a');
      // Prevent default navigation, click is handled by main.js to show video player
      previewContent.href = '#';
      previewContent.className = 'video-preview-link';
      previewContent.title = `点击播放: ${file.name}`;
      previewContent.dataset.videoUrl = file.path;
      previewContent.dataset.videoName = file.name;

      const thumbnailImg = document.createElement('img');
      thumbnailImg.alt = file.name;

      if (file.thumbnailPath) {
        // 对于有预生成缩略图的视频，直接使用
        thumbnailImg.src = file.thumbnailPath;
        thumbnailImg.onerror = () => {
          thumbnailImg.src = 'images/error-placeholder.png'; // 确保此路径有效
          fileNameDiv.textContent = '视频缩略图加载失败';
        };
      } else {
        // 对于历史视频，使用懒加载在客户端生成缩略图
        thumbnailImg.dataset.videoSrcForThumbnail = file.path;
        // 可以设置一个默认的占位图
        thumbnailImg.src = 'images/video-placeholder.png'; // 确保此路径有效
      }

      const playIcon = document.createElement('div');
      playIcon.className = 'play-icon';
      previewContent.appendChild(thumbnailImg);
      previewContent.appendChild(playIcon);
    } else if (file.type === 'application/pdf') {
      previewContent = document.createElement('p');
      const link = document.createElement('a');
      link.className = 'pdf-link';
      link.href = file.path;
      link.target = '_blank';
      link.textContent = `📄 查看PDF: ${file.name}`;
      previewContent.appendChild(link);
    }

    if (previewContent) {
      previewDiv.appendChild(previewContent);
    }
    previewDiv.appendChild(fileNameDiv);
    return previewDiv;
  }

  createUploadItem(task, dayData, isReadOnly = false) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'upload-item';

    const itemInfo = document.createElement('div');
    itemInfo.className = 'item-info';

    const label = document.createElement('label');
    label.textContent = task.label;

    const timeLimit = document.createElement('span');
    timeLimit.className = 'time-limit';


    itemInfo.appendChild(label);
    itemInfo.appendChild(timeLimit);
    itemDiv.appendChild(itemInfo);

    if (task.subTasks) {
      task.subTasks.forEach(subTask => {
        const subItemDiv = this.createSubUploadItem(subTask, dayData[subTask.id] || [], isReadOnly);
        itemDiv.appendChild(subItemDiv);
      });
    } else {
      label.htmlFor = task.id;
      if (task.size) { // 仅当task.size存在时才显示大小
        timeLimit.textContent += ` 限制大小: ${task.size}`;
      }

      const files = dayData[task.id] || [];
      const hasFiles = files.length > 0;
      const canUpload = !isReadOnly && files.length < 10;

      const itemAction = this.createActionElements(task, files, canUpload);
      itemDiv.appendChild(itemAction);

      if (hasFiles) {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'upload-preview';
        files.forEach(file => {
          previewDiv.appendChild(this.generateFilePreview(file, task.id, isReadOnly));
        });
        itemDiv.appendChild(previewDiv);
      }
    }
    return itemDiv;
  }
  
  createActionElements(task, files, canUpload) {
    const actionDiv = document.createElement('div');
    actionDiv.className = task.subTasks ? 'sub-item-action' : 'item-action';
  
    let buttonText = '选择文件';
    if (files.length > 0) {
      buttonText = canUpload ? `继续上传 (${files.length}/10)` : `✔ 已上传 ${files.length}/10`;
    }
  
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = task.id;
    fileInput.name = task.id;
    fileInput.accept = task.types;
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    fileInput.disabled = !canUpload;
  
    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'upload-btn';
    uploadBtn.dataset.targetId = task.id;
    uploadBtn.textContent = buttonText;
    uploadBtn.disabled = !canUpload;
  
    actionDiv.appendChild(fileInput);
    actionDiv.appendChild(uploadBtn);
  
    return actionDiv;
  }

  createSubUploadItem(subTask, files, isReadOnly = false) {
    const subItemDiv = document.createElement('div');
    subItemDiv.className = 'sub-upload-item';

    const subItemInfo = document.createElement('div');
    subItemInfo.className = 'sub-item-info';

    const label = document.createElement('label');
    label.htmlFor = subTask.id;
    label.textContent = subTask.label;

    const sizeLimit = document.createElement('span');
    sizeLimit.className = 'size-limit';
    sizeLimit.textContent = `大小: ${subTask.size}`;

    subItemInfo.appendChild(label);
    subItemInfo.appendChild(sizeLimit);

    const canUpload = !isReadOnly && files.length < 10;
    const subItemAction = this.createActionElements(subTask, files, canUpload);

    subItemDiv.appendChild(subItemInfo);
    subItemDiv.appendChild(subItemAction);

    if (files.length > 0) {
      const previewDiv = document.createElement('div');
      previewDiv.className = 'sub-upload-preview';
      files.forEach(file => {
        previewDiv.appendChild(this.generateFilePreview(file, subTask.id, isReadOnly));
      });
      subItemDiv.appendChild(previewDiv);
    }

    return subItemDiv;
  }
}

export default Modal;