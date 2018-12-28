const express = require('express');
const passport = require('passport');
const passportLocal = require('passport-local');
const passportJWT = require('passport-jwt');
const jwt = require('jsonwebtoken');
const { jwtOptions } = require('../config');
const mongoose = require('mongoose');

const dbURI = 'mongodb://user1:user1@twebkoppsilvestri-shard-00-00-y2dgh.mongodb.net:27017,twebkoppsilvestri-shard-00-01-y2dgh.mongodb.net:27017,twebkoppsilvestri-shard-00-02-y2dgh.mongodb.net:27017/test?ssl=true&replicaSet=TWEBKoppSilvestri-shard-0&authSource=admin&retryWrites=true';

const options = {
    useNewUrlParser: true,
    dbName: 'HappyFaces',
  };
  
  mongoose.connect(dbURI, options);
  
  var ObjectId = mongoose.Schema.Types.ObjectId;
  ObjectId.prototype.valueOf = function(){
    return this.toString();
};

  const messageSchema = new mongoose.Schema({
    content: { type: String, required: true },
    likes: { type: [ObjectId], required: true },
    time: { type: Date, required: true }
  });

  const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    messages: { type: [ObjectId], required: true },
    followed: { type: [ObjectId], required: true },
    followers: { type: [ObjectId], required: true }
  });

const UserModel = mongoose.model('user', userSchema);
const MessageModel = mongoose.model('message', messageSchema);

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
/*passport.use(new JWTStrategy(
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
));*/

router.post('/login', passport.authenticate('local', { session: false }), (req, res) => {
    // here, user exists => returned value from passport verification function
    const { password, ...user } = req.user; // remove password from the const 'user'
    const token = jwt.sign({ userId: user.id }, jwtOptions.secret);
    res.send({ user, token });
});

module.exports = { router, UserModel, MessageModel, ObjectId };