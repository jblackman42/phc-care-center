const express = require('express');
const router = express.Router();
const qs = require('qs')
const axios = require('axios');

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

router.get(
  '/events',
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
  async (req, res) => {
    try {
      res.send(await axios({
        method: 'get',
        url: 'https://my.pureheart.org/ministryplatformapi/tables/dp_User_User_Groups',
        params: {
          $select: 'User_ID_Table.[User_ID], User_ID_Table.[Display_Name]',
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

module.exports = router;
