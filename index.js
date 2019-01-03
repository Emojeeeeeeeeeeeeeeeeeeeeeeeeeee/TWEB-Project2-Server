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
    author: String!
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
    like: Int!
    timestamp: String!
  }

  type User {
    id: String!
    username: String!
    password: String!
    email: String!
    image: String!
    messages: [String]!
    followed: [String]!
    follower: [String]!
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
    getMessagesFromDB(email: String!, offset: Int) : [Message]
  }
`);

class Message {
  constructor(id, author, content, like, timestamp) {
    this.id = id;
    this.author = author;
    this.content = content;
    this.like = like;
    this.timestamp = timestamp;
  }
}

class User {
  constructor({ id, username, password, email, image, messages, followed, followers}){
    this.id = id;
    this.username = username;
    this.password = password;
    this.email = email;
    this.image = image;
    this.messages = messages;
    this.followed = followed;
    this.followers = followers;
  }
}

// The root provides a resolver function for each API endpoint
const root = {
  getMessagesFromDB: ({ email, offset}) => {
    return new Promise((resolve) => {
    UserModel.find({email}, {email : 1, followed : 1, _id : 0}).then((data) => {
      data = data[0]
      userFollowedTab = data.followed
      userFollowedTab.push(data.email)

      const promises= [];
      messages = [];
      userFollowedTab.forEach(element => {
        promises.push(MessageModel.find({author: element}));
      });
      Promise.all(promises).then((data) => {
        data = data[1]
        data.sort(function(a, b){
          return b.timestamp-a.timestamp;
        });
        data = data.slice((offset*99) + offset, (offset + 1) * 99);
        for (let i = 0; i < data.length; i++){
          data[i] = new Message(data[i]._id, data[i].author, data[i].content, data[i].like, data[i].timestamp);
        }
        console.log(data[0] instanceof Message)
        resolve(data);
      })

    })
  })
  },
  getMessages: ({ email }) => {
    return MessageModel.find({ author: email });
  },
  getMessage: ({ id }) => {
    return MessageModel.findOne({_id:new ObjectId(id) });
  },
  createMessage: ({ input }) => {
    let newMessage = new MessageModel({ content: input.content, author: input.author});
    newMessage.save();
    return newMessage;
  },
  createUser: ({ input }) => {
    let newUser = new UserModel({ username: input.username, password: input.password, email: input.email });
    UserModel.findOne({email: input.email}, {password: 0}).then(data => {
      if(data === null){
        newUser.save();
        res.send();
      }
      return false;
    })
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