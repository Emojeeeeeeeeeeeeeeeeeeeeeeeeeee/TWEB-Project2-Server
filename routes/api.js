const express = require('express');
const passport = require('passport');

const router = express.Router();
const authenticated = () => passport.authenticate('jwt', { session: false });

router.get('/public', (req, res) => {
    res.send({ message: 'This is public :)' });
});

router.get('/private', authenticated(), (req, res) => {
    res.send({ message: 'Private Zone' });
});

router.get('/me', authenticated(), (req, res) => {
    const { password, ...user } = req.user; // remove password from the const 'user' 
    res.send({ user: user });
})

module.exports = router;