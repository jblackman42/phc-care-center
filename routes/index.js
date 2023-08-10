const express = require('express');
const navigation = express.Router();

//authentication middleware
const { ensureAuthenticated, checkUserGroups, checkAdminUserGroups } = require('../middleware/authorize.js')

//home page
navigation.get('/', ensureAuthenticated, checkUserGroups, (req, res) => {
  res.render('pages/home')
})
navigation.get('/create', ensureAuthenticated, checkUserGroups, (req, res) => {
  res.render('pages/create')
})
navigation.get('/new-user', ensureAuthenticated, checkAdminUserGroups, (req, res) => {
  res.render('pages/new-user')
})
navigation.get('/login', (req, res) => {
  res.render('pages/login', {error: null})
})




navigation.get('/logout', (req, res) => {
  try {
      req.session.user = null;
      req.session.access_token = null;
      req.session.refresh_token = null;
      res.redirect('/')
    } catch(err) {
      res.status(500).send({error: 'internal server error'})
  }
})

module.exports = navigation;