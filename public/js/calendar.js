class Calendar {
  constructor(container, todayStr) {
    this.container = container;
    this.todayStr = todayStr;
    this.today = new Date(todayStr);
    this.today.setHours(0, 0, 0, 0);
    this.startDate = new Date('2025-06-24');
    this.startDate.setHours(0, 0, 0, 0);
  }

  async initialize(allData) {
    await this.generateCalendars(allData);
  }

  generateCalendars(allData) {
    this.container.innerHTML = '';
    const year = 2025;
    const months = [5, 6, 7];
    
    months.forEach(month => {
      const calendarDiv = document.createElement('div');
      calendarDiv.className = 'calendar';

      const date = new Date(year, month, 1);

      const header = document.createElement('div');
      header.className = 'calendar-header';
      header.textContent = `${year}年 ${date.getMonth() + 1}月`;
      calendarDiv.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'calendar-grid';
      ['日', '一', '二', '三', '四', '五', '六'].forEach(dayName => {
        const dayNameCell = document.createElement('div');
        dayNameCell.className = 'day-name';
        dayNameCell.textContent = dayName;
        grid.appendChild(dayNameCell);
      });

      const firstDayOfWeek = date.getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let i = 0; i < firstDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day-cell empty';
        grid.appendChild(emptyCell);
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        //console.log('生成日历单元格，日期:', dateStr); // 调试日志
        const dayData = allData[dateStr] || { score: 0 };

        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.dataset.date = dateStr;

        const cellDate = new Date(dateStr);
        cellDate.setHours(0,0,0,0);
        if ((cellDate < this.today && cellDate >= this.startDate) || dayData.score > 0) {
          if (dayData.score === 0) cell.classList.add('score-red');
          else if (dayData.score <= 2) cell.classList.add('score-yellow');
          else if (dayData.score <= 4) cell.classList.add('score-green');
          else cell.classList.add('score-blue');
        }

        if (dateStr === this.todayStr) {
          cell.classList.add('today');
        }

        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;

        const dayScore = document.createElement('div');
        dayScore.className = 'day-score';
        
        if (dayData.score > 0) {
          dayScore.textContent = `${dayData.score}分`;
        } else {
          // 插入一个占位符并隐藏，以确保所有单元格高度一致，防止布局变形
          dayScore.innerHTML = '&nbsp;';
          dayScore.style.visibility = 'hidden';
        }
        cell.appendChild(dayNumber);
        cell.appendChild(dayScore);
        grid.appendChild(cell);
      }
      calendarDiv.appendChild(grid);
      this.container.appendChild(calendarDiv);
    });
  }

  /**
   * 局部更新单个日历单元格的显示（分数和颜色）。
   * @param {string} dateStr - 日期字符串 (YYYY-MM-DD)。
   * @param {object} dayData - 该日期的最新数据对象，包含 score 和 items。
   */
  updateDayCell(dateStr, dayData) {
    const cell = this.container.querySelector(`.day-cell[data-date="${dateStr}"]`);
    if (!cell) {
      // console.warn(`未找到日期为 ${dateStr} 的日历单元格进行更新。`);
      return;
    }

    const dayScoreEl = cell.querySelector('.day-score');
    if (dayData.score > 0) {
      dayScoreEl.textContent = `${dayData.score}分`;
      dayScoreEl.style.visibility = 'visible';
    } else {
      dayScoreEl.innerHTML = '&nbsp;';
      dayScoreEl.style.visibility = 'hidden';
    }

    // 移除所有分数相关的颜色类，并根据新分数重新添加
    cell.classList.remove('score-red', 'score-yellow', 'score-green', 'score-blue');
    const cellDate = new Date(dateStr);
    cellDate.setHours(0,0,0,0); // Normalize to start of day for comparison
    if ((cellDate < this.today && cellDate >= this.startDate) || dayData.score > 0) {
      if (dayData.score === 0) cell.classList.add('score-red');
      else if (dayData.score <= 2) cell.classList.add('score-yellow');
      else if (dayData.score <= 4) cell.classList.add('score-green');
      else cell.classList.add('score-blue');
    }
  }
}

export default Calendar;