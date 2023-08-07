const getUser = async () => {
  return await axios({
    method: 'get',
    url: '/api/oauth/user',
  })
    .then(response => response.data);
}
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

const primaryContactSelectDOM = document.getElementById('primary-contact');
const roomInputsContainerDOM = document.getElementById('room-inputs');
(async () => {
  try {
    const user = await getUser();
    const primaryContacts = await getPrimaryContactOptions();
    const bookableRooms = await getBookableRooms();

    // if user is logged in and not in primary contacts group, add them manually
    // this only happens if the logged in user is an administrator
    const primaryContactIDs = primaryContacts.map(contact => contact.User_ID);
    if (!primaryContactIDs.includes(parseInt(user.userid))) primaryContacts.unshift({User_ID: parseInt(user.userid), Display_Name: user.display_name})
    
    primaryContactSelectDOM.innerHTML = primaryContacts.map(contact => {
      const { User_ID, Display_Name } = contact;
      return `
        <option value="${User_ID}">${Display_Name}</option>
      `
    }).join('')
    primaryContactSelectDOM.value = user.userid;

    roomInputsContainerDOM.innerHTML = bookableRooms.map(room => {
      const { Room_ID, Room_Name } = room;
      return `
        <div class="checkbox-input">
          <input type="checkbox" id="room-${Room_ID}">
          <label for="room-${Room_ID}">${Room_Name}</label>
        </div>
      `
    }).join('')
  } catch (error) {
    console.error(error);
    alert('something went wrong. try again later.')
  }

})()