const mongoose = require('mongoose');

const dbURI = 'mongodb://user1:user1@twebkoppsilvestri-shard-00-00-y2dgh.mongodb.net:27017,twebkoppsilvestri-shard-00-01-y2dgh.mongodb.net:27017,twebkoppsilvestri-shard-00-02-y2dgh.mongodb.net:27017/test?ssl=true&replicaSet=TWEBKoppSilvestri-shard-0&authSource=admin&retryWrites=true';

const options = {
  useNewUrlParser: true,
  dbName: 'HappyFaces',
};

mongoose.connect(dbURI, options);

const { ObjectId } = mongoose.Types;


const messageSchema = new mongoose.Schema({
  authorId: { type: String, required: true },
  content: { type: String, required: true },
  like: { type: Array, required: true, default: [] },
  timestamp: { type: Date, required: true, default: Date.now },
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
  messages: { type: [String], required: true, default: [] },
  following: { type: [String], required: true, default: [] },
  followers: { type: [String], required: true, default: [] },
  image: { type: String, required: true, default: 'https://cdn.shopify.com/s/files/1/1061/1924/products/Nerd_with_Glasses_Emoji_2a8485bc-f136-4156-9af6-297d8522d8d1_large.png?v=1483276509' },
});

const UserModel = mongoose.model('user', userSchema);
const MessageModel = mongoose.model('message', messageSchema);

module.exports = { UserModel, MessageModel, ObjectId };
