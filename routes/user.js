exports.getLogin = function(req, res) {
	if (req.session.user) {
		return res.redirect('/chat');
	}
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
			req.session.un = un;
			req.session.user = docs[0];
			res.redirect('/chat');			
		}
	}); 
};

exports.logout = function(req, res) {
	req.session = null;
	res.redirect('/');
}

exports.getRegister = function(req, res) {
	if (req.session.user) {
		return res.redirect('/chat');
	}
	res.render('register', {
		title: 'Create Accout'
	});
};

exports.postRegister = function(req, res) {
	if (req.session.user) {
		return res.redirect('/chat');
	}
	res.render('register', {
		title: 'Create Account'
	});
};

