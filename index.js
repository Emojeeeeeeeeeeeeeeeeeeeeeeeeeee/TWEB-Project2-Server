require('dotenv/config');

const express = require('express');
const passport = require('passport');
const { buildSchema } = require('graphql');
const graphqlHTTP = require('express-graphql');
const { port } = require('./config');
const api = require('./routes/api');
const auth = require('./routes/auth');
const app  = express();

// Source: https://graphql.github.io/graphql-js/

// Construct a schema, using GraphQL schema language
const schema = buildSchema(`
  input MessageInput {
    content: String
    author: String
  }

  type Message {
    id: ID!
    content: String
    author: String
  }

  type Mutation {
    createMessage(input: MessageInput): Message
    updateMessage(id: ID!, input: MessageInput): Message
  }

  type RandomDie {
    numSides: Int!
    rollOnce: Int!
    roll(numRolls: Int!): [Int]
  }
 
  type Query {
    getMessage(id: ID!): Message
    getDie(numSides: Int): RandomDie
    quoteOfTheDay: String
    random: Float!
    rollDice(numDice: Int!, numSides: Int): [Int]
  }
`);

class Message {
  constructor(id, { content, author }) {
    this.id = id;
    this.content = content;
    this.author = author;
  }
}

class RandomDie{
  constructor(numSides) {
    this.numSides = numSides;
  }

  rollOnce(){
    return 1 + Math.floor(Math.random() * this.numSides);
  }

  roll({ numRolls }) {
    let output = [];
    for (let i = 0; i < numRolls; i++){
      output.push(this.rollOnce());
    }
    return output;
  }
}

let fakeDatabase = {};
// The root provides a resolver function for each API endpoint
const root = {
  getMessage: ({ id }) => {
    if(!fakeDatabase[id]){
      throw new Error('no message exists with id ' + id);
    }
    return new Message(id, fakeDatabase[id]);
  },
  createMessage: ({ input }) => {
    let id = require('crypto').randomBytes(10).toString('hex');
    fakeDatabase[id] = input;
    return new Message(id, input);
  },
  updateMessage: ({ id, input }) => {
    if(!fakeDatabase[id]){
      throw new Error('no message exists with id ' + id);
    }
    fakeDatabase[id] = input;
    return new Message(id, input);
  },
  getDie: function ({ numSides }){
    return new RandomDie( numSides || 6);
  },
  quoteOfTheDay: () => {
    return Math.random() < 0.5 ? 'Take it easy' : 'Salvation lies within';
  },
  random: () => {
    return Math.random();
  },
  rollDice: (args) => {
    let output = [];
    for (let i = 0; i < args.numDice; i++){
      output.push(1 + Math.floor(Math.random() * (args.numSides || 6 )));
    }
    return output;
  },
};

// middleware to enable json data
app.use(express.json());

app.use(passport.initialize());

app.use('/api', api);

app.use('/auth', auth);

app.use('/graphql', graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
  }));

// middleware to handle erros
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Something went wrong...');
});

app.listen(port, () => {
    console.log(`Server OK: http://localhost:${port}`);
});

/*
mutation {
  createMessage(input: {
    author: "moi", 
    content: "que c'est beau",
  }) {
    id
  }
}

{
  getMessage(id:"b9542b3841f0e0d2be79"){
    author
  }
}

*/
