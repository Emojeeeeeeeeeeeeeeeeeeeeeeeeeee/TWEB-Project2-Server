const mongoose = require('mongoose');

const dbURI = 'mongodb://user1:user1@twebkoppsilvestri-shard-00-00-y2dgh.mongodb.net:27017,twebkoppsilvestri-shard-00-01-y2dgh.mongodb.net:27017,twebkoppsilvestri-shard-00-02-y2dgh.mongodb.net:27017/test?ssl=true&replicaSet=TWEBKoppSilvestri-shard-0&authSource=admin&retryWrites=true';

const options = {
    useNewUrlParser: true,
    dbName: 'HappyFaces',
  };
  
  mongoose.connect(dbURI, options);
  
  const ObjectId = mongoose.Types.ObjectId;


  const messageSchema = new mongoose.Schema({
    authorId: {type: String, required: true},
    content: { type: String, required: true },
    like: { type: Array, required: true, default: [] },
    timestamp: { type: Date, required: true, default: Date.now }
  });

  const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    messages: { type: [String], required: true, default: [] },
    following: { type: [String], required: true, default: [] },
    followers: { type: [String], required: true, default: [] },
    image: {type: String, required: true, default: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQlZvqiuGKGD-deDdZT4uZydxfhazuYIQZ9nc3TqR73ROD9i-7k"}
  });

const UserModel = mongoose.model('user', userSchema);
const MessageModel = mongoose.model('message', messageSchema);

module.exports = { UserModel, MessageModel, ObjectId };