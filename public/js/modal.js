class Modal {
  constructor(modalOverlay, modalContent, modalTitle, uploadForm, formDateInput) {
    this.modalOverlay = modalOverlay;
    this.modalContent = modalContent;
    this.modalTitle = modalTitle;
    this.uploadForm = uploadForm;
    this.formDateInput = formDateInput;
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
  }

  initModalState(dateStr) {
    this.modalTitle.textContent = `${dateStr} 学习记录`;
    this.formDateInput.value = dateStr;
    this.uploadForm.innerHTML = '';
    this.uploadForm.style.display = 'none';
  }


  renderUploadForm(tasks, dayData, isReadOnly = false) {
    this.uploadForm.style.display = 'block';
    const fragment = document.createDocumentFragment();
    
    tasks.forEach(task => {
      const itemDiv = this.createUploadItem(task, dayData, isReadOnly);
      fragment.appendChild(itemDiv);
    });
    
    this.uploadForm.appendChild(fragment);
  }

  showModalOverlay() {
    this.modalOverlay.classList.remove('hidden');
  }

  showMessage(message) {
    this.initModalState('提示');
    this.previewArea.innerHTML = `<p class="no-record-all">${message}</p>`;
    this.showModalOverlay();
  }
  getTasks() {
    return [
      { id: 'morning-video', label: '早上背单词课文精读录屏', time: '6:00-10:00', types: 'video/*', size: '1GB' },
      { id: 'evening-video', label: '晚上背单词课文精读录屏', time: '18:00-22:00', types: 'video/*', size: '1GB' },
      { 
        id: 'english-task', 
        label: '英语刷题', 
        time: '6:00-22:00', 
        subTasks: [
          { id: 'english-task-doc', label: '上传题目/答案(图片/PDF)', types: 'image/*,.pdf', size: '100MB' },
          { id: 'english-task-video', label: '上传讲解视频', types: 'video/*', size: '2GB' }
        ]
      },
      { 
        id: 'math-task', 
        label: '数学刷题', 
        time: '6:00-22:00', 
        subTasks: [
          { id: 'math-task-doc', label: '上传题目/答案(图片/PDF)', types: 'image/*,.pdf', size: '100MB' },
          { id: 'math-task-video', label: '上传讲解视频', types: 'video/*', size: '2GB' }
        ]
      },
      { 
        id: 'physics-task', 
        label: '物理刷题', 
        time: '6:00-22:00', 
        subTasks: [
          { id: 'physics-task-doc', label: '上传题目/答案(图片/PDF)', types: 'image/*,.pdf', size: '100MB' },
          { id: 'physics-task-video', label: '上传讲解视频', types: 'video/*', size: '2GB' }
        ]
      },
    ];
  }

  generateTaskPreview(task, dayData) {
    let taskPreviewHTML = `<div class="preview-item"><strong>${task.label}</strong>`;
    let hasSubContent = false;
    
    task.subTasks.forEach(subTask => {
      const subFiles = dayData[subTask.id];
      taskPreviewHTML += `<div class="sub-preview-item"><strong>${subTask.label}</strong>`;
      
      if (subFiles && subFiles.length > 0) {
        hasSubContent = true;
        subFiles.forEach(file => {
          taskPreviewHTML += this.generateFilePreview(file);
        });
      } else {
        taskPreviewHTML += `<span class="no-record">未上传</span>`;
      }
      
      taskPreviewHTML += `</div>`;
    });
    
    taskPreviewHTML += `</div>`;
    return { html: taskPreviewHTML, hasContent: hasSubContent };
  }

  generatePreviewHTML(task, dayData) {
    const files = dayData[task.id];
    let previewHTML = `<div class="preview-item"><strong>${task.label}</strong>`;
    let hasContent = false;

    if (files && files.length > 0) {
      hasContent = true;
      files.forEach(file => {
        previewHTML += this.generateFilePreview(file);
      });
    } else {
      previewHTML += `<span class="no-record">未上传</span>`;
    }
    previewHTML += `</div>`;
    return { html: previewHTML, hasContent };
  }

  generateFilePreview(file) {
    if (file.type.startsWith('image/')) {
      return `<div class="file-preview">
        <a href="${file.path}" target="_blank"><img src="${file.path}" alt="${file.name}" onerror="this.style.display='none';this.parentNode.querySelector('.file-name').textContent='图片加载失败: '+this.alt" /></a>
        <div class="file-name">${file.name}</div>
      </div>`;
    } else if (file.type.startsWith('video/')) {
      return `<div class="file-preview">
        <video src="${file.path}" controls onerror="this.style.display='none';this.parentNode.querySelector('.file-name').textContent='视频加载失败: '+this.parentNode.querySelector('.file-name').textContent"></video>
        <div class="file-name">${file.name}</div>
      </div>`;
    } else if (file.type === 'application/pdf') {
      return `<div class="file-preview">
        <p><a class="pdf-link" href="${file.path}" target="_blank">📄 查看PDF: ${file.name}</a></p>
        <div class="file-name">${file.name}</div>
      </div>`;
    }
    return '';
  }

  createUploadItem(task, dayData, isReadOnly = false) {
    const isUploaded = dayData[task.id];
    const itemDiv = document.createElement('div');
    itemDiv.className = 'upload-item';
    
    if (task.subTasks) {
      itemDiv.innerHTML = `
        <div class="item-info">
          <label>${task.label}</label>
          <span class="time-limit">时间: ${task.time}</span>
        </div>
      `;
      
      task.subTasks.forEach(subTask => {
        const subItemDiv = this.createSubUploadItem(subTask, dayData[subTask.id], isReadOnly);
        itemDiv.appendChild(subItemDiv);
      });
    } else {
      itemDiv.innerHTML = `
        <div class="item-info">
          <label for="${task.id}">${task.label}</label>
          <span class="time-limit">时间: ${task.time} / 大小: ${task.size}</span>
        </div>
        <div class="item-action">
          <input type="file" id="${task.id}" name="${task.id}" accept="${task.types}" ${isUploaded || isReadOnly ? 'disabled' : ''} multiple style="display: none;">
          <button type="button" class="upload-btn" data-target-id="${task.id}" ${isUploaded || isReadOnly ? 'disabled' : ''}>${isUploaded ? '✔ 已上传' : '选择文件'}</button>
          <button type="submit" class="submit-btn" data-type="${task.id}" style="display: none;">确认上传</button>
          ${isUploaded && !isReadOnly ? `<button type="button" class="delete-btn" data-type="${task.id}">删除</button>` : ''}
        </div>
      `;
      if (isUploaded) {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'upload-preview';
        const files = dayData[task.id];
        files.forEach(file => {
          previewDiv.innerHTML += this.generateFilePreview(file);
        });
        itemDiv.appendChild(previewDiv);
      }
    }
    return itemDiv;
  }

  createSubUploadItem(subTask, isUploaded, isReadOnly = false) {
    const subItemDiv = document.createElement('div');
    subItemDiv.className = 'sub-upload-item';
    subItemDiv.innerHTML = `
      <div class="sub-item-info">
        <label for="${subTask.id}">${subTask.label}</label>
        <span class="size-limit">大小: ${subTask.size}</span>
      </div>
      <div class="sub-item-action">
        <input type="file" id="${subTask.id}" name="${subTask.id}" accept="${subTask.types}" ${isUploaded || isReadOnly ? 'disabled' : ''} style="display: none;">
        <button type="button" class="upload-btn" data-target-id="${subTask.id}" ${isUploaded || isReadOnly ? 'disabled' : ''}>${isUploaded ? '✔ 已上传' : '选择文件'}</button>
        <button type="submit" class="submit-btn" data-type="${subTask.id}" style="display: none;">确认上传</button>
        ${isUploaded && !isReadOnly ? `<button type="button" class="delete-btn" data-type="${subTask.id}">删除</button>` : ''}
      </div>
    `;
    if (isUploaded) {
      const previewDiv = document.createElement('div');
      previewDiv.className = 'sub-upload-preview';
      isUploaded.forEach(file => {
        previewDiv.innerHTML += this.generateFilePreview(file);
      });
      subItemDiv.appendChild(previewDiv);
    }
    return subItemDiv;
  }
}

export default Modal;