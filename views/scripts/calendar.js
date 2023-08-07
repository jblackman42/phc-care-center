class PHC_Calendar extends HTMLElement {
  constructor() {
    super();
    // set important stuff
    this.id = 'calendar-container';

    // globals
    this.dayMaxEvents = 21;
    this.monthsList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const today = new Date();
    this.month = today.getMonth();
    this.year = today.getFullYear();

    this.locationFilter = null;
    this.buildingFilter = null;
    this.roomFilter = null;
    this.featuredFilter = 0;
    this.places = [];
    this.monthArr = [];

    this.update();
    this.createDetailsPopup();
    this.createDatePicker();
  }
  
  update = async () => {
    try {
      loading();
      await this.getPlaces();
      await this.getEvents();
      this.createCalendar();
    } catch (error) {
      console.error(error);
    }
    doneLoading();
  }

  getPlaces = async () => {
    this.places = await axios({
      method: 'get',
      url: '/api/mp/places'
    })
      .then(response => response.data)
      .catch(err => {
        console.error(err)
        if (err.response.status == 403) window.location = 'login';
      })
  }

  getEvents = async () => {
    // Get all days that will be visible on calendar

    const startDate = new Date(this.year, this.month, 1);
    this.monthArr = [];

    while (startDate.getMonth() === this.month) {
      this.monthArr.push(startDate.toISOString());
      startDate.setDate(startDate.getDate() + 1);
    }

    const daysToGoBack = new Date(this.monthArr[0]).getDay();
    const currDate = new Date(this.monthArr[0])
    for (let i = 0; i < daysToGoBack; i ++) {
      currDate.setDate(currDate.getDate() - 1);
      this.monthArr.unshift(currDate.toISOString());
    }

    const monthStart = this.monthArr[0];
    const monthLastDay = new Date(this.monthArr[this.monthArr.length-1])
    const monthEnd = new Date(monthLastDay.getTime() + 86399999).toISOString()

    // console.log(monthStart)
    // console.log(monthEnd)

    this.events = await axios({
      method: 'get',
      url: '/api/mp/events',
      params: {
        monthStart: monthStart,
        monthEnd: monthEnd
      }
    })
      .then(response => response.data)
      .catch(err => {
        console.error(err)
        if (err.response.status == 403) window.location = 'login';
      })
  }

  createCalendar = () => {
    const events = this.filteredEvents || this.events;
    this.innerHTML = `
      <div id="calendar-controls">
          <div class="row">
            <h1>Care Center Meeting Calendar</h1>
          </div>
          <div class="row">
              <div class="date-selector">
                  <button class="nav-buttons" id="prev-month-btn"><i class="material-icons">keyboard_arrow_left</i></button>
                  <p id="date-label">${this.monthsList[this.month]} ${this.year}</p>
                  <button class="nav-buttons" id="next-month-btn"><i class="material-icons">keyboard_arrow_right</i></button>
              </div>
          </div>
      </div>

      <div id="calendar-labels">
          <p>s<span>unday</span></p>
          <p>m<span>onday</span></p>
          <p>t<span>uesday</span></p>
          <p>w<span>ednesday</span></p>
          <p>t<span>hursday</span></p>
          <p>f<span>riday</span></p>
          <p>s<span>aturday</span></p>
      </div>
      
      <div id="calendar">
        ${this.monthArr.map(day => {
          const currDate = new Date(day);
          const endOfCurrDate = new Date(currDate.getTime() + 86399999)
          const daysEvents = events.filter(event => currDate <= new Date(event.Event_End_Date) && endOfCurrDate >= new Date(event.Event_Start_Date));

          const monthDate = parseInt(currDate.getDate())
          let monthDaySuffix = 'th';
          let monthDayLastDigit = monthDate.toString().split('')[monthDate.toString().split('').length - 1]
          
          if (monthDayLastDigit == 1 && monthDate != 11) {
              monthDaySuffix = 'st'
          } else if (monthDayLastDigit == 2 && monthDate != 12) {
              monthDaySuffix = 'nd'
          } else if (monthDayLastDigit == 3 && monthDate != 13) {
              monthDaySuffix = 'rd'
          }

          return `
            <button class="calendar-day" ${daysEvents.length == 0 ? 'disabled' : ''}>
              <p>${monthDate}<sup>${monthDaySuffix}</sup></p>
              <p class="eventsNumber">${daysEvents.length} Meeting${daysEvents.length == 1 ? '' : 's'}</p>
              <div class="progressBar" style="max-width: ${Math.round((daysEvents.length / this.dayMaxEvents) * 100)}%"></div>
            </button>
          `
        }).join('')}
      </div>
    `

    const calendarDaysList = document.querySelectorAll('.calendar-day');
    calendarDaysList.forEach((elem, i) => {
      elem.onclick = () => this.showDetailsPopup(this.monthArr[i])
    })

    const nextMonthBtnDOM = document.getElementById('next-month-btn');
      nextMonthBtnDOM.onclick = this.nextMonth;
    const prevMonthBtnDOM = document.getElementById('prev-month-btn');
      prevMonthBtnDOM.onclick = this.prevMonth;

    const dateLabelDOM = document.getElementById('date-label')
      dateLabelDOM.onclick = this.showDatePicker;
  }

  nextMonth = () => {
    if (this.month < 11) {
      this.month ++;
    } else {
      this.month = 0;
      this.year ++;
    }

    this.update();
  }

  prevMonth = () => {
    if (this.month > 0) {
      this.month --;
    } else {
      this.month = 11;
      this.year --
    }

    this.update();
  }

  createDetailsPopup = () => {
    const eventDetailsPopupDOM = document.createElement('div');
    eventDetailsPopupDOM.id = 'popup-container';
    document.body.appendChild(eventDetailsPopupDOM)
  }

  showDetailsPopup = async (day, eventID) => {
    this.hideDetailsPopup();
    loading();

    const events = this.filteredEvents || this.events;

    const currDate = new Date(day);
    const endOfCurrDate = new Date(currDate.getTime() + 86399999)
    const daysEvents = events.filter(event => currDate <= new Date(event.Event_End_Date) && endOfCurrDate >= new Date(event.Event_Start_Date));
    
    if (daysEvents.length  == 0) {
      doneLoading();
      return;
    };

    const daysEventsRooms = await axios({
      method: 'get',
      url: '/api/mp/event-rooms',
      params: {
        eventIDs: daysEvents.map(event => event.Event_ID)
      }
    })
      .then(response => response.data)
      .catch(err => {
        console.error(err)
        if (err.response.status == 403) window.location = 'login';
      })

    const eventDetailsPopupDOM = document.getElementById('popup-container');
    eventDetailsPopupDOM.classList.add('open');

    eventDetailsPopupDOM.innerHTML = `
      <button id="prev-day-btn"><i class="material-icons">keyboard_arrow_left</i></button>
      <div id="popup">
          <div class="title">
              <h1 id="event-date">${currDate.toLocaleDateString('en-us', { weekday:"short", year:"numeric", month:"short", day:"numeric"})}</h1>
              <p id="number-of-events">${daysEvents.length} Meeting${daysEvents.length == 1 ? '' : 's'}</p>
              <button class="close-button" id="details-close-btn"><i class="material-icons">close</i></button>
          </div>
          
          <ul id="events-list">
            ${daysEvents.map(event => {
              const { Event_ID, Event_Title, Minutes_for_Setup, Minutes_for_Cleanup, Location_Name, Event_End_Date, Event_Start_Date, Display_Name, Event_Type, Participants_Expected, Featured_On_Calendar } = event;
              
              const eventsRooms = daysEventsRooms ? daysEventsRooms.filter(room => room.Event_ID == Event_ID) : null;

              const eventStartTime = new Date(Event_Start_Date).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
              const eventEndTime = new Date(Event_End_Date).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
              const eventTimesString = `${eventStartTime} - ${eventEndTime}`;

              const reservedStartTime = new Date(new Date(Event_Start_Date).getTime() - (Minutes_for_Setup * 60000)).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
              const reservedEndTime = new Date(new Date(Event_End_Date).getTime() + (Minutes_for_Cleanup * 60000)).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
              const reservedTimeString = `${reservedStartTime} - ${reservedEndTime}`;
              
              return `
                <li class="event ${Featured_On_Calendar ? 'featured' : ''}" id="event-${Event_ID}">
                  <div>
                      <p id="label">Primary Contact:</p>
                      <p>${Display_Name}</p>
                  </div>
                  ${Minutes_for_Setup || Minutes_for_Cleanup ? `
                      <div>
                          <p id="label">Event Time:</p>
                          <p>${reservedTimeString}</p>
                      </div>
                  ` : `
                    <div>
                        <p id="label">Event Time:</p>
                        <p>${eventTimesString}</p>
                    </div>
                  `}
                  <div>
                      <p id="label">${'Rooms'}:</p>
                      <p id="rooms-list">${eventsRooms && eventsRooms.length ? [...new Set(eventsRooms.map(room => room.Room_Name))].join(', ') : 'No Rooms Booked'}</p>
                  </div>
                </li>
              `
            }).join('')}
          </ul>
      </div>
      <button id="next-day-btn" onClick="nextDay()"><i class="material-icons">keyboard_arrow_right</i></button>
    `

    const detailsCloseBtnDOM = document.getElementById('details-close-btn');
    detailsCloseBtnDOM.onclick = this.hideDetailsPopup;

    const nextDayBtn = document.getElementById('next-day-btn');
    nextDayBtn.onclick = () => this.nextDay(day)
    const prevDayBtn = document.getElementById('prev-day-btn');
    prevDayBtn.onclick = () => this.prevDay(day)

    doneLoading();

    if (!eventID) return;

    const eventsListDOM = document.getElementById('events-list');
    const scrollToElem = document.getElementById(`event-${eventID}`);
    const children = eventsListDOM.children;
    let indexOfElem = 9999;
    let scrollHeight = 0;
    for (let i = 0; i < children.length; i ++) {
        if (children[i].id == `event-${eventID}`) indexOfElem = i;

        if (i < indexOfElem) scrollHeight += children[i].offsetHeight + 2
    }

    if (this.events[0].Event_ID != eventID) eventsListDOM.scrollTo({
        top: scrollHeight,
        behavior: 'smooth'
    })
    // scrollToElem.style.borderColor = '2px solid transparent'
    scrollToElem.classList.add('highlight')
    // scrollToElem.style.borderColor = 'lime'
    // scrollToElem.style.transition = 'border-color 1s linear 1s'
  }

  hideDetailsPopup = () => {
    const eventDetailsPopupDOM = document.getElementById('popup-container');
    eventDetailsPopupDOM.classList.remove('open');
  }

  createDatePicker = () => {
    const datePickerDOM = document.createElement('div');
    datePickerDOM.id = 'date-picker-container';
    datePickerDOM.innerHTML = `
      <div id="date-picker">
          <div class="date-picker-header">
              <button class="btn" id="date-picker-submit">Submit</button>
              <button class="close-button" id="date-picker-close"><i class="material-icons">close</i></button>
          </div>
          <div class="pickers">
              <div class="month-picker"></div>
              <div class="year-picker"></div>
          </div>
      </div>
    `
    document.body.appendChild(datePickerDOM)

    document.getElementById('date-picker-submit').onclick = this.handleDatePickerSubmit;
    document.getElementById('date-picker-close').onclick = this.hideDatePicker;
  }

  showDatePicker = () => {
    const datePickerDOM = document.getElementById('date-picker-container');
    datePickerDOM.classList.add('open');

    const monthPickerDOM = document.querySelector('.month-picker');
    const yearPickerDOM = document.querySelector('.year-picker');

    monthPickerDOM.innerHTML = this.monthsList.map((month, i) => {
        return `
            <div class="choice">
                <input type="radio" name="month" id="${month}" value="${i}" ${this.month == i ? 'checked' : ''}>
                <label class="label" for="${month}">${month}</label>
            </div>
        `
    }).join('')

    const choiceHeight = document.querySelector('.choice').clientHeight;
    monthPickerDOM.scroll({top: this.month * choiceHeight})

    yearPickerDOM.innerHTML = [...new Array(50)].map((val, i) => {
        const year = 1998 + i;
        return `
            <div class="choice">
                <input type="radio" name="year" id="${year}" value="${year}" ${this.year == year ? 'checked' : ''}>
                <label class="label" for="${year}">${year}</label>
            </div>
        `
    }).join('')

    yearPickerDOM.scroll({top: (this.year - 1998) * choiceHeight})
  }

  hideDatePicker = () => {
    const datePickerDOM = document.getElementById('date-picker-container');
    datePickerDOM.classList.remove('open');
  }

  handleDatePickerSubmit = () => {
    const monthRadios = document.getElementsByName('month');
    const yearRadios = document.getElementsByName('year');

    for (let month of monthRadios) {
        if (month.checked) {
            // console.log(month.value)
            this.month = parseInt(month.value);
        }
    }
    for (let year of yearRadios) {
        if (year.checked) {
            // console.log(year.value)
            this.year = parseInt(year.value);
        }
    }

    this.hideDatePicker();
    this.update();
  }

  nextDay = (day) => {
    const nextDayIndex = this.monthArr.indexOf(day) + 1;
    const nextDay = this.monthArr[nextDayIndex];
    if (!nextDay) return;
    
    const events = this.filteredEvents || this.events;
    const currDate = new Date(nextDay);
    const endOfCurrDate = new Date(currDate.getTime() + 86399999)
    const daysEvents = events.filter(event => currDate <= new Date(event.Event_End_Date) && endOfCurrDate >= new Date(event.Event_Start_Date));

    if (!daysEvents.length) return this.nextDay(nextDay)

    this.showDetailsPopup(nextDay)
  }
  prevDay = (day) => {
    const prevDayIndex = this.monthArr.indexOf(day) - 1;
    const prevDay = this.monthArr[prevDayIndex];
    if (!prevDay) return;
    
    const events = this.filteredEvents || this.events;
    const currDate = new Date(prevDay);
    const endOfCurrDate = new Date(currDate.getTime() + 86399999)
    const daysEvents = events.filter(event => currDate <= new Date(event.Event_End_Date) && endOfCurrDate >= new Date(event.Event_Start_Date));

    if (!daysEvents.length) return this.prevDay(prevDay)

    this.showDetailsPopup(prevDay)
  }
}

customElements.define('phc-calendar', PHC_Calendar);