const { buildSchema } = require('graphql');
const { UserModel, MessageModel, ObjectId } = require('../database/database');
const { images } = require('../resources/DefaultAvatars');

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
  getMessagesFromDB: ({ authorId, offset }) => new Promise((resolve, reject) => {
    UserModel.findOne({ _id: authorId }, { email: 1, following: 1, _id: 1 }).then((data) => {
      const userFollowedTab = data.following === undefined ? [] : data.following;
      userFollowedTab.push(data.id);

      const promises = [];
      userFollowedTab.forEach((element) => {
        promises.push(MessageModel.find({ authorId: element }));
      });
      Promise.all(promises).then((data2) => {
        let fullData = [];
        data2.forEach((element) => {
          fullData = fullData.concat(element);
        });
        if (fullData.length === 0) {
          resolve(null);
        } else {
          fullData.sort((a, b) => b.timestamp - a.timestamp);
          resolve(fullData.slice((offset * 999) + offset, (offset + 1) * 999));
        }
      })
        .catch((err) => {
          reject(err);
        });
    })
      .catch((err) => {
        reject(err);
      });
  }),
  getMessagesOfUser: ({ userId, offset }) => new Promise((resolve, reject) => {
    UserModel.findOne({ _id: userId })
      .then((data) => {
        if (data === null) {
          resolve(null);
        } else {
          MessageModel.find({ authorId: userId })
            .then((messages) => {
              const fullData = messages;
              fullData.sort((a, b) => b.timestamp - a.timestamp);
              resolve(fullData.slice((offset * 999) + offset, (offset + 1) * 999));
            })
            .catch((err) => {
              reject(err);
            });
        }
      })
      .catch((err) => {
        reject(err);
      });
  }),
  getFavoriteMessages: ({ userId, offset }) => new Promise((resolve, reject) => {
    UserModel.findOne({ _id: userId }, { email: 1, following: 1, _id: 1 })
      .then((data) => {
        const userFollowedTab = data.following === undefined ? [] : data.following;
        userFollowedTab.push(data.id);

        const promises = [];
        userFollowedTab.forEach((element) => {
          promises.push(MessageModel.find({ authorId: element, like: userId }));
        });
        Promise.all(promises).then((data2) => {
          let fullData = [];
          data2.forEach((element) => {
            fullData = fullData.concat(element);
          });
          if (fullData.length === 0) {
            resolve(null);
          } else {
            fullData.sort((a, b) => b.timestamp - a.timestamp);
            resolve(fullData.slice((offset * 999) + offset, (offset + 1) * 999));
          }
        });
      })
      .catch((err) => {
        reject(err);
      });
  }),
  createMessage: ({ authorId, content }) => new Promise((resolve, reject) => {
    const newMessage = new MessageModel({ content, authorId });
    newMessage.save((err, message) => {
      const { id } = message;
      UserModel.updateOne({ _id: authorId }, { $addToSet: { messages: id } })
        .then(() => {
          resolve(message);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }),
  deleteMessage: ({ messageId, authorId }) => new Promise((resolve, reject) => {
    MessageModel.deleteOne({ _id: ObjectId(messageId) })
      .then(() => {
        UserModel.updateOne(
          { _id: authorId },
          { $pull: { messages: { id: ObjectId(messageId) } } }, false,
        )
          .then(() => {
            resolve(true);
          });
      })
      .catch((err) => {
        reject(err);
      });
  }),
  follow: ({ targetId, userId }) => new Promise((resolve, reject) => {
    const promises = [];
    // add the user to the followers of the target
    promises.push(UserModel.updateOne({ _id: targetId }, { $addToSet: { followers: userId } }));
    // add the target to the followed list of the current user
    promises.push(UserModel.updateOne({ _id: userId }, { $addToSet: { following: targetId } }));
    Promise.all(promises)
      .then(() => {
        resolve(true);
      })
      .catch((err) => {
        reject(err);
      });
  }),
  unfollow: ({ targetId, userId }) => new Promise((resolve, reject) => {
    const promises = [];
    // remove the user to the followers of the target
    promises.push(UserModel.updateOne({ _id: targetId }, { $pull: { followers: userId } }));
    // remove the target to the followed list of the current user
    promises.push(UserModel.updateOne({ _id: userId }, { $pull: { following: targetId } }));
    Promise.all(promises)
      .then(() => {
        resolve(true);
      })
      .catch((err) => {
        reject(err);
      });
  }),
  hasFollow: ({ targetId, userId }) => new Promise((resolve, reject) => {
    // add the user to the likes of the message
    UserModel.findOne({ _id: targetId }, { followers: 1 })
      .then((res) => {
        resolve(res.followers.includes(userId));
      })
      .catch((err) => {
        reject(err);
      });
  }),
  like: ({ messageId, userId }) => new Promise((resolve, reject) => {
    // add the user to the likes of the message
    MessageModel.updateOne({ _id: messageId }, { $addToSet: { like: userId } })
      .then(() => {
        resolve(true);
      })
      .catch((err) => {
        reject(err);
      });
  }),
  unlike: ({ messageId, userId }) => new Promise((resolve, reject) => {
    // remove the user to the likes of the message
    MessageModel.updateOne({ _id: messageId }, { $pull: { like: userId } })
      .then(() => {
        resolve(true);
      })
      .catch((err) => {
        reject(err);
      });
  }),
  hasLike: ({ messageId, userId }) => new Promise((resolve, reject) => {
    // add the user to the likes of the message
    MessageModel.findOne({ _id: messageId }, { like: 1 })
      .then((res) => {
        resolve(res.like.includes(userId));
      })
      .catch((err) => {
        reject(err);
      });
  }),
  createUser: ({ username, password, email }) => new Promise((resolve, reject) => {
    const newUser = new UserModel({ username, password, email });
    UserModel.findOne({ email }, { password: 0 })
      .then((data) => {
        if (data === null) {
          newUser.save()
            .then(() => {
              newUser.password = null;
              resolve(newUser);
            })
            .catch((err) => {
              reject(err);
            });
        } else {
          resolve(null);
        }
      })
      .catch((err) => {
        reject(err);
      });
  }),
  getUser: ({ userId }) => new Promise((resolve, reject) => {
    UserModel.findOne({ _id: userId }, { password: 0 })
      .then((data) => {
        resolve(data);
      })
      .catch((err) => {
        reject(err);
      });
  }),
  getUserByEmail: ({ email }) => new Promise((resolve, reject) => {
    UserModel.findOne({ email }, { password: 0 })
      .then((data) => {
        resolve(data);
      })
      .catch((err) => {
        reject(err);
      });
  }),
  getUsersByIds: ({ ids }) => new Promise((resolve, reject) => {
    const promises = [];
    ids.forEach((id) => {
      promises.push(UserModel.findOne({ _id: id }, { password: 0 }));
    });
    Promise.all(promises)
      .then((data) => {
        resolve(data);
      })
      .catch((err) => {
        reject(err);
      });
  }),
  getFollowers: ({ userId, offset }) => new Promise((resolve, reject) => {
    UserModel.findOne({ _id: userId }, { followers: 1 })
      .then((data) => {
        if (data === undefined || data === null || data.length === 0) {
          resolve([]);
        } else {
          const promises = [];
          const { followers } = data;
          followers.forEach((element) => {
            promises.push(UserModel.findOne({ _id: element }, { password: 0 }));
          });
          Promise.all(promises)
            .then((result) => {
              resolve(result.slice((offset * 999) + offset, (offset + 1) * 999));
            })
            .catch((err) => {
              resolve(err);
            });
        }
      })
      .catch((err) => {
        reject(err);
      });
  }),
  getFollowings: ({ userId, offset }) => new Promise((resolve, reject) => {
    UserModel.findOne({ _id: userId }, { following: 1 })
      .then((data) => {
        if (data === undefined || data === null || data.length === 0) {
          resolve([]);
        } else {
          const promises = [];
          const { following } = data;
          following.forEach((element) => {
            promises.push(UserModel.findOne({ _id: element }, { password: 0 }));
          });
          Promise.all(promises)
            .then((result) => {
              resolve(result.slice((offset * 999) + offset, (offset + 1) * 999));
            })
            .catch((err) => {
              resolve(err);
            });
        }
      })
      .catch((err) => {
        reject(err);
      });
  }),
  searchUser: ({ pattern }) => new Promise((resolve, reject) => {
    UserModel.find({ username: { $regex: pattern } }, { password: 0 })
      .then((data) => {
        if (data.length === undefined || data.length === 0) {
          resolve([]);
        }
        resolve(data.slice(0, 999));
      })
      .catch((err) => {
        reject(err);
      });
  }),
  changeImage: ({ userId, mood }) => new Promise((resolve, reject) => {
    UserModel.updateOne(
      { _id: userId },
      { image: images[mood][Math.floor(Math.random() * images[mood].length)] },
    )
      .then((data) => {
        const result = data;
        result.password = '';
        resolve(result);
      })
      .catch((err) => {
        reject(err);
      });
  }),
};

module.exports = { schema, root };
