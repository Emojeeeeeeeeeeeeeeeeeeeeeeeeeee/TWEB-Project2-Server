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
    createMessage(authorId: String!, content: String!): Message
    deleteMessage(messageId: String!, authorId: String!): Boolean
    getUser(userId: String!) : [User]
    getMessagesFromDB(authorId: String!, offset: Int) : [Message]
    createUser(username: String, password: String, email: String): User
    like(messageId: String!, authorId: String!): Boolean
    unlike(messageId: String!, authorId: String!): Boolean
    follow(targetId: String!, userId: String!): Boolean
    unfollow(targetId: String!, userId: String!): Boolean
  }
`);

class Message {
  constructor(id, authorId, content, like, timestamp) {
    this.id = id;
    this.authorId = authorId;
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
  getMessagesFromDB: ({ authorId, offset}) => {
    console.log("RECEIVE DEMAND");
    return new Promise((resolve) => {
    UserModel.find({_id : authorId}, {email : 1, followed : 1, _id : 1}).then((data) => {
      data = data[0];
      userFollowedTab = data.followed;
      userFollowedTab.push(data.id);

      const promises= [];
      messages = [];
      userFollowedTab.forEach(element => {
        promises.push(MessageModel.find({author: element}));
      });
      Promise.all(promises).then((data) => {
          let fullData = []
          data.forEach(element => {
            fullData = fullData.concat(element);
          })
          if(fullData.length === 0){
            console.log("NULL");
            resolve(null);
          }
        else{
          fullData.sort(function(a, b){
          return b.timestamp-a.timestamp;
        });
        fullData = fullData.slice((offset*99) + offset, (offset + 1) * 99);
        for (let i = 0; i < fullData.length; i++){
          fullData[i] = new Message(fullData[i].id, fullData[i].author, fullData[i].content, fullData[i].like, fullData[i].timestamp);
        }
        console.log(fullData[0] instanceof Message);
        resolve(fullData);
      }
      })

    })
  })
  },
  createMessage: ({ authorId, content }) => {
    console.log("inside createMessage");
    return new Promise((resolve) => {
    let newMessage = new MessageModel({ content: content, author: authorId});
    newMessage.save(function(err, message){
      const id = message.id;
      UserModel.update({_id: authorId}, {$addToSet: {messages: id}})
      .then(res => {
        resolve(message);
        })
    });
  })
  },
  deleteMessage: ({messageId, authorId}) => {
    return new Promise((resolve) => {
    MessageModel.remove({_id : ObjectId(messageId)})
    .then(res => {
      UserModel.update( {_id: authorId}, { $pull: { "messages" : { id: ObjectId(messageId) } } }, false)
      .then(res => {
        resolve(true);
      });
    })
    .catch(error => {
      console.log(error);
      resolve(false);
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
         resolve(true);
       })
     })
    })
  },
  like: ({messageId, authorId}) => {
    return new Promise((resolve) => {
      //add the user to the likes of the message
      MessageModel.update({_id: messageId}, {$addToSet: {like: authorId}})
      .then(res => {
          resolve(true);
      })
    })
  },
  unlike : ({messageId, authorId}) => {
    return new Promise((resolve) => {
      //remove the user to the likes of the message
      MessageModel.update({_id: messageId}, {$pull: {like: authorId}})
      .then(res => {
          resolve(true);
      })
    })
  },
  createUser: ({ username, password, email }) => {
    return new Promise((resolve) => {
      let newUser = new UserModel({ username, password, email });
      UserModel.findOne({email}, {password: 0}).then(data => {
        if(data === null){
          newUser.save();
          newUser.password = null;
          resolve(newUser);
          };
        resolve(null);
      })
    })
  },
  getUser: ({ userId }) => {
    return UserModel.find({ _id : userId });
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