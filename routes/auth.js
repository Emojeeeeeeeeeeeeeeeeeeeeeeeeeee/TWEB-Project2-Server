const express = require('express');
const passport = require('passport');
const passportLocal = require('passport-local');
const passportJWT = require('passport-jwt');
const jwt = require('jsonwebtoken');
const { jwtOptions } = require('../config');

const USER = {
    id: '123456789',
    email: 'toto@tata.com',
    username: 'toto',
    password: 'tata'
}

const router = express.Router();
const LocalStrategy = passportLocal.Strategy;
const JWTStrategy = passportJWT.Strategy;
const ExtractJwt = passportJWT.ExtractJwt;

// find and authenticate a user with a username and a password
passport.use(new LocalStrategy(
    // Options
    {
        usernameField: 'username',
        passwordField: 'password'
    },
    // Verification function
    (username, password, done) => {
        // TODO: DB query
        if(username === USER.username && password === USER.password) {
            return done(null, USER);
        }
        return done(null, false);
    }
));

// find and authenticate a user with a jwt token
passport.use(new JWTStrategy(
    // Options
    {
        secretOrKey: jwtOptions.secret,
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
    },
    // Verification function
    (jwtPayload, done) => {
        const { userId } = jwtPayload;
        if(userId !== USER.id) {
            // User not found
           return done(null, false);
        }
        // User found
        return done(null, USER);
    }
));

router.post('/login', passport.authenticate('local', { session: false }), (req, res) => {
    // here, user exists => returned value from passport verification function
    const { password, ...user } = req.user; // remove password from the const 'user'
    const token = jwt.sign({ userId: user.id }, jwtOptions.secret);
    res.send({ user, token });
});

module.exports = router;