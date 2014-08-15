exports.getLogin = function(req, res) {
	res.render('login', {
		title: 'Login'
	});
};

exports.postLogin = function(req, res) {
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

}
