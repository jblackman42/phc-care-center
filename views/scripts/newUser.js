const newUserFormDOM = document.getElementById('new-user-form');
// inputs
const firstNameInputDOM = document.getElementById('first-name');
const lastNameInputDOM = document.getElementById('last-name');
const emailInputDOM = document.getElementById('email');
const phoneInputDOM = document.getElementById('phone');
const accountTypeSelectDOM = document.getElementById('account-type');

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

newUserFormDOM.addEventListener('submit', async (e) => {
  e.preventDefault();

  try {
    loading();
    await axios({
      method: 'post',
      url: '/api/mp/new-user',
      data: {
        First_Name: firstNameInputDOM.value,
        Last_Name: lastNameInputDOM.value,
        Email: emailInputDOM.value,
        Phone: phoneInputDOM.value,
        Account_Type: accountTypeSelectDOM.value
      }
    })
      .then(response => response.data);

      firstNameInputDOM.value = '';
      lastNameInputDOM.value = '';
      emailInputDOM.value = '';
      phoneInputDOM.value = '';
      accountTypeSelectDOM.value = '';
    showSuccessMsg('User Created Successfully');
    doneLoading();
  } catch (error) {
    doneLoading();
    console.log(error)
    showErrorMsg('something went wrong. Please try again later or Contact IT.')
  }
})