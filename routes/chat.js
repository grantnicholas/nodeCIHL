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
				chatroom.update({username: name}, {$set: {currentgameid: -1} });
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
				if(typeof documents[0] != "undefined"){
					var newgameid = docs[0].gameid + 1;
					var newgame = [{ "gameid" : newgameid, "status": "lobby", "players" : [{username : name, result : 0}], "owner" : name }]
					chatroom.insert(newgame);
					respmessage += "Signups are open for gameID: " + newgameid;
					req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
				}
				else{
					var newgameid = 0;
					var newgame = [{ "gameid" : newgameid, "status": "lobby", "players" : [{username : name, result : 0}], "owner" : name }]
					chatroom.insert(newgame);
					respmessage += "Signups are open for gameID: " + newgameid;
					req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
				}
			});
		}
		else{
			respmessage += "Only one game can be created at a time. Sign the game with .sign"; 
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


//Helper function to query the database and get an object from a username
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
	var people = [];
	async.each(arr,function(item,eachcallback){
			getObjFromName(item.username,function(obj){
				delete obj.password; delete obj.email; 
				//Want to set to 0 by default. For debugging purposes set to 1 [radiant votes]
				obj.result = 1;
				if(item.username == "KnivesChau"){obj.result = 0;}
				people.push(obj);
				eachcallback();
			});
		},
		function(err){
			for(var i=1; i<people.length; i++){
				for(var j=0; j<i; j++){
					if(people[i].mmr< people[j].mmr){
						moveStuff(people,i,j);
					}

				}
			}
			people.reverse();
			console.log(people);
			callback(people);
		}
	);

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
				sortArray(documents[0].players,function(people){
					chatroom.update({status: "lobby"},{ $set: {players : people} }, function(er,d){
						chatroom.update({status: "lobby"},{ $set: { status : "inProgress" }});
					});

					respmessage += "Signups are closed for gameID: " + documents[0].gameid;
					respmessage += "\n Radiant: " + people[0].username + " | " +people[3].username + " | " +people[5].username + " | " + people[7].username + " | " + people[9].username;
					respmessage += "\n Dire   : " + people[1].username + " | " +people[2].username + " | " +people[4].username + " | " + people[6].username + " | " + people[8].username;
					respmessage += "\n Lobby password is cihl" + documents[0].gameid;
					req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
				});
			}
		}

    });
  }

//Pass an array of players and a winning team and calculate and update the MMR of the players accordingly
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
				diff = Math.abs(diff); 
				console.log(diff); console.log('diff in mmr');
				console.log(rmmr);
				console.log(dmmr);
				var winMMR = 0; 
				var loseMMR = 0; 
				var rupmmr = 0; 
				var dupmmr = 0;

			    if(diff > 2000){
			    	winMMR = 45; 
			    	loseMMR = 5;
			    }else if(diff > 1500){
			    	winMMR = 35; 
			    	loseMMR = 15;

			    }else if(diff> 1000){
			    	winMMR = 30; 
			    	loseMMR = 20;

			    }else if(diff > 500){
			    	winMMR = 27.5; 
			    	loseMMR = 22.5;

			    }else {
			    	winMMR = 25; 
			    	loseMMR = 25;
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

  }

//Submit a win report for the radiant. Need 6 win reports to close a game. 
  if(message == ".radiant"){
	var respmessage = "";
	chatroom.find({username : name}, {}, function(e,docs){
		if(typeof docs[0] != "undefined"){
			chatroom.find({$and: [{"players.username" : name},{"gameid" : docs[0].currentgameid}, {status: "inProgress"} ]}, function(e,docz){
				if(typeof docz[0] != "undefined"){
					var players = docz[0].players;
					var result = 10; var rad = 0; var dire = 0;
					for(var i in players){
						if(players[i].username == name){result = players[i].result;}
						if(players[i].result == 1){rad +=1;}
						if(players[i].result == -1){dire +=1;}
					}
					console.log('thisistheradcount' + rad);
					if(result == 0){
						rad+=1;
						respmessage += name + " has reported gameID " + docs[0].currentgameid + " for the radiant";
						respmessage += "\n There are: " + rad + " votes for the radiant and " + dire + " votes for the dire";
						req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
						chatroom.update({$and: [{"players.username" : name},{"gameid" : docs[0].currentgameid} ]}, {"$set" : {"players.$.result" : 1} });
					}

					if(rad >5){
						var gameClosed = "Gameid: " + docs[0].currentgameid + " has been won by the radiant"
						chatroom.update({gameid : docs[0].currentgameid},{$set: {status : "closed"} });

						for(var i in radindices){
							chatroom.update({username: players[radindices[i]].username}, {$inc: {wins: 1} })
							chatroom.update({username: players[radindices[i]].username}, {$set: {currentgameid: -1} });

						}

						for(var i in direindices){
							chatroom.update({username: players[direindices[i]].username}, {$inc: {losses: 1} })
							chatroom.update({username: players[direindices[i]].username}, {$set: {currentgameid: -1} });

						}

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
				}
			});


		}

    });
  }
    
//Submit a win report for the dire. Essentially duplicates above function
  if(message == ".dire"){
	var respmessage = "";
	chatroom.find({username : name}, {}, function(e,docs){
		if(typeof docs[0] != "undefined"){
			chatroom.find({$and: [{"players.username" : name},{"gameid" : docs[0].currentgameid}, {status: "inProgress"} ]}, function(e,docz){
				if(typeof docs[0] != "undefined"){
					var players = docz[0].players;
					var result = 10; var rad = 0; var dire = 0;
					for(var i in players){
						if(players[i].username == name){result = players[i].result;}
						if(players[i].result == 1){rad +=1;}
						if(players[i].result == -1){dire +=1;}
					}
					console.log('thisistheradcount' + rad);
					if(result == 0){
						rad+=1;
						respmessage += name + " has reported gameID " + docs[0].currentgameid + " for the dire";
						respmessage += "\n There are: " + rad + " votes for the radiant and " + dire + " votes for the dire";
						req.io.sockets.emit("incomingMessage", {message: respmessage, name: "cihl:"}  );
						chatroom.update({$and: [{"players.username" : name},{"gameid" : docs[0].currentgameid} ]}, {"$set" : {"players.$.result" : 1} });
					}

					if(dire >5){
						var gameClosed = "Gameid: " + docs[0].currentgameid + " has been won by the dire"
						chatroom.update({gameid : docs[0].currentgameid},{$set: {status : "closed"} });

						for(var i in radindices){
							chatroom.update({username: players[radindices[i]].username}, {$inc: {losses: 1} })
							chatroom.update({username: players[radindices[i]].username}, {$set: {currentgameid: -1} });

						}

						for(var i in direindices){
							chatroom.update({username: players[direindices[i]].username}, {$inc: {wins: 1} })
							chatroom.update({username: players[direindices[i]].username}, {$set: {currentgameid: -1} });

						}

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
				}
			});


		}

    });
  }

  //Destroy a game if the owner is the person who typed .destroy
  if(message == ".destroy"){
	var respmessage = "";
	chatroom.find({status : "lobby"}, {}, function(e,docs){
		if(typeof docs[0] != "undefined"){
			if(name == docs[0].owner){
				for (var i in docs[0].players){
					chatroom.update({username: docs[0].players[i].username}, {$set: {currentgameid: -1} } );
				}
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

//Helper function I used to test aync functions
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

//Helper function I used to test async functions
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
