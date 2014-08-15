exports.postMessage = function(request, response) {
  var message = request.body.message;

  if(request._.isUndefined(message) || request._.isEmpty(message.trim())) {
    return response.json(400, {error: "Message is invalid"});
  }

  var name = request.body.name;

  //Emit incomingMessage and capture it in index.js for the clients to render
  request.io.sockets.emit("incomingMessage", {message: message, name: name});
  


  /*-------------Handle special commands that deal with interfacing with the league bot---------------*/
  
  var db = request.db;
  //Sign a user into a game
  if(message == ".sign"){
	var chatroom = request.db.get('chatroom');
	chatroom.find({status : "lobby"},{},function(e,docs){
		var isAlreadySigned = false;
		for (var i in docs[0].players){
			if(docs[0].players[i] == name) {isAlreadySigned = true;}
		}
		if(typeof docs[0] != undefined && !isAlreadySigned)
		{
			chatroom.update({status : "lobby"}, {$push: {players: name} });
			respmessage = name + " has signed into the game";
			request.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );	
		}
		else{
			respmessage = "Error: cannot sign into game";
			request.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
		}

    	});
  }

//And sign out to leave a game 

  if(message == ".out"){
	var chatroom = db.get('chatroom');
	chatroom.find({status : "lobby"},{},function(e,docs){
		var isAlreadySigned = false;
		for (var i in docs[0].players){
			if(docs[0].players[i] == name) {isAlreadySigned = true;}
		}
		if(isAlreadySigned){
			chatroom.update({status : "lobby"}, {$pull: {players: name} });
			respmessage = name + " has signed out of the game";
			request.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
		}
	});

  }


  //Create a new game only if there is not an existing game in the queue
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

  //List all the players in the current game queue
  if(message == ".lp"){
	var respmessage = "Listing Players: ";
	var chatroom = request.db.get('chatroom');
	chatroom.find({status : "lobby"}, {}, function(e,docs){
		if(e){ console.log("uckedupquery");}
		if(!e) { console.log("something better showup");}
		for (var i in docs[0].players){
			respmessage += docs[0].players[i] + " | ";
		}
		request.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );

    	});
  }


  //Look up the stats of the messanger and display them in chat
  if(message == ".me"){
	var respmessage = "";
	var chatroom = request.db.get('chatroom');
	chatroom.find({username: name},{},function(e,docs){
		if(e){ console.log("fuckedupquery");}
		if(!e) { console.log("something better showup");}
		respmessage += docs[0].username + " | mmr: " + docs[0].mmr + " | wins: " + docs[0].wins + " | losses: " + docs[0].losses;
		request.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );

    	});
  }

  response.json(200, {message: "Message received"});

}
