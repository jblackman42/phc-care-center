const axios = require('axios');
const qs = require('qs');

const ensureAuthenticated = async (req, res, next) => {
  const { user, access_token, refresh_token } = req.session;

  if (!user || !access_token) {
    log('no token');
    return res.render('pages/login', { error: '' });
  }

  try {
    const response = await axios.post(`https://my.pureheart.org/ministryplatformapi/oauth/connect/accesstokenvalidation`, qs.stringify({ 'token': access_token }));
    const { exp } = response.data;
    const isTokenValid = new Date() < new Date(exp * 1000);

    if (isTokenValid) {
      log('valid token');
      return next();
    }

    log('invalid token');

    if (!refresh_token) {
      log('no refresh token');
      return res.render('pages/login', { error: 'session expired' });
    }

    const refreshTokenResponse = await axios.post(`https://my.pureheart.org/ministryplatformapi/oauth/connect/token`, qs.stringify({
      'grant_type': 'refresh_token',
      'refresh_token': refresh_token
    }), {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64')}`
      }
    });

    if (refreshTokenResponse.data.access_token) {
      req.session.access_token = refreshTokenResponse.data.access_token;
      log('new token acquired');
      return next();
    }

    log('failed to acquire new token');
    return res.render('pages/login', { error: 'internal server error' });
  } catch (error) {
    log('ensureAuthenticated error:', error);
    return res.render('pages/login', { error: 'internal server error' });
  }
}

function log(...messages) {
  if (process.env.LOGGING == 1) {
    console.log(...messages);
  }
}

const checkUserGroups = async (req, res, next) => {
  const {user} = req.session;
  if (!user) {
    console.log('user not found');
    return res.render('pages/login', {error: 'User unauthorized'});
  }
  const {roles, user_groups} = user;
  const authorized = user_groups.includes(parseInt(process.env.AUTHORIZED_USER_GROUP)) || user_groups.includes(parseInt(process.env.AUTHORIZED_ADMIN_GROUP)) || (roles && roles.includes('Administrators'));
  
  return authorized ? next() : res.render('pages/login', {error: 'User unauthorized'});


}
const checkAdminUserGroups = async (req, res, next) => {
  const {user} = req.session;
  if (!user) {
    console.log('user not found');
    return res.render('pages/login', {error: 'User unauthorized'});
  }
  const {roles, user_groups} = user;
  const authorized = user_groups.includes(parseInt(process.env.AUTHORIZED_ADMIN_GROUP)) || (roles && roles.includes('Administrators'));
  
  return authorized ? next() : res.render('pages/login', {error: 'User unauthorized'});


}

module.exports = {
  ensureAuthenticated,
  checkUserGroups,
  checkAdminUserGroups
}