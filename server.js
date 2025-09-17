const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initDb } = require('./src/db');
const authRouter = require('./src/routes/auth');
const listingsRouter = require('./src/routes/listings');
const oauthGoogleRouter = require('./src/routes/google');
const session = require('express-session');
const passport = require('passport');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(session({ secret: 'dev-secret', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// API routes
app.use('/api/auth', authRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/google', oauthGoogleRouter);

// Serve modern-template.html as the landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'modren-template.html'));
});
// Static files (serve the frontend)
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database', err);
  process.exit(1);
});


