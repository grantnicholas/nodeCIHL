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
  var chatroom = req.db.get('newchatroom');

  //Sign a user into a game
  if(message == ".sign"){
  	var respmessage = "";
	chatroom.find({status : "lobby"},{},function(e,docs){
		if(typeof docs[0] != "undefined"){
			var isAlreadySigned = false;
			for (var i in docs[0].players){
				if(docs[0].players[i] == name) {isAlreadySigned = true;}
			}
			if(typeof docs[0] != undefined && !isAlreadySigned && docs[0].players.length <10)
			{
				chatroom.update({status : "lobby"}, {$push: {players: {username : name, result: 0} } });
				chatroom.update({username : name }, {$set:  {currentgameid : docs[0].gameid} });
				respmessage += name + " has signed into the game";
				req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );	
			}
			else{
				respmessage += "Error: cannot sign into game";
				req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
			}
		}
    });
  }

//And sign out to leave a game 
  if(message == ".out"){
  	var respmessage = "";
	chatroom.find({status : "lobby"},{},function(e,docs){
		if(typeof docs[0] != "undefined"){
			var isAlreadySigned = false;
			for (var i in docs[0].players){
				if(docs[0].players[i].username == name) {isAlreadySigned = true;}
			}
			if(isAlreadySigned){
				chatroom.update({status : "lobby"}, {$pull: {players: {username : name} } });
				respmessage += name + " has signed out of the game";
				req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
			}
		}
	});

  }

  //Create a new game only if there is not an existing game in the queue
  if(message == ".create"){
	var respmessage = "";
	chatroom.find({status : "lobby"}, {}, function(e,documents){
		if(typeof documents[0] == "undefined"){
			chatroom.find({ $query: {gameid: {$exists: true} }, $orderby: { gameid: -1  } },function(e,docs){
				var newgameid = docs[0].gameid + 1;
				var newgame = [{ "gameid" : newgameid, "status": "lobby", "players" : [{username : name, result : 0}], "owner" : name }]
				chatroom.insert(newgame);
				respmessage += "Signups are open for gameID: " + newgameid;
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
var radindices = [0,3,5,7,9]; 
var direindices = [1,2,4,6,8];

var getMMR = function(name){
	chatroom.find({username: name}, {}, function(e,docs){
		var rating = docs[0].mmr;
		return rating;
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
	chatroom.find({status : "lobby"}, {}, function(e,documents){
		if(typeof documents[0] != "undefined"){
			if(documents[0].owner == name && documents[0].players.length == 10){
				sortArray(documents[0].players);
				chatroom.update({status: "lobby"},{ $set: { status : "inProgress" }});

				respmessage += "Signups are closed for gameID: " + documents[0].gameid;
				respmessage += "\n Radiant: " + documents[0].players[0].username + " | " +documents[0].players[3].username + " | " +documents[0].players[5].username + " | " + documents[0].players[7].username + " | " + documents[0].players[9].username;
				respmessage += "\n Dire   : " + documents[0].players[1].username + " | " +documents[0].players[2].username + " | " +documents[0].players[4].username + " | " + documents[0].players[6].username + " | " + documents[0].players[8].username;
				respmessage += "\n Lobby password is cihl" + documents[0].gameid;
				req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );

			}
		}

    });
  }

  var updateMMR = function(arr,win){
  	var rmmr = 0; 
  	var dmmr = 0;
  	console.log('hello');

	/*
    for(var i in radindices){
    	rmmr += getMMR(arr[radindices[i]].username);
    }
    for(var i in direindices){
    	dmmr += getMMR(arr[direindices[i]].username);
    }
    */

	var diff = rmmr - dmmr; 
	var changeMMR = Math.abs(diff); 
	var winMMR = 0; 
	var loseMMR = 0; 
	var rupmmr = 0; 
	var dupmmr = 0;

    if(changeMMR > 2000){
    	winMMR = 45; 
    	loseMMR = 5;
    }else if(changeMMR > 1500){
    	winMMR = 35; 
    	loseMMR = 15;

    }else if(changeMMR > 1000){
    	winMMR = 30; 
    	loseMMR = 20;

    }else if(changeMMR > 500){
    	winMMR = 27.5; 
    	loseMMR = 22.5;

    }else {
    	winMMR = 25; loseMMr = 25;
    }

    if(win =='rad'){
    	if(rmmr>=dmmr){
    		rupmmr = loseMMR;
    		dupmmr = -1*loseMMR;
    	}
    	else{
    		rupmmr = winMMR;
    		dupmmr = -1*winMMR;
    	}
    }
    if(win =='dire'){
    	if(rmmr>=dmmr){
    		rupmmr = -1*winMMR;
    		dupmmr = -winMMR;
    	}
    	else{
    		rupmmr = -1*loseMMR;
    		dupmmr = loseMMR;
    	}
    }

    for(var i in radindices){
    	chatroom.update({username : arr[radindices[i]].username}, {$inc: {mmr : rupmmr}}) 
    }
    for(var i in direindices){
    	chatroom.update({username : arr[direindices[i]].username}, {$inc: {mmr : dupmmr}}) 
    }

  }

  if(message == ".radiant"){
	var respmessage = "";
	chatroom.find({username : name}, {}, function(e,docs){
		if(typeof docs[0] != "undefined"){
			chatroom.find({$and: [{"players.username" : name},{"gameid" : docs[0].currentgameid} ]}, {"players" : 1, "_id" : 0}, function(e,docz){
				var players = docz[0].players;
				var result = 10; var rad = 0; var dire = 0;
				for(var i in players){
					console.log(players[i]);
					if(players[i].username == name){result = players[i].result;}
					if(players[i].result == 1){rad +=1;}
					else if(players[i].result == -1){dire +=1;}
				}
				console.log(result);
				if(result == 0){
					rad+=1;
					respmessage += name + " has reported gameID " + docs[0].currentgameid + " for the dire";
					respmessage += "\n There are: " + rad + " votes for the radiant and " + dire + " votes for the dire";
					req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
					chatroom.update({$and: [{"players.username" : name},{"gameid" : docs[0].currentgameid} ]}, {"$set" : {"players.$.result" : 1} });
				}
				if(rad >5){
					chatroom.update({gameid : docs[0].currentgameid},{$set: {lobby : "closed"} });
					console.log("poop1");

					chatroom.find({gameid: docs[0].currentgameid },function(e,doct){
						var mesg = "";
						doct[0].players.forEach(function(obj){
							var thing = obj.mmr.toString();
							mesg += thing + " | ";
							console.log(thing)
						});
						req.io.sockets.emit("incomingMessage", {message: mesg, name: "cihl:"}  );
					});
					updateMMR(players,'rad');
					var updatedMMR = "";
					console.log("poop2");
					console.log(getMMR("KnivesChau"));
					for(var i in players){
						updatedMMR += players[i].username + " | ";
					}
					req.io.sockets.emit("incomingMessage", {message: updatedMMR, name: "cihl:"});

				}
				});


		}

    });
  }
    
  if(message == ".dire"){
	var respmessage = "";
	chatroom.find({username : name}, {}, function(e,docs){
		if(typeof docs[0] != "undefined"){
			var players =chatroom.findOne({$and: [{"players.username" : name},{"gameid" : docs[0].currentgameid} ]}, {"players" : 1, "_id" : 0}).players;
			var result = 10; var rad = 0; var dire = 0;
			for(var i in players){
				if(players[i].username == name){result = players[i].result;}
				if(players[i].result == 1){rad +=1;}
				else if(players[i] == -1){dire +=1;}
			}
			if(result == 0){
				chatroom.update({$and: [{"players.username" : name},{"gameid" : 0} ]}, {"$set" : {"players.$.result" : -1} })
				respmessage += name + " has reported gameID " + documents[0].currentgameid + " for the dire";
				respmessage += "\n There are: " + rad + " votes for the radiant and " + dire + "votes for the dire";
				req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
			}

		}

    });
  }

  //Destroy a game if the owner
  if(message == ".destroy"){
	var respmessage = "";
	chatroom.find({status : "lobby"}, {}, function(e,docs){
		if(typeof docs[0] != "undefined"){
			if(name == docs[0].owner){
				chatroom.remove({status : "lobby"});
				respmessage += docs[0].gameid + " has been closed by " + name;
				req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
			}
		}

    });
  }

  //List all the players in the current game queue
  if(message == ".lp"){
	var respmessage = "Listing Players: ";
	chatroom.find({status : "lobby"}, {}, function(e,docs){
		if(typeof docs[0] != "undefined"){
			console.log(docs[0].players);
			for (var i in docs[0].players){
				respmessage += docs[0].players[i].username + " | ";
			}
			req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
			console.log(respmessage);
		}
	});
  }

  //Look up the stats of the messenger and display them in chat
  if(message == ".me"){
	var respmessage = "";
	chatroom.find({username: name},{},function(e,docs){
		if(e){ console.log("fuckedupquery");}
		if(!e) { console.log("something better showup");}
		respmessage += docs[0].username + " | mmr: " + docs[0].mmr + " | wins: " + docs[0].wins + " | losses: " + docs[0].losses;
		req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
    	});
  }


if(message == ".getmmr"){

	chatroom.find({gameid: 1 },function(e,doct){
		console.log(doct[0].players);
		var rgs = [];
		var mesg = "";
		doct[0].players.forEach(function(obj){
			chatroom.find({username: obj.username},function(err,dr){
				var thing = dr[0].username;
				console.log(thing);
				mesg  += thing;
				mesg += "hello";
				callBack(function(err,dr){
					rgs.push(thing);
					mesg += thing;
					console.log(thing);
				});
			});
		function callBack(){
		}
		console.log(rgs);
		console.log(mesg);
		req.io.sockets.emit("incomingMessage", {message: mesg, name: "cihl:"}  );
		});
	});
	
}

  res.json(200, {message: "Message received"});
}
