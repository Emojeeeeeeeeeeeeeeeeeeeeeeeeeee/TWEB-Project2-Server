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
    authorId: String!
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
    following: [String]!
    followers: [String]!
  }

  type Query {
    createMessage(authorId: String!, content: String!): Message
    deleteMessage(messageId: String!, authorId: String!): Boolean
    getUser(userId: String!) : User
    getMessagesFromDB(authorId: String!, offset: Int!) : [Message]
    createUser(username: String!, password: String!, email: String!): User
    like(messageId: String!, userId: String!): Boolean
    unlike(messageId: String!, userId: String!): Boolean
    hasLike(messageId: String!, userId: String!): Boolean
    follow(targetId: String!, userId: String!): Boolean
    unfollow(targetId: String!, userId: String!): Boolean
    hasFollow(targetId: String!, userId: String!): Boolean
    getUserByEmail(email: String!): User
    getFollowers(userId: String!): [User]
    getFollowings(userId: String!): [User]
    searchUser(pattern: String!): [User]
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
  constructor({ id, username, password, email, image, messages, following, followers}){
    this.id = id;
    this.username = username;
    this.password = password;
    this.email = email;
    this.image = image;
    this.messages = messages;
    this.following = following;
    this.followers = followers;
  }
}

// The root provides a resolver function for each API endpoint
const root = {
  getMessagesFromDB: ({ authorId, offset}) => {
    return new Promise((resolve) => {
    UserModel.findOne({_id : authorId}, {email : 1, followed : 1, _id : 1}).then((data) => {
      userFollowedTab = data.followed === undefined ? [] : data.followed;
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
            resolve(null);
          }
        else{
          fullData.sort(function(a, b){
          return b.timestamp-a.timestamp;
        });
        fullData = fullData.slice((offset*999) + offset, (offset + 1) * 99);
        for (let i = 0; i < fullData.length; i++){
          fullData[i] = new Message(fullData[i].id, fullData[i].author, fullData[i].content, fullData[i].like, fullData[i].timestamp);
        }
        resolve(fullData);
      }
      })

    })
  })
  },
  createMessage: ({ authorId, content }) => {
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
  hasFollow: ({targetId, userId}) => {
    return new Promise((resolve) => {
      //add the user to the likes of the message
      UserModel.findOne({_id: targetId}, {followers : 1})
      .then(res => {
          resolve(res.followers.includes(userId));
      })
    })
  },
  like: ({messageId, userId}) => {
    return new Promise((resolve) => {
      //add the user to the likes of the message
      MessageModel.update({_id: messageId}, {$addToSet: {like: userId}})
      .then(res => {
          resolve(true);
      })
    })
  },
  unlike : ({messageId, userId}) => {
    return new Promise((resolve) => {
      //remove the user to the likes of the message
      MessageModel.update({_id: messageId}, {$pull: {like: userId}})
      .then(res => {
          resolve(true);
      })
    })
  },
  hasLike: ({messageId, userId}) => {
    return new Promise((resolve) => {
      //add the user to the likes of the message
      MessageModel.findOne({_id: messageId}, {like : 1})
      .then(res => {
          resolve(res.like.includes(userId));
      })
    })
  },
  createUser: ({ username, password, email }) => {
    return new Promise((resolve) => {
      let newUser = new UserModel({ username, password, email });
      UserModel.findOne({email}, {password: 0}).then(data => {
        if(data === null){
          newUser.save()
          .then(data => {
            newUser.password = null;
            resolve(newUser);
          })
          .catch(err => {
            resolve(err)
          })
          }
          else {
            resolve(null)
          }
      })
    })
  },
  getUser: ({ userId }) => {
    return new Promise((resolve) => {
      UserModel.findOne({ _id : userId }, {password : 0})
      .then(data => {
        resolve(data)
      })
      .catch(err => {
        resolve(err);
      })
    })
  },
  getUserByEmail: ({ email }) => {
    return new Promise((resolve) => {
      UserModel.findOne({ email }, {password : 0})
      .then(data => {
        resolve(data)
      })
      .catch(err => {
        resolve(err);
      })
    })
  },
  getFollowers: ({userId}) => {
    return new Promise((resolve) => {
      UserModel.findOne({_id : userId}, {followers : 1})
      .then(data => {
        if(data === undefined || data === null || data.length === 0){
          resolve([])
        }
        else{
          const promises = []
          const followers = data.followers
          followers.forEach(element => {
            promises.push(UserModel.findOne({_id : element}, {password : 0}))
          });
          Promise.all(promises)
          .then(result => {
            resolve(result)
          })
          .catch(err => {
            resolve(err);
          })
        }
      })
      .catch(err => {
        resolve(err)
      })
    })
  },
  getFollowings: ({userId}) => {
    return new Promise((resolve) => {
      UserModel.findOne({_id : userId}, {followed : 1})
      .then(data => {
        if(data === undefined || data === null || data.length === 0){
          resolve([])
        }
        else{
          const promises = []
          const followed = data.followed
          followed.forEach(element => {
            promises.push(UserModel.findOne({_id : element}, {password : 0}))
          });
          Promise.all(promises)
          .then(result => {
            resolve(result)
          })
          .catch(err => {
            resolve(err);
          })
        }
      })
      .catch(err => {
        resolve(err)
      })
    })
  },
  searchUser: ({pattern}) => {
    return new Promise((resolve) => {
      console.log(pattern)
      UserModel.find({"username" : {'$regex': pattern}}, {password : 0})
      .then(data => {
        if(data.length === undefined || data.length === 0){
          resolve([])
        }
          resolve(data.slice(0,999))
      })
      .catch(err => {
        resolve(err)
      })
    })
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