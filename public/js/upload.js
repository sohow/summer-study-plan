class UploadHandler {
  constructor(form, previewArea, formDateInput) {
    this.form = form;
    this.previewArea = previewArea;
    this.formDateInput = formDateInput;
    this.todayStr = new Date().toISOString().split('T')[0];
    console.log('UploadHandler初始化完成，当前日期:', this.todayStr, '表单日期输入:', this.formDateInput);
  }

  async handleUpload(e, allData, initializeCallback, showModalCallback) {
    const target = e.target;
    
    if (target.classList.contains('upload-btn')) {
      document.getElementById(target.dataset.targetId).click();
      return;
    }

    if (target.classList.contains('delete-btn')) {
      e.preventDefault();
      const uploadType = target.dataset.type;
      if (confirm('确定要删除这个上传记录吗？')) {
        try {
          const response = await fetch('/api/delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              date: this.formDateInput.value,
              uploadType: uploadType
            })
          });

          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.message);
          }

          alert('删除成功！');
          const updatedData = await initializeCallback();
          showModalCallback(this.todayStr, false, updatedData);
        } catch (error) {
          alert(`删除失败: ${error.message}`);
        }
      }
    }

    if (target.classList.contains('submit-btn')) {
      e.preventDefault();
      const uploadType = target.dataset.type;
      const fileInput = document.getElementById(uploadType);
      
      if (fileInput.files.length === 0) {
        alert('请先选择文件！');
        return;
      }

      const formData = new FormData();
      const dateValue = this.formDateInput.value;
      console.log('上传日期参数:', dateValue); // 调试日志
      if (!dateValue) {
        alert('日期参数无效，请刷新页面重试');
        return;
      }
      formData.append('date', dateValue);
      formData.append('uploadType', uploadType);
      for (const file of fileInput.files) {
        formData.append(uploadType, file);
      }

      const submitButton = target;
      submitButton.textContent = '上传中...';
      submitButton.disabled = true;

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message);
        }

        submitButton.textContent = '确认上传';
        submitButton.disabled = false;
        
        alert('上传成功！');
        const updatedData = await initializeCallback();
        showModalCallback(this.formDateInput.value, true, updatedData);
      } catch (error) {
        console.error('上传错误:', error);
        alert(`上传失败: ${error.message}`);
        submitButton.textContent = '确认上传';
        submitButton.disabled = false;
      }
    }
  }

  handleFileChange(e) {
    if (e.target.type === 'file') {
      const fileInput = e.target;
      const parent = fileInput.closest('.item-action') || fileInput.closest('.sub-item-action');
      const selectBtn = parent.querySelector('.upload-btn');
      const submitBtn = parent.querySelector('.submit-btn');

      if (fileInput.files.length > 0) {
        selectBtn.textContent = `已选 ${fileInput.files.length} 个文件`;
        submitBtn.style.display = 'inline-block';
      } else {
        selectBtn.textContent = '选择文件';
        submitBtn.style.display = 'none';
      }
    }
  }
}

export default UploadHandler;