// consts and funcs
const eventDefaults = {
  Event_Title: "Care Center Meeting", // default title
  // Event_Title: "(TEST) Care Center Meeting", // default title
  Event_Type_ID: 11, // Meeting
  Congregation_ID: 13, // Counseling
  Location_ID: 8, // Care Center
  Program_ID: 652, // Care Center | Counseling
  Visibility_Level_ID: 1, // Private
  Minutes_for_Setup: 0,
  Minutes_for_Cleanup: 0,
}

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-based in JavaScript
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

// api calls
const getPrimaryContactOptions = async () => {
  return await axios({
    method: 'get',
    url: '/api/mp/primary-contacts',
  })
    .then(response => response.data);
}
const getBookableRooms = async () => {
  return await axios({
    method: 'get',
    url: '/api/mp/bookable-rooms',
  })
    .then(response => response.data);
}
const createEvent = async (event) => {
  return await axios({
    method: 'post',
    url: '/api/mp/events',
    data: [event]
  })
    .then(response => response.data[0]);
}
const createRoomBookings = async (roomsToBook) => {
  return await axios({
    method: 'post',
    url: '/api/mp/event_rooms',
    data: roomsToBook
  })
    .then(response => response.data);
}
const getOverlappingRooms = async (startDate, endDate) => {
  return await axios({
    method: 'get',
    url: '/api/mp/overlapped-rooms',
    params: {
      startDate: startDate,
      endDate: endDate
    }
  })
    .then(response => response.data);
}

// dom elements
const primaryContactSelectDOM = document.getElementById('primary-contact');
const startDateInputDOM = document.getElementById('start-date');
const startTimeInputDOM = document.getElementById('start-time');
const endTimeInputDOM = document.getElementById('end-time')
const roomInputsContainerDOM = document.getElementById('room-inputs');
// recurring inputs
const recurringCheckboxDOM = document.getElementById('recurring-checkbox');
const recurringLabelDOM = document.querySelector('.recurring-label');

const sequenceIntervalDOM = document.getElementById('sequenceInterval');
const sequenceDayPositionDOM = document.getElementById('sequenceDayPosition');
const sequenceWeekdaysDOM = document.getElementById('sequenceWeekdays');


const createFormDOM = document.getElementById('create-form');

const formMessageDOM = document.getElementById('form-message');

const showSuccessMsg = (msg) => {
  formMessageDOM.classList.add('success');
  formMessageDOM.classList.remove('error');
  formMessageDOM.textContent = msg;
}
const showErrorMsg = (msg) => {
  formMessageDOM.classList.remove('success');
  formMessageDOM.classList.add('error');
  formMessageDOM.textContent = msg;
}
// setup function
(async () => {
  try {
    const primaryContacts = await getPrimaryContactOptions();
    const bookableRooms = await getBookableRooms();

    // if user is logged in and not in primary contacts group, add them manually
    // this only happens if the logged in user is an administrator
    const primaryContactIDs = primaryContacts.map(contact => contact.Contact_ID);
    if (!primaryContactIDs.includes(parseInt(user.ext_Contact_ID))) primaryContacts.unshift({Contact_ID: parseInt(user.ext_Contact_ID), Display_Name: user.display_name})
    
    primaryContactSelectDOM.innerHTML = primaryContacts.map(contact => {
      const { Contact_ID, Display_Name } = contact;
      return `
        <option value="${Contact_ID}">${Display_Name}</option>
      `
    }).join('')
    primaryContactSelectDOM.value = user.ext_Contact_ID;

    roomInputsContainerDOM.innerHTML = bookableRooms.map(room => {
      const { Room_ID, Room_Name } = room;
      return `
        <div class="checkbox-input">
          <input type="checkbox" class="room-checkbox" id="room-${Room_ID}" value="${Room_ID}">
          <label for="room-${Room_ID}">${Room_Name}</label>
        </div>
      `
    }).join('')
  } catch (error) {
    console.error(error);
    alert('something went wrong. try again later.')
  }

})();

// handle form submit
createFormDOM.addEventListener('submit', async (e) => {
  e.preventDefault();

  try {
    loading();

    const roomCheckboxInputsList = document.querySelectorAll('.room-checkbox');
    const startTime = formatDate(`${startDateInputDOM.value}T${startTimeInputDOM.value}`);
    const endTime = formatDate(`${startDateInputDOM.value}T${endTimeInputDOM.value}`);
    
    // Calculate event duration in milliseconds
    const eventDuration = new Date(endTime) - new Date(startTime);

    // Handle single or recurring events based on pattern
    const events = pattern.length > 0 ? 
      // Create multiple events based on pattern
      pattern.map(patternDate => ({
        ...eventDefaults,
        Primary_Contact: primaryContactSelectDOM.value,
        Event_Start_Date: patternDate,
        Event_End_Date: formatDate(new Date(new Date(patternDate).getTime() + eventDuration)),
        Created_By_User: user.userid
      })) :
      // Create single event
      [{
        ...eventDefaults,
        Primary_Contact: primaryContactSelectDOM.value,
        Event_Start_Date: startTime,
        Event_End_Date: endTime,
        Created_By_User: user.userid
      }];

    // Create all events and collect their IDs
    const createdEvents = await Promise.all(
      events.map(event => createEvent(event))
    );

    // Create room bookings for each event
    const roomBookingPromises = createdEvents.flatMap(({ Event_ID }) => {
      return [...roomCheckboxInputsList]
        .filter(elem => elem.checked)
        .map(elem => ({
          Event_ID: Event_ID,
          Room_ID: parseInt(elem.value)
        }));
    });

    await createRoomBookings(roomBookingPromises);

    // clear the form
    primaryContactSelectDOM.value = null;
    startDateInputDOM.value = null;
    startTimeInputDOM.value = null;
    endTimeInputDOM.value = null;
    [...roomCheckboxInputsList].forEach(elem => elem.checked = false);
    
    showSuccessMsg('Meeting Created Successfully');
    doneLoading();
  } catch (error) {
    doneLoading();
    console.log(error)
    showErrorMsg('something went wrong. Please try again later or Contact IT.')
  }
})

// handle overlapped rooms
const checkOverlappedRoomBookings = async () => {
  // only check for blocked rooms if all date inputs have been filled
  if (!startDateInputDOM.value || !startTimeInputDOM.value || !endTimeInputDOM.value) return;
  // format dates and times and request all room bookings that overlap these times
  const startDate = formatDate(`${startDateInputDOM.value}T${startTimeInputDOM.value}`);
  const endDate = formatDate(`${startDateInputDOM.value}T${endTimeInputDOM.value}`);
  const blockedRooms = await getOverlappingRooms(startDate, endDate);

  [...document.querySelectorAll('.room-checkbox')].forEach(elem => {
    elem.disabled = false;
  });
  
  blockedRooms.forEach(room => {
    const { Room_ID } = room;
    const roomCheckboxInputDOM = document.getElementById(`room-${Room_ID}`);
    roomCheckboxInputDOM.checked = false;
    roomCheckboxInputDOM.disabled = true;
  })
}
startDateInputDOM.addEventListener('change', checkOverlappedRoomBookings);
startTimeInputDOM.addEventListener('change', checkOverlappedRoomBookings);
endTimeInputDOM.addEventListener('change', checkOverlappedRoomBookings);