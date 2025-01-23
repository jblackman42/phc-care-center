const express = require('express');
const router = express.Router();
const qs = require('qs')
const axios = require('axios');
const CryptoJS = require('crypto-js');

const getAccessToken = async () => {
  const data = await axios({
      method: 'post',
      url: 'https://my.pureheart.org/ministryplatformapi/oauth/connect/token',
      data: qs.stringify({
          grant_type: "client_credentials",
          scope: "http://www.thinkministry.com/dataplatform/scopes/all",
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET
      })
  })
      .then(response => response.data)
  const {access_token, expires_in} = data;
  const expiresDate = new Date(new Date().getTime() + (expires_in * 1000)).toISOString()
  return access_token;
}

const checkRequiredParameters = (requiredParams) => {
  return (req, res, next) => {
    const missingParams = requiredParams.filter(param => req.query[param] == null);
    if (missingParams.length) {
      res.status(400).send({status: 400, error: `Missing Parameters: [${missingParams.join(', ')}]`}).end();
    } else {
      next()
    };
  }
}

const ensureAuthenticatedForAPI = (req, res, next) => {
  next();
}

router.get(
  '/events',
  ensureAuthenticatedForAPI,
  checkRequiredParameters(['monthStart', 'monthEnd']),
  async (req, res) => {
    // get any events where the location is the care center
    const { monthStart, monthEnd } = req.query;
    
    try {
      res.send(await axios({
        method: 'get',
        url: 'https://my.pureheart.org/ministryplatformapi/tables/Events',
        params: {
          $filter: `Event_Start_Date BETWEEN '${monthStart}' AND '${monthEnd}' AND Events.[Location_ID] = 8`,
          $orderby: `Event_Start_Date`,
          $select: 'Event_ID, Event_Title, Event_Type_ID_Table.[Event_Type], Congregation_ID_Table.[Congregation_Name], Location_ID_Table.[Location_Name], Meeting_Instructions, Events.[Description], Program_ID_Table.[Program_Name], Primary_Contact_Table.[Display_Name], Participants_Expected, Minutes_for_Setup, Event_Start_Date, Event_End_Date, Minutes_for_Cleanup, Cancelled, Featured_On_Calendar'
        },
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${await getAccessToken()}`
        }
      })
        .then(response => response.data))
    } catch (err) {
      res.status(err.response.status).send(err.response.data).end();
    }
  }
)

router.get(
  '/event-rooms',
  ensureAuthenticatedForAPI,
  checkRequiredParameters(['eventIDs']),
  async (req, res) => {
    const { eventIDs } = req.query;

    try {
      res.send(await axios({
        method: 'get',
        url: 'https://my.pureheart.org/ministryplatformapi/tables/Event_Rooms',
        params: {
          $filter: `Event_ID IN (${eventIDs.join()}) AND Cancelled=0`,
          $select: `Event_Room_ID, Event_ID, Room_ID_Table.[Room_Name], Room_ID_Table_Building_ID_Table.Building_Name, Room_ID_Table_Building_ID_Table_Location_ID_Table.[Location_Name]`
        },
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${await getAccessToken()}`
        }
      })
        .then(response => response.data))
    } catch (error) {
      res.status(err.response.status).send(err.response.data).end();
    }
  }
)

router.get(
  '/places',
  ensureAuthenticatedForAPI,
  async (req, res) => {
    try {
      res.send(await axios({
        method: 'get',
        url: 'https://my.pureheart.org/ministryplatformapi/tables/Rooms',
        params: {
          $filter: `Bookable=1 AND Building_ID_Table_Location_ID_Table.[Congregation_ID] = 13 AND (Building_ID_Table.Date_Retired IS NULL OR Building_ID_Table.Date_Retired > GETDATE())`,
          $select: 'Rooms.Room_ID, Rooms.Room_Name, Rooms.Building_ID, Building_ID_Table.[Building_Name], Building_ID_Table_Location_ID_Table.[Location_ID], Building_ID_Table_Location_ID_Table.[Location_Name]'
        },
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${await getAccessToken()}`
        }
      })
        .then(response => response.data))
    } catch (err) {
      res.status(err.response.status).send(err.response.data).end();
    }
  }
)

router.get(
  '/primary-contacts',
  ensureAuthenticatedForAPI,
  async (req, res) => {
    try {
      res.send(await axios({
        method: 'get',
        url: 'https://my.pureheart.org/ministryplatformapi/tables/dp_User_User_Groups',
        params: {
          $select: 'User_ID_Table.[User_ID], User_ID_Table.[Display_Name], Contact_ID',
          $filter: `User_Group_ID_Table.[User_Group_ID] = ${process.env.AUTHORIZED_USER_GROUP}`,
          $orderby: 'User_ID_Table.[Display_Name]'
        },
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${await getAccessToken()}`
        }
      })
        .then(response => response.data))
    } catch (err) {
      res.status(err.response.status).send(err.response.data).end();
    }
  }
)

router.get(
  '/bookable-rooms',
  ensureAuthenticatedForAPI,
  async (req, res) => {
    try {
      res.send(await axios({
        method: 'get',
        url: 'https://my.pureheart.org/ministryplatformapi/tables/rooms',
        params: {
          $filter: `Building_ID = 1018 AND Bookable = 1`,
          $orderby: 'Room_Number'
        },
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${await getAccessToken()}`
        }
      })
        .then(response => response.data))
    } catch (err) {
      res.status(err.response.status).send(err.response.data).end();
    }
  }
)

router.post(
  '/events',
  ensureAuthenticatedForAPI,
  async (req, res) => {
    try {
      res.send(await axios({
        method: 'post',
        url: 'https://my.pureheart.org/ministryplatformapi/tables/events',
        data: req.body,
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${await getAccessToken()}`
        }
      })
        .then(response => response.data))
    } catch (err) {
      res.status(err.response.status).send(err.response.data).end();
    }
  }
)

router.post(
  '/event_rooms',
  ensureAuthenticatedForAPI,
  async (req, res) => {
    try {
      res.send(await axios({
        method: 'post',
        url: 'https://my.pureheart.org/ministryplatformapi/tables/event_rooms',
        data: req.body,
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${await getAccessToken()}`
        }
      })
        .then(response => response.data))
    } catch (err) {
      res.status(err.response.status).send(err.response.data).end();
    }
  }
)

router.get(
  '/overlapped-rooms',
  ensureAuthenticatedForAPI,
  checkRequiredParameters(['startDate', 'endDate']),
  async (req, res) => {
    const { startDate, endDate } = req.query;

    try {
      res.send(await axios({
        method: 'get',
        url: 'https://my.pureheart.org/ministryplatformapi/tables/event_rooms',
        params: {
          $select: 'Event_ID_Table.Event_ID, Room_ID',
          $filter: `(Event_ID_Table.Event_Start_Date < '${endDate}') AND (Event_ID_Table.Event_End_Date > '${startDate}') AND Event_ID_Table.Program_ID = 652`
        },
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${await getAccessToken()}`
        }
      })
        .then(response => response.data))
    } catch (err) {
      res.status(err.response.status).send(err.response.data).end();
    }
  }
)


router.post(
  "/generate-sequence",
  ensureAuthenticatedForAPI,
  async (req, res) => {
    const { sequence } = req.body;

    if (!sequence)
      return res.status(400).send({ err: "no sequence provided" }).end();

    const pattern = await axios({
      method: "post",
      url: "https://my.pureheart.org/ministryplatformapi/tasks/generate-sequence",
      data: sequence,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${await getAccessToken()}`,
      },
    })
      .then((response) => response.data)
      .catch((err) => console.log(err));

    res.send(pattern);
  }
)

const MP = {
  matchOrCreateContact: async (First_Name, Last_Name, Email, Phone) => {
    return await axios({
      method: 'post',
      url: 'https://my.pureheart.org/ministryplatformapi/procs/api_Create_New_Contact',
      data: {
        "@FirstName": First_Name,
        "@LastName": Last_Name,
        "@EmailAddress": Email,
        "@PhoneNumber": Phone
      },
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${await getAccessToken()}`
      }
    })
      .then(response => response.data[0][0])
  },
  hashPassword: (input) => {
    let hash = CryptoJS.MD5(input);
    let base64 = CryptoJS.enc.Base64.stringify(hash);
    return base64;
  },
  createNewUser: async (contact) => {
    const { Contact_ID, First_Name, Last_Name, Display_Name } = contact;
    const userData = {
      User_Name: `${First_Name[0]}${Last_Name}`.toLowerCase(),
      Display_Name: Display_Name,
      Contact_ID: Contact_ID
    }
    const user = await axios({
      method: 'post',
      url: 'https://my.pureheart.org/ministryplatformapi/tables/dp_Users',
      data: [userData],
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${await getAccessToken()}`
      }
    })
      .then(response => response.data[0])
    await axios({
      method: 'put',
      url: 'https://my.pureheart.org/ministryplatformapi/tables/contacts',
      data: [{
        Contact_ID: Contact_ID,
        User_Account: user.User_ID
      }],
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${await getAccessToken()}`
      }
    })
    return user;
  },
  addUserToUserGroup: async (userid, groupid) => {
    return await axios({
      method: 'post',
      url: 'https://my.pureheart.org/ministryplatformapi/tables/dp_User_User_Groups',
      data: [{
        User_ID: userid,
        User_Group_ID: groupid
      }],
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${await getAccessToken()}`
      }
    })
      .then(response => response.data[0])
  },
  findUserByID: async (id) => {
    return await axios({
      method: 'get',
      url: `https://my.pureheart.org/ministryplatformapi/tables/dp_Users/${id}`,
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${await getAccessToken()}`
      }
    })
      .then(response => response.data[0] ?? null)
  }
}

router.post(
  '/new-user',
  ensureAuthenticatedForAPI,
  async (req, res) => {
    const { First_Name, Last_Name, Email, Phone, Account_Type } = req.body;
    try {
      if (!First_Name || !Last_Name || !Email || !Phone || !Account_Type) return res.status(500).send({error: "bad"}).end();
      // console.log(Account_Type)
      const contact = await MP.matchOrCreateContact(First_Name, Last_Name, Email, Phone);
      
      // get user account from contact
      const { User_Account } = contact;
      // if user account doesn't exist create one
      const User = User_Account === null ? await MP.createNewUser(contact) : await MP.findUserByID(User_Account);

      // add user to user group
      const { User_ID } = User;
      await MP.addUserToUserGroup(User_ID, Account_Type);

      // console.log(User);

      res.sendStatus(200);
    } catch (err) {
      res.status(err.response.status).send(err.response.data).end();
    }
  }
)

router.get(
  '/test-password',
  async (req, res) => {
    res.send(MP.hashPassword(req.query.password))
  }
)

module.exports = router;
