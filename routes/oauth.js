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

router.post('/login', async (req, res) => {
    //this video explains this axios request
    //https://youtu.be/r5N8MrQedcg?t=155
    //heres the docs for ministry platform oauth info
    //https://mpweb.azureedge.net/libraries/docs/default-source/kb/get_ready_ministryplatform_new_oauth3b8b080b-04b5-459c-ae7f-0a610de0a5fa.pdf?sfvrsn=db969991_3
    
    const {username, password, remember} = req.body;
    
    try {
        const login = await axios({
            method: 'post',
            url: `https://my.pureheart.org/ministryplatformapi/oauth/connect/token`,
            data: qs.stringify({
                grant_type: "password",
                scope: "http://www.thinkministry.com/dataplatform/scopes/all openid offline_access",
                client_id: process.env.CLIENT_ID,
                username: username,
                password: password
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64')}`
            }
        })
            .then(response => response.data)
        
        const {access_token, token_type, refresh_token, expires_in} = login;

        const user = await axios({
            method: 'get',
            url: `https://my.pureheart.org/ministryplatformapi/oauth/connect/userinfo`,
            headers: {
                'Authorization': `${token_type} ${access_token}`
            }
        })
            .then(response => response.data)
            .catch(err => console.log(err))

        const usersUserGroups = await axios({
            method: 'get',
            url: `https://my.pureheart.org/ministryplatformapi/tables/dp_User_User_Groups?$filter=User_ID=${user.userid}`,
            headers: {
                'Authorization': `${token_type} ${await getAccessToken()}`,
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.data.map(group => group.User_Group_ID))
            .catch(err => console.log(err))

        user.user_groups = usersUserGroups;

        req.session.user = user;
        req.session.access_token = access_token;
        // if user selected keep me logged in, set refresh token, otherwise set in to null
        req.session.refresh_token = remember ? refresh_token : null;
        
        res.status(200).send(user).end();
    } catch (err) {
        if (err.response.data.error == 'invalid_grant') {
          res.status(400).send({error: 'Incorrect username or password'})
        } else {
            res.status(500).send({error: 'Something went wrong. Please try again later.'})
        }
        // console.log(err)
        // if (err.response && err.response.data.error_description) {
        //     res.status(403).send({error: err.response.data.error_description}).end();
        // } else if (err.response && err.response.data) {
        //     res.status(403).send({error: err.response.data.error}).end();
        // } else {
        //     console.log(err)
        //   }
    }
})

router.get('/user', (req, res) => {
    res.send(req.session.user);
})

module.exports = router;