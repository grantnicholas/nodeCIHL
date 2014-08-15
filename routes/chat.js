exports.postMessage = function(request, response) {

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

}
