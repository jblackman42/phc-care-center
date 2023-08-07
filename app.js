// Importing required modules
const express = require('express');
const session = require('express-session');
require('dotenv').config();

// Initializing the express app
const app = express();

// Express settings
app.set('trust proxy', 1); // Trust first proxy
app.set('view engine', 'ejs'); // Set the view engine to ejs

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.SESSION_SECRET === 'production', maxAge: 1000 * 60 * 60 * 24 }
}));

app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Static file middleware for serving styles, scripts and assets
app.use("/styles", express.static(__dirname + "/views/styles"));
app.use("/scripts", express.static(__dirname + "/views/scripts"));
app.use("/assets", express.static(__dirname + "/views/assets"));

//Navigation routing
app.use('/', require('./routes/index'));

//API routing
app.use('/api/mp', require('./routes/mp.js'));
app.use('/api/oauth', require('./routes/oauth.js'));
// app.use('/api/helpdesk', require('./routes/helpdesk.js'));
// app.use('/api/oauth', require('./routes/oauth.js'));
// app.use('/api/mp', require('./routes/mp.js'));
// app.use('/api/prayer-wall', require('./routes/prayer-wall.js'));
// app.use('/websocket', require('./routes/websocket.js'));
// app.use('/api/widgets', require('./routes/widgets.js'));
// app.use('/api/tools/mp', require('./routes/MPTools.js'));
// app.use('/api/tools', require('./routes/tools.js'));

// Starting the server
const port = process.env.PORT || 3000;
(async () => {
  try {
    app.listen(port, console.log(`\n Server is listening on port ${port}\n http://localhost:${port}`));
  } catch (error) { console.log(error) }
})();
