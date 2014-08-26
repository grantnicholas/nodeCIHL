exports.getChatroom = function(req, res) {
	res.location('chat');
	res.render('chat', {
		title: 'Chat',
		displayname: req.session.un
	});
}

exports.postMessage = function(req, res) {
  var message = req.body.message;

  if(req._.isUndefined(message) || req._.isEmpty(message.trim())) {
    return res.json(400, {error: "Message is invalid"});
  }

  var name = req.session.un;

  //Emit incomingMessage and capture it in index.js for the clients to render
  req.io.sockets.emit("incomingMessage", {message: message, name: name});
  
  /*-------------Handle special commands that deal with interfacing with the league bot---------------*/
  
  var db = req.db;
  //Sign a user into a game
  if(message == ".sign"){
	var chatroom = req.db.get('chatroom');
	chatroom.find({status : "lobby"},{},function(e,docs){
		if(typeof docs[0] != "undefined"){
			var isAlreadySigned = false;
			for (var i in docs[0].players){
				if(docs[0].players[i] == name) {isAlreadySigned = true;}
			}
			if(typeof docs[0] != undefined && !isAlreadySigned && docs[0].players.length <10)
			{
				chatroom.update({status : "lobby"}, {$push: {players: name} });
				respmessage = name + " has signed into the game";
				req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );	
			}
			else{
				respmessage = "Error: cannot sign into game";
				req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
			}
		}
    });
  }

//And sign out to leave a game 
  if(message == ".out"){
	var chatroom = db.get('chatroom');
	chatroom.find({status : "lobby"},{},function(e,docs){
		if(typeof docs[0] != "undefined"){
			var isAlreadySigned = false;
			for (var i in docs[0].players){
				if(docs[0].players[i] == name) {isAlreadySigned = true;}
			}
			if(isAlreadySigned){
				chatroom.update({status : "lobby"}, {$pull: {players: name} });
				respmessage = name + " has signed out of the game";
				req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
			}
		}
	});

  }

  //Create a new game only if there is not an existing game in the queue
  if(message == ".create"){
	var respmessage = "";
	var chatroom = req.db.get('chatroom');
	chatroom.find({status : "lobby"}, {}, function(e,documents){
		if(typeof documents[0] == "undefined"){
			chatroom.find({ $query: {gameid: {$exists: true} }, $orderby: { gameid: -1  } },function(e,docs){
				var newgameid = docs[0].gameid + 1;
				var newgame = [{ "gameid" : newgameid, "status": "lobby", "players" : [name], "owner" : name }]
				chatroom.insert(newgame);
				respmessage = "Signups are open for gameID: " + newgameid;
				req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
			});
		}
		else{
			respmessage += "Only one game can be created at a time"; 
			req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
		}

    	});
  }

//Helper functions to sort the teams by skill. The array of players is sorted from highest rated to 
//lowest rated and then the following teams are made by rank:
//Radiant is 1/4/6/8/10
//Dire is 2/3/5/7/9

//The sortArray function uses an in place insertion sort

var getMMR = function(name){
	var chatroom = req.db.get('chatroom');
	chatroom.find({username: name}, {}, function(e,docs){
		return docs[0].mmr;
	});
}  

var moveStuff = function(arr,remove,add){
	var tmp = arr[remove];
	for(var i=remove; i>add; i--){
		arr[i] = arr[i-1];
	}
	arr[add] = tmp;
}

var sortArray = function(arr){
	for(var i=1; i<arr.length; i++){
		for(var j=0; j<i; j++){
			if( getMMR(arr[i].username)< getMMR(arr[j].username) ){
				moveStuff(arr,i,j);
			}
		}
	
	}
}

  //If there are 10 people in the new game, close the signups of the game, and assign the teams
  if(message == ".start"){
	var respmessage = "";
	var chatroom = req.db.get('chatroom');
	chatroom.find({status : "lobby"}, {}, function(e,documents){
		if(typeof documents[0] != "undefined"){
			if(documents[0].owner == name && documents[0].players.length == 10){
				sortArray(documents[0].players);
				chatroom.update({status: "lobby"},{ $set: { status : "inProgress" }});

				respmessage = "Signups are closed for gameID: " + documents[0].gameid;
				respmessage += "\n Radiant: " + documents[0].players[0] + " | " +documents[0].players[3] + " | " +documents[0].players[5] + " | " + documents[0].players[7] + " | " + documents[0].players[9];
				respmessage += "\n Dire   : " + documents[0].players[1] + " | " +documents[0].players[2] + " | " +documents[0].players[4] + " | " + documents[0].players[6] + " | " + documents[0].players[8];
				respmessage += "\n Lobby password is cihl" + documents[0].gameid;
				req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );

			}
		}

    });
  }

  /* REPORT FUNCTIONS in progress
  if(message == ".radiant"){
	var respmessage = "";
	var chatroom = req.db.get('chatroom');
	chatroom.find({status : "lobby"}, {}, function(e,docs){
		if(typeof docs[0] != "undefined"){
			if(name == docs[0].owner){
				chatroom.remove({status : "lobby"});
				respmessage = 
				req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
			}
		}

    });
  }
    
  if(message == ".dire"){
	var respmessage = "";
	var chatroom = req.db.get('chatroom');
	chatroom.find({status : "lobby"}, {}, function(e,docs){
		if(typeof docs[0] != "undefined"){
			if(name == docs[0].owner){
				chatroom.remove({status : "lobby"});
				respmessage = docs[0].gameid + " has been closed by " + name;
				req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
			}
		}

    });
  }
  */

  //Destroy a game if the owner
  if(message == ".destroy"){
	var respmessage = "";
	var chatroom = req.db.get('chatroom');
	chatroom.find({status : "lobby"}, {}, function(e,docs){
		if(typeof docs[0] != "undefined"){
			if(name == docs[0].owner){
				chatroom.remove({status : "lobby"});
				respmessage = docs[0].gameid + " has been closed by " + name;
				req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
			}
		}

    });
  }

  //List all the players in the current game queue
  if(message == ".lp"){
	var respmessage = "Listing Players: ";
	var chatroom = req.db.get('chatroom');
	chatroom.find({status : "lobby"}, {}, function(e,docs){
		if(typeof docs[0] != "undefined"){
			for (var i in docs[0].players){
				respmessage += docs[0].players[i] + " | ";
			}
			req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
		}
	});
  }

  //Look up the stats of the messanger and display them in chat
  if(message == ".me"){
	var respmessage = "";
	var chatroom = req.db.get('chatroom');
	chatroom.find({username: name},{},function(e,docs){
		if(e){ console.log("fuckedupquery");}
		if(!e) { console.log("something better showup");}
		respmessage += docs[0].username + " | mmr: " + docs[0].mmr + " | wins: " + docs[0].wins + " | losses: " + docs[0].losses;
		req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );

    	});
  }
  res.json(200, {message: "Message received"});
}
