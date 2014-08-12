/**
 * Module dependencies:
 */
var express = require("express");
var http = require("http").createServer(app);
var bodyParser = require("body-parser");
var io = require("socket.io").listen(http);
var _ = require("underscore");
var mongo = require("mongodb");
var monk = require("monk");

// hail marys
var logger = require('morgan');
var cookieParser = require('cookie-parser');


/**
 * Load controllers / routes.
 */

var homeController = require('./routes/')

var routes = require('./routes/index');
//var login = require('./routes/login');
//var showresults = require('./routes/showresults');


/*
 The list of participants in our chatroom.
 The format of each participant will be:
 {
 id: "sessionId",
 name: "participantName"
 }
 */
var participants = [];


/**
 * Server configuration.
 */


var app = express();
var db = monk("localhost:27017/chatroom");

app.set("ipaddr", "127.0.0.1");
app.set("port", 8080);
app.set("views", __dirname + "/views");
app.set("view engine", "jade");
app.use(express.static("public", __dirname + "/public"));
app.use(bodyParser.json());

//hail marys
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

/**
 * Set routes.
 */

 app.get('/', homeController.index);
 app.get('/login', userController.getLogin);
 app.post('/login', userController.postLogin);


// app.use('/', routes);
//app.use('/login', login);
//app.use('/showresults', showresults);

/* Server routing */
/*


//Handle route "GET /", as in "http://localhost:8080/"
app.get("/", function(request, response) {

  //Render the view called "index"
  response.render("index");

});

//Handle route "GET /", as in "http://localhost:8080/"
app.get("/login", function(request, response) {

  //Render the view called "index"
  response.render("login");

});


app.post('/thelogin', function(req,res){
	console.log(req.body.username);
	console.log(req.body.password);
	res.send('index');
});


//POST method to create a chat message
app.post("/message", function(request, response) {

  //The request body expects a param named "message"
  var message = request.body.message;

  //If the message is empty or wasn't sent it's a bad request
  if(_.isUndefined(message) || _.isEmpty(message.trim())) {
    return response.json(400, {error: "Message is invalid"});
  }

  //We also expect the sender's name with the message
  var name = request.body.name;

  //Let our chatroom know there was a new message
  io.sockets.emit("incomingMessage", {message: message, name: name});
  //Looks good, let the client know

  if(message == ".sign"){
	var chatroom = request.db.get('chatroom');
	chatroom.find({username : name},{},function(e,docs){
		if(typeof docs[0] != undefined && docs[0].currentgameid == 0)
		{
			respmessage = docs[0].username + " has signed into the game";
			io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );	
		}

    	});
  }


  if(message == ".create"){
	var chatroom = request.db.get('chatroom');
	chatroom.find({currentgame: {$exists: true}},{},function(e,docs){
		if(typeof docs[0] != undefined)
		{
			respmessage = "Signups are open for gameID: ";
			var gamenum = docs[0].currentgame;
			respmessage += String(gamenum);
			gamenum++;
			io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
			chatroom.update(docs[0]._id, {$set: {currentgame : gamenum}});
		}

    	});
  }


  if(message == ".lp"){
	var respmessage = "";
	var chatroom = request.db.get('chatroom');
	chatroom.find({},{},function(e,docs){
		if(e){ console.log("uckedupquery");}
		if(!e) { console.log("something better showup");}
		respmessage += String(docs[0].username);
		io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );

    	});
  }

  if(message == ".me"){
	var respmessage = "";
	var chatroom = request.db.get('chatroom');
	chatroom.find({username: name},{},function(e,docs){
		if(e){ console.log("uckedupquery");}
		if(!e) { console.log("something better showup");}
		respmessage += docs[0].username;
		console.log(docs[0].currentgameid);
		io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );

    	});
  }

  response.json(200, {message: "Message received"});

});

*/

/* Socket.IO events */
io.on("connection", function(socket){

  /*
   When a new user connects to our server, we expect an event called "newUser"
   and then we'll emit an event called "newConnection" with a list of all
   participants to all connected clients
   */
  socket.on("newUser", function(data) {
    participants.push({id: data.id, name: data.name});
    io.sockets.emit("newConnection", {participants: participants});
  });

  /*
   When a user changes his name, we are expecting an event called "nameChange"
   and then we'll emit an event called "nameChanged" to all participants with
   the id and new name of the user who emitted the original message
   */
  socket.on("nameChange", function(data) {
    _.findWhere(participants, {id: socket.id}).name = data.name;
    io.sockets.emit("nameChanged", {id: data.id, name: data.name});
  });

  /*
   When a client disconnects from the server, the event "disconnect" is automatically
   captured by the server. It will then emit an event called "userDisconnected" to
   all participants with the id of the client that disconnected
   */
  socket.on("disconnect", function() {
    participants = _.without(participants,_.findWhere(participants, {id: socket.id}));
    io.sockets.emit("userDisconnected", {id: socket.id, sender:"system"});
  });

});

//Start the http server at port and IP defined before
http.listen(app.get("port"), app.get("ipaddr"), function() {
  console.log("Server up and running. Go to http://" + app.get("ipaddr") + ":" + app.get("port"));
});

module.exports = app;

