require('dotenv').config();

const express = require('express');
const passport = require('passport');
const passportLocal = require('passport-local');
const passportJWT = require('passport-jwt');
const jwt = require('jsonwebtoken');
const { jwtOptions } = require('../config');
const { UserModel } = require('../database/database');

const router = express.Router();
const LocalStrategy = passportLocal.Strategy;
const JWTStrategy = passportJWT.Strategy;
const ExtractJwt = passportJWT.ExtractJwt;

// find and authenticate a user with a username and a password
passport.use(new LocalStrategy(
    // Options
    {
        usernameField: 'email',
        passwordField: 'password'
    },
    // Verification function
    (email, password, done) => {
        UserModel.findOne({ email: email, password: password }, {password : 0}, function (err, obj) {
            if(err || !obj){
                return done(null, false)
            }
            else{
                return done(null, obj)
            }
        })
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
        UserModel.findOne({_id: userId}, {_id : 1}).then((USER) => {
        if(userId !== USER.id) {
            // User not found
           return done(null, false);
        }
        // User found
        return done(null, USER);
});
    }));

router.post('/login', passport.authenticate('local', { session: false }), (req, res) => {
    // here, user exists => returned value from passport verification function
    let user = req.user;
    const token = jwt.sign({ userId: user.id }, jwtOptions.secret);
    res.send({ user, token });
});

module.exports = { router };