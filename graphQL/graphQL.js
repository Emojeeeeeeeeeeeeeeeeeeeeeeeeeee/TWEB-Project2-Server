const { buildSchema } = require('graphql');
const { UserModel, MessageModel, ObjectId } = require('../database/database');
const {images} = require('../resources/DefaultAvatars')

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
    getUserByEmail(email: String!): User
    getUsersByIds(ids: [String]!): [User]
    getMessagesFromDB(authorId: String!, offset: Int!) : [Message]
    getFavoriteMessages(userId: String!, offset: Int!) : [Message]
    createUser(username: String!, password: String!, email: String!): User
    like(messageId: String!, userId: String!): Boolean
    unlike(messageId: String!, userId: String!): Boolean
    hasLike(messageId: String!, userId: String!): Boolean
    follow(targetId: String!, userId: String!): Boolean
    unfollow(targetId: String!, userId: String!): Boolean
    hasFollow(targetId: String!, userId: String!): Boolean
    getFollowers(userId: String!, offset : Int!): [User]
    getFollowings(userId: String!, offset : Int!): [User]
    searchUser(pattern: String!): [User]
    getMessagesOfUser(userId : String!, offset : Int!) : [Message]
    changeImage(userId : String!, mood : String!) : User
  }
`);

// The root provides a resolver function for each API endpoint
const root = {
  getMessagesFromDB: ({ authorId, offset}) => {
    return new Promise((resolve) => {
    UserModel.findOne({_id : authorId}, {email : 1, following : 1, _id : 1}).then((data) => {
      userFollowedTab = data.following === undefined ? [] : data.following;
      userFollowedTab.push(data.id);

      const promises= [];
      messages = [];
      userFollowedTab.forEach(element => {
        promises.push(MessageModel.find({authorId: element}));
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
        resolve(fullData.slice((offset*999) + offset, (offset + 1) * 999));
        
      }
      })

    })
  })
  },
  getMessagesOfUser: ( { userId, offset }) => {
    return new Promise((resolve) => {
    UserModel.findOne({_id : userId})
    .then((data) => {
      if(data === null){
        resolve(null)
      }
      else{
        MessageModel.find({authorId : userId})
        .then(messages => {
          let fullData = messages;
          fullData.sort(function(a, b){
          return b.timestamp-a.timestamp;
        });
          resolve(fullData.slice((offset*999) + offset, (offset + 1) * 999))
        })
      }
    })
  })
  },
  getFavoriteMessages: ( { userId, offset }) => {
    return new Promise((resolve) => {
    UserModel.findOne({_id : authorId}, {email : 1, following : 1, _id : 1}).then((data) => {
      userFollowedTab = data.following === undefined ? [] : data.following;
      userFollowedTab.push(data.id);

      const promises= [];
      messages = [];
      userFollowedTab.forEach(element => {
        promises.push(MessageModel.find({authorId: element, like : userId}));
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
        resolve(fullData.slice((offset*999) + offset, (offset + 1) * 999));
        
      }
      })

    })
  })
  },
  createMessage: ({ authorId, content }) => {
    return new Promise((resolve) => {
    let newMessage = new MessageModel({ content: content, authorId: authorId});
    newMessage.save(function(err, message){
      const id = message.id;
      UserModel.updateOne({_id: authorId}, {$addToSet: {messages: id}})
      .then(res => {
        resolve(message);
        })
    });
  })
  },
  deleteMessage: ({messageId, authorId}) => {
    return new Promise((resolve) => {
    MessageModel.deleteOne({_id : ObjectId(messageId)})
    .then(res => {
      UserModel.updateOne( {_id: authorId}, { $pull: { "messages" : { id: ObjectId(messageId) } } }, false)
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
      const promises = []
     //add the user to the followers of the target
     promises.push(UserModel.updateOne({_id: targetId}, {$addToSet: {followers: userId}}))
     //add the target to the followed list of the current user
     promises.push(UserModel.updateOne({_id : userId}, {$addToSet : {following: targetId}}))
     Promise.all(promises)
     .then(res => {
       resolve(true)
     })
     .catch(err => {
       resolve(false)
     })
    });
  },
  unfollow: ({targetId, userId}) => {
    return new Promise((resolve) => {
      const promises = []
     //remove the user to the followers of the target
     promises.push(UserModel.updateOne({_id: targetId}, {$pull: {followers: userId}}))
     //remove the target to the followed list of the current user
     promises.push(UserModel.updateOne({_id : userId}, {$pull : {following: targetId}}))
     Promise.all(promises)
     .then(res => {
       resolve(true)
     })
     .catch(err => {
       resolve(false)
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
      MessageModel.updateOne({_id: messageId}, {$addToSet: {like: userId}})
      .then(res => {
          resolve(true);
      })
    })
  },
  unlike : ({messageId, userId}) => {
    return new Promise((resolve) => {
      //remove the user to the likes of the message
      MessageModel.updateOne({_id: messageId}, {$pull: {like: userId}})
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
  getUsersByIds: ({ ids }) => {
    return new Promise((resolve) => {
      const promises = []
      ids.forEach(id => {
        promises.push(UserModel.findOne({_id : id}, {password : 0}));
      })
      Promise.all(promises)
      .then(data => {
        resolve(data)
      })
      .catch(err => {
        resolve(err);
      })
    })
  },
  getFollowers: ({userId, offset}) => {
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
            resolve(result.slice((offset*999) + offset, (offset + 1) * 999))
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
  getFollowings: ({userId, offset}) => {
    return new Promise((resolve) => {
      UserModel.findOne({_id : userId}, {following : 1})
      .then(data => {
        if(data === undefined || data === null || data.length === 0){
          resolve([])
        }
        else{
          const promises = []
          const following = data.following
          following.forEach(element => {
            promises.push(UserModel.findOne({_id : element}, {password : 0}))
          });
          Promise.all(promises)
          .then(result => {
            resolve(result.slice((offset*999) + offset, (offset + 1) * 999))
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
  },
  changeImage: ({userId, mood}) => {
    return new Promise((resolve) => {
      UserModel.updateOne({_id : userId}, {image : images[mood][Math.floor(Math.random() * images[mood].length)]})
      .then(data => {
        result = data
        result.password = "";
        resolve(result);
      })
      .catch(err => {
        resolve(err)
      })
    })
  }
};

module.exports = { schema, root };