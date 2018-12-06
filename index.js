require('dotenv/config');

const express = require('express');
const passport = require('passport');
const { port } = require('./config');
const api = require('./routes/api');
const auth = require('./routes/auth');

const app  = express();

// middleware to enable json data
app.use(express.json());

app.use(passport.initialize());

app.use('/api', api);

app.use('/auth', auth);

// middleware to handle erros
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Something went wrong...');
});

app.listen(port, () => {
    console.log(`Server OK: http://localhost:${port}`);
});