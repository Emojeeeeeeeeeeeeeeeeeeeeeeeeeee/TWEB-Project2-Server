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
if (process.env.NODE_ENV === 'production') {
	app.use(express.static('client/build'));
}
// Construct a schema, using GraphQL schema language
const schema = buildSchema(`
  input MessageInput {
    content: String
  }

  input UserInput {
    username: String
    password: String
    email: String
    image: String
  }

  type Message {
    id: ID!
    content: String!
    
  }

  type User {
    id: ID!
    username: String!
    password: String!
    email: String!
    image: String
  }

  type Mutation {
    createMessage(input: MessageInput): Message
    updateMessage(id: ID!, input: MessageInput): Message
    createUser(input: UserInput!): User

  }

  type Query {
    getMessage(id: ID!): Message
    getUser(id: ID!) : User
  }
`);

class Message {
  constructor(id, { content }) {
    this.id = id;
    this.content = content;
  }
}

class User {
  constructor(id, { username, password, email, image}){
    this.id = id;
    this.username = username;
    this.password = password;
    this.email = email;
    this.image = image;
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
  createUser: ({ input }) => {
    let id = require('crypto').randomBytes(10).toString('hex');
    return new User(id, {input});
  },
};

// middleware to enable json data
app.use(express.json());

app.use(passport.initialize());

app.get('*', (request, response) => {
	response.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.get('/', (req, res, next) => {
  res.send("hello")
    .catch(next);
});

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

{
	getDie(numSides: 4){
    roll(numRolls: 3)
    rollOnce
  }
}

*/
