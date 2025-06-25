class Calendar {
  constructor(container, todayStr) {
    this.container = container;
    this.todayStr = todayStr;
    this.today = new Date(todayStr);
    this.today.setHours(0, 0, 0, 0);
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
      
      calendarDiv.innerHTML = `
        <div class="calendar-header">${year}年 ${date.getMonth() + 1}月</div>
        <div class="calendar-grid">
          ${['日', '一', '二', '三', '四', '五', '六'].map(d => `<div class="day-name">${d}</div>`).join('')}
        </div>
      `;

      const grid = calendarDiv.querySelector('.calendar-grid');
      const firstDayOfWeek = date.getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let i = 0; i < firstDayOfWeek; i++) {
        grid.innerHTML += `<div class="day-cell empty"></div>`;
      }

        for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        console.log('生成日历单元格，日期:', dateStr); // 调试日志
        const dayData = allData[dateStr] || { score: 0 };

        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.dataset.date = dateStr;

        const cellDate = new Date(dateStr);
        cellDate.setHours(0,0,0,0);
        if ((cellDate < this.today && cellDate >= '2025-06-24') || dayData.score > 0) {
          if (dayData.score === 0) cell.classList.add('score-red');
          else if (dayData.score <= 2) cell.classList.add('score-yellow');
          else if (dayData.score <= 4) cell.classList.add('score-green');
          else cell.classList.add('score-blue');
        }

        if (dateStr === this.todayStr) {
          cell.classList.add('today');
        }

        cell.innerHTML = `
          <div class="day-number">${day}</div>
          <div class="day-score">${dayData.score > 0 ? `${dayData.score}分` : ''}</div>
        `;
        grid.appendChild(cell);
      }
      this.container.appendChild(calendarDiv);
    });
  }
}

export default Calendar;