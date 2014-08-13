// KEVIN: most of this code should go to server.js, instead of all the routing information here
// I'll reorganize a bit later

var express = require('express');
var router = express.Router();

//This was used for testing POST; can be deleted 
router.get('/showresults', function(req, res) {
  res.render('showresults', {username : "helloworld"});
});

//POST method to handle all messaging from both players and the server
router.post("/message", function(request, response) {

  //The request body expects a param named "message"
  var message = request.body.message;

  //If the message is empty or wasn't sent it's a bad request
  if(request._.isUndefined(message) || request._.isEmpty(message.trim())) {
    return response.json(400, {error: "Message is invalid"});
  }

  //We also expect the sender's name with the message
  var name = request.body.name;

  //Let our chatroom know there was a new message
  request.io.sockets.emit("incomingMessage", {message: message, name: name});
  //Looks good, let the client know

  //Get mongodb var
  var db = request.db;

  if(message == ".sign"){
	var chatroom = request.db.get('chatroom');
	chatroom.find({username : name},{},function(e,docs){
		if(typeof docs[0] != undefined && docs[0].currentgameid == 0)
		{
			respmessage = docs[0].username + " has signed into the game";
			request.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );	
		}

    	});
  }


  if(message == ".create"){
	var respmessage = "";
	var chatroom = request.db.get('chatroom');
	chatroom.find({status : "lobby"}, {}, function(e,docs){
		if(!docs[0]){
			chatroom.find({ $query: {gameid: {$exists: true} }, $orderby: { gameid: -1  } },function(e,docs){
				var newgameid = docs[0].gameid + 1;
				var newgame = [{ "gameid" : newgameid, "numplayers": 0, "status" : "lobby" }]
				chatroom.insert(newgame);
				respmessage = "Signups are open for gameID: " + newgameid;
				request.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
				//chatroom.update(docs[0]._id, {$set: {currentgame : gamenum}});
			});
		}
		else{
			respmessage += "Only one game can be created at a time"; 
			request.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
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
		request.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );

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
		request.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );

    	});
  }

  response.json(200, {message: "Message received"});

});


//The POST function that submits upon clicking the form button 
//Verify the username and password are correct then log the user in, forward them to the inhouse league chat, and set their username in the chat to be equal to the given username
router.post('/login', function(req,res){
	var un = req.body.username;
	var pass = req.body.password;
	var db = req.db;
	var chatroom = db.get('chatroom');
	chatroom.find({ $and: [{username : un}, {password : pass}] }, function(e,docs){

		if(!docs[0]){ 
			res.send("Invalid username or password")
		}
		else {
			res.location('index');
			res.render('index', {displayname : un});
			
		}
	}); 
});


module.exports = router;

