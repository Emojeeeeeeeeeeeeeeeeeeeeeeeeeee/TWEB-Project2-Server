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
    like: [String]!
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

  type Query {
    createMessage(input: MessageInput): Message
    deleteMessage(id: String, author: String): Boolean
    getUser(email: String!) : [User]
    getMessagesFromDB(email: String!, offset: Int) : [Message]
    createUser(input: UserInput!): User
    like(messageId: String!, userId: String!): Boolean
    unlike(messageId: String!, userId: String!): Boolean
    follow(targetId: String!, userId: String!): Boolean
    unfollow(targetId: String!, userId: String!): Boolean
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
    UserModel.find({email}, {email : 1, followed : 1, _id : 1}).then((data) => {
      data = data[0]
      userFollowedTab = data.followed
      userFollowedTab.push(data.id)

      const promises= [];
      messages = [];
      userFollowedTab.forEach(element => {
        promises.push(MessageModel.find({author: element}));
      });
      Promise.all(promises).then((data) => {
          let fullData = []
          data.forEach(element => {
            fullData = fullData.concat(element)
          })
          if(fullData.length === 0){
            resolve(null)
          }
        else{
          fullData.sort(function(a, b){
          return b.timestamp-a.timestamp;
        });
        fullData = fullData.slice((offset*99) + offset, (offset + 1) * 99);
        for (let i = 0; i < fullData.length; i++){
          fullData[i] = new Message(fullData[i].id, fullData[i].author, fullData[i].content, fullData[i].like, fullData[i].timestamp);
        }
        console.log(fullData[0] instanceof Message)
        resolve(fullData);
      }
      })

    })
  })
  },
  createMessage: ({ input }) => {
    return new Promise((resolve) => {
    let newMessage = new MessageModel({ content: input.content, author: input.author});
    newMessage.save(function(err, message){
      const id = message.id
      UserModel.update({_id: input.author}, {$addToSet: {messages: id}})
      .then(res => {
        resolve(message)
        })
    });
  })
  },
  deleteMessage: ({id, author}) => {
    return new Promise((resolve) => {
    MessageModel.remove({"_id" : ObjectId(id)})
    .then(res => {
      UserModel.update( {'email': author}, { $pull: { "messages" : { id: ObjectId(id) } } }, false)
      .then(res => {
        resolve(true)
      });
    })
    .catch(err => {
      console.log(err)
      resolve(false)
    })
  })
  },
  follow: ({targetId, userId}) => {
    return new Promise((resolve) => {
      //add the user to the followers of the target
      UserModel.update({_id: targetId}, {$addToSet: {followers: userId}})
      .then(res => {
        //add the target to the followed list of the current user
        UserModel.update({_id : userId}, {$addToSet : {followed: targetId}})
        .then(res => {
          resolve(true)
        })
      })
    });
  },
  unfollow: ({targetId, userId}) => {
    return new Promise((resolve) => {
     //remove the user to the followers of the target
     UserModel.update({_id: targetId}, {$pull: {followers: userId}})
     .then(res => {
       //remove the target to the followed list of the current user
       UserModel.update({_id : userId}, {$pull : {followed: targetId}})
       .then(res => {
         resolve(true)
       })
     })
    })
  },
  like: ({messageId, userId}) => {
    return new Promise((resolve) => {
      //add the user to the likes of the message
      MessageModel.update({_id: messageId}, {$addToSet: {like: userId}})
      .then(res => {
          resolve(true)
      })
    })
  },
  unlike : ({messageId, userId}) => {
    return new Promise((resolve) => {
      //remove the user to the likes of the message
      MessageModel.update({_id: messageId}, {$pull: {like: userId}})
      .then(res => {
          resolve(true)
      })
    })
  },
  createUser: ({ input }) => {
    return new Promise((resolve) => {
      let newUser = new UserModel({ username: input.username, password: input.password, email: input.email });
      UserModel.findOne({email: input.email}, {password: 0}).then(data => {
        if(data === null){
          newUser.save()
          resolve(newUser)
          };
        resolve(null)
      })
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