require('dotenv/config');

const express = require('express');
const passport = require('passport');
const { buildSchema } = require('graphql');
const graphqlHTTP = require('express-graphql');
const cors = require('cors');
const { port } = require('./config');
const api = require('./routes/api');
const { router, UserModel, MessageModel, ObjectId } = require('./routes/auth');
const app  = express();
const mongoose = require('mongoose');

app.use(cors());

// middleware to enable json data
app.use(express.json());
app.use(passport.initialize());

// Source: https://graphql.github.io/graphql-js/
if (process.env.NODE_ENV === 'production') {
	app.use(express.static('client/build'));
}
// Construct a schema, using GraphQL schema language
const schema = buildSchema(`
  input MessageInput {
    content: String!
  }

  input UserInput {
    username: String!
    password: String!
    email: String!
    image: String
  }

  type Message {
    id: String!
    author: String!
    content: String!
    timestamp: String!
  }

  type User {
    id: String!
    username: String!
    password: String!
    email: String!
    image: String
    messages: [String]
  }

  type Mutation {
    createMessage(input: MessageInput): Message
    updateMessage(email: String!, input: MessageInput): Message
    createUser(input: UserInput!): User
  }

  type Query {
    getMessages(email: String!): [Message]
    getUser(email: String!) : [User]
    getMessage(id: String!) : Message
  }
`);

class Message {
  constructor(id, author, { content }, timestamp) {
    this.id = id;
    this.auhtor = author;
    this.content = content;
    this.timestamp = timestamp;
  }
}

class User {
  constructor({ id, username, password, email, image}){
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
  getMessages: ({ email }) => {
    return MessageModel.find({ author: email });
  },
  getMessage: ({ id }) => {
    return MessageModel.findOne({_id:new ObjectId(id) });
  },
  createMessage: ({ input }) => {
    let newMessage = new MessageModel({ content: input.content});
    newMessage.save();
    return newMessage;
  },
  updateMessage: ({ email, input }) => {
    let message = MessageModel.findOne({ email });
    message.content = input.content;
    message.save();
    return message;
  },
  createUser: ({ input }) => {
    let newUser = new UserModel({ username: input.username, password: input.password, email: input.email, image: input.image });
    newUser.save();
    return newUser;
  },
  getUser: ({ email }) => {
    return UserModel.find({ email });
  }
};

app.use('/api', api);

app.use('/auth', router);

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
  getUser(email:"toto@tutu.tata"){
    id
    username
    email
        messages
  }
}
*/