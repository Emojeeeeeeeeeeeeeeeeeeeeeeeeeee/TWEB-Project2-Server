const express = require('express');
const passport = require('passport');
const passportLocal = require('passport-local');
const passportJWT = require('passport-jwt');
const jwt = require('jsonwebtoken');
const { jwtOptions } = require('../config');
const mongoose = require('mongoose');

const dbURI = 'mongodb://admin:<PASSWORD>@twebkoppsilvestri-shard-00-00-y2dgh.mongodb.net:27017,twebkoppsilvestri-shard-00-01-y2dgh.mongodb.net:27017,twebkoppsilvestri-shard-00-02-y2dgh.mongodb.net:27017/test?ssl=true&replicaSet=TWEBKoppSilvestri-shard-0&authSource=admin&retryWrites=true';

const options = {
    useNewUrlParser: true,
    dbName: 'HappyFaces',
  };
  
  mongoose.connect(dbURI, options);
  
  const userSchema = new mongoose.Schema();

  const messageSchema = new mongoose.Schema({
    content: { type: String, required: true },
    likes: { type: [userSchema], required: true },
    time: { type: Date, required: true }
  });

  const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    messages: { type: [messageSchema], required: true },
    followed: { type: [userSchema], required: true },
    followers: { type: [userSchema], required: true }
  });

const UserModel = mongoose.model('user', userSchema);
const MessageModel = mongoose.model('message', messageSchema);

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
        usernameField: 'email',
        passwordField: 'password'
    },
    // Verification function
    (email, password, done) => {
        let USER;
        UserModel.findOne({ email: email, password: password }, {password : 0}, function(err, obj) {if(err || !obj){console.log(obj)}else{console.log(obj)}})
        UserModel.findOne({ email: email, password: password }, function(err, obj) {if(err || !obj){return done(null, false)}else{return done(null, obj)}})
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