
//Module dependencies:

var express = require("express");
var app = express();

var http = require("http").createServer(app);
var bodyParser = require("body-parser");
var io = require("socket.io").listen(http);
var _ = require("underscore");
var mongo = require("mongodb");
var monk = require("monk");
var logger = require('morgan');
var cookieParser = require('cookie-parser');

var db = monk("localhost:27017/chatroom");


//Load controllers.


var homeController = require('./routes/home');
var userController = require('./routes/user');
var chatController = require('./routes/chat');


//Server config.

app.set("ipaddr", "127.0.0.1");
app.set("port", 8080);
app.set("views", __dirname + "/views");
app.set("view engine", "jade");
app.use(express.static("public", __dirname + "/public"));
app.use(bodyParser.json());
app.use(logger('dev'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(function(req,res,next){
    req.db = db;
    req.io = io;
    req._ = _;
    req.participants = participants;
    next();
});


//Application routes.
 
app.get('/', homeController.index);
app.get('/login', userController.getLogin);
app.post('/login', userController.postLogin);
app.post('/chat', chatController.postMessage);



/* Socket IO events
The basic idea with socket.io: socket.on("somepredefinedevent", function() {io.sockets.emit("emitThisInformationToAllClientsAndCaptureWithJquery", {the info emitted is json in here}); });
*/
 
var participants = [];

io.on("connection", function(socket){

  socket.on("newUser", function(data) {
    participants.push({id: data.id, name: data.name});
    io.sockets.emit("newConnection", {participants: participants});
  });

  socket.on("disconnect", function() {
    participants = _.without(participants,_.findWhere(participants, {id: socket.id}));
    io.sockets.emit("userDisconnected", {id: socket.id, sender:"system"});
  });

});

http.listen(app.get("port"), app.get("ipaddr"), function() {
  console.log("Server up and running. Go to http://" + app.get("ipaddr") + ":" + app.get("port"));
});

module.exports = app;

