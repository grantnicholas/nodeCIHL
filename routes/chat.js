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
  var async = req.async;

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



var getObjFromName = function(name,callback){
	chatroom.find({username: name}, {}, function(e,docs){
		var obj = docs[0];
		callback(obj);
	});
}


var moveStuff = function(arr,remove,add){
	var tmp = arr[remove];
	for(var i=remove; i>add; i--){
		arr[i] = arr[i-1];
	}
	arr[add] = tmp;
}

var sortArray = function(arr,callback){
	/*
	for(var i=1; i<arr.length; i++){
		for(var j=0; j<i; j++){
			getObjFromName(arr[i].username, function(obji){
				getObjFromName(arr[j].username, function(objj){
					if(obji.mmr< objj.mmr){
						moveStuff(arr,i,j);
					}
				});
			});
		}
	}
	*/
	console.log("asynch sort is hard");
	callback();

}
var changeMMR = function(argz,upmmr,callback2){

	async.each(argz,function(item, callback){
			chatroom.update({username : item.username}, {$inc: {mmr : upmmr}}, function(a,b,c){;
				callback();
			});
		  },
		  // 3rd param is the function to call when everything's done
		  function(err){
		  	callback2();
		  }
	);
    
}


  //If there are 10 people in the new game, close the signups of the game, and assign the teams
  if(message == ".start"){
	var respmessage = "";
	chatroom.find({status : "lobby"}, {}, function(e,documents){
		if(typeof documents[0] != "undefined"){
			if(documents[0].owner == name && documents[0].players.length == 10){
				sortArray(documents[0].players,function(){

					chatroom.update({status: "lobby"},{ $set: { status : "inProgress" }});

					respmessage += "Signups are closed for gameID: " + documents[0].gameid;
					respmessage += "\n Radiant: " + documents[0].players[0].username + " | " +documents[0].players[3].username + " | " +documents[0].players[5].username + " | " + documents[0].players[7].username + " | " + documents[0].players[9].username;
					respmessage += "\n Dire   : " + documents[0].players[1].username + " | " +documents[0].players[2].username + " | " +documents[0].players[4].username + " | " + documents[0].players[6].username + " | " + documents[0].players[8].username;
					respmessage += "\n Lobby password is cihl" + documents[0].gameid;
					req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
				});
			}
		}

    });
  }

  var updateMMR = function(arr,win,maincallback){
  	var rmmr = 0; 
  	var dmmr = 0;
  	var direarr = []; 
  	var radarr = []; 
  	for(var i in radindices){
  		radarr.push(arr[radindices[i]]);
  	}
  	for(var i in direindices){
  		direarr.push(arr[direindices[i]]);
  	}

	async.each(radarr,function(item, callbacka){
		    getObjFromName(item.username,function(obj){
		    	rmmr += obj.mmr;
				callbacka();
		    });
		  },
		  // 3rd param is the function to call when everything's done
		  function(err){
		  	async.each(direarr,function(item, callbackb){
		    	getObjFromName(item.username,function(obj){
		    		dmmr += obj.mmr;
					callbackb();
		    	});
		  	},
		  	// 3rd param is the function to call when everything's done
		  	function(err){
				var diff = rmmr - dmmr; 
				var diffit = Math.abs(diff); 
				console.log(diffit); console.log('diff in mmr');
				console.log(rmmr);
				console.log(dmmr);
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
			    console.log('hello');
			    console.log(radarr);
			    console.log(direarr);
			    console.log(rupmmr);
			    console.log(dupmmr);

			    changeMMR(radarr,rupmmr,function(){
			    	changeMMR(direarr,dupmmr,function(){
			    		console.log('done');
			    		maincallback();
			    	});
			    });


		  	}
		    );

		  }
	);

	/*
	async.each(direarr,function(item, callback){
		    getObjFromName(item.username,function(obj){
		    	dmmr += obj.mmr;
				callback();
		    });
		  },
		  // 3rd param is the function to call when everything's done
		  function(err){
		  	console.log(dmmr);
		  }
	);
    
	var diff = rmmr - dmmr; 
	var changeMMR = Math.abs(diff); 
	console.log(changeMMR); console.log('diff in mmr');
	console.log(rmmr);
	console.log(dmmr);
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
    console.log('hello');
    console.log(radarr);
    console.log(rupmmr);

    changeMMR(radarr,rupmmr,function(){
    	changeMMR(direarr,dupmmr,function(){
    		callback();
    	});
    });
    */

  }

  if(message == ".radiant"){
	var respmessage = "";
	chatroom.find({username : name}, {}, function(e,docs){
		if(typeof docs[0] != "undefined"){
			chatroom.find({$and: [{"players.username" : name},{"gameid" : docs[0].currentgameid} ]}, function(e,docz){
				var players = docz[0].players;
				var result = 10; var rad = 0; var dire = 0;
				for(var i in players){
					if(players[i].username == name){result = players[i].result;}
					if(players[i].result == 1){rad +=1;}
					else if(players[i].result == -1){dire +=1;}
				}
				if(result == 0){
					rad+=1;
					respmessage += name + " has reported gameID " + docs[0].currentgameid + " for the dire";
					respmessage += "\n There are: " + rad + " votes for the radiant and " + dire + " votes for the dire";
					req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
					chatroom.update({$and: [{"players.username" : name},{"gameid" : docs[0].currentgameid} ]}, {"$set" : {"players.$.result" : 1} });
				}
				if(rad >5){
					var gameClosed = "Gameid: " + docs[0].currentgameid + " has been won by the radiant"
					chatroom.update({gameid : docs[0].currentgameid},{$set: {lobby : "closed"} });
					req.io.sockets.emit("incomingMessage", {message: gameClosed, name: "cihl:"});
					var mmr = [];
					updateMMR(players,'rad',function(){
						async.each(players,function(item, callback){
								getObjFromName(item.username,function(obj){
									mmr.push(obj);
									callback();
								});
					  		},
					  	// 3rd param is the function to call when everything's done
					  		function(err){
					  			console.log(mmr);
					  			var updatedMMR = "Updated ratings are: \n";
								for(var i in mmr){
									updatedMMR += mmr[i].username + " : " + mmr[i].mmr + " | ";
					  			}
					  			req.io.sockets.emit("incomingMessage", {message: updatedMMR, name: "cihl:"});
					  		}
						);

					});

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
		var players = doct[0].players;
		var rgz = [];
		async.each(players,function(item, callback){
		    chatroom.find({username: item.username},{},function(e,doctz){
		    	rgz.push(doctz[0]);
				callback();
		    });
		  },
		  // 3rd param is the function to call when everything's done
		  function(err){
		  	console.log(rgz);
		  }
		);
	});

	getObjFromName("KnivesChau", function(theuser){
		console.log(theuser.username);
		console.log(theuser.mmr);
	});
	
  }

  if(message == ".changemmr"){

  	chatroom.find({gameid: 1 },function(e,doct){
		var players = doct[0].players;
		var rgz = [];
		var rupmmr = 5; var dupmmr = -20;
		var direarr = []; 
	  	var radarr = []; 

	  	var counter = 0;
		async.each(players,function(item, callback){
		    chatroom.find({username: item.username},{},function(e,doctz){
		    	rgz.push(doctz[0]);
		    	radarr.push(doctz[0]);
				direarr.push(doctz[0]);
				callback();
		    });
		  },
		  // 3rd param is the function to call when everything's done
		  function(err){
		  	console.log('r');
			console.log(radarr);
			console.log('d');
		  	changeMMR(radarr,rupmmr,function(){
				changeMMR(direarr,dupmmr,function(){
					console.log('done');
    			});
    		});
		  }
		);
	});

  }

  res.json(200, {message: "Message received"});
}
