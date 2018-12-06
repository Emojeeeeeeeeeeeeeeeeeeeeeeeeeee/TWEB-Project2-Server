const express = require('express');
const jwt = require('jsonwebtoken');
const { jwtOptions } = require('../config');

const USER = {
    id: '123456789',
    email: 'toto@tata.com',
    username: 'toto',
    password: 'tata'
}

const router = express.Router();



router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if(username === USER.username && password === USER.password) {
        const token = jwt.sign({ userID: USER.id }, jwtOptions.secret);
        const decoded = jwt.verify(token, jwtOptions.secret);
        return res.send({ token, decoded });
    }
    return res.sendStatus(401);
});

module.exports = router;