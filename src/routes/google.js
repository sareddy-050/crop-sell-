const express = require('express');
const router = express.Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Make sure these variables are correctly loaded from your .env file
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

// Basic check to ensure environment variables are loaded
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error("Error: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env file.");
    process.exit(1);
}

passport.use(new GoogleStrategy({
    /**
     * THE FIX:
     * The original code had a trailing comma after GOOGLE_CLIENT_ID, like this:
     * clientID: GOOGLE_CLIENT_ID, });
     *
     * This extra comma before the closing curly brace '}' was causing the
     * "SyntaxError: missing ) after argument list".
     *
     * I have removed the comma to fix the syntax.
     */
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
},
(accessToken, refreshToken, profile, done) => {
    // This is where you would find or create a user in your database.
    // For now, we'll just log the profile and pass it along.
    console.log("Passport callback function fired:");
    console.log(profile);
    return done(null, profile);
}));

// Route to initiate Google authentication
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

// Callback route for Google to redirect to
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // Successful authentication, redirect home.
        res.redirect('/dashboard');
    }
);

module.exports = router;
