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
	var chatroom = db.get('newchatroom');
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
		title: 'Create Account'
	});
};

exports.postRegister = function(req, res) {
	if (req.session.user) {
		return res.redirect('/chat');
	}

	var un = req.body.username;
	var pass = req.body.password;
	var em = req.body.email;
	var dbuff = req.body.dotabuff;

	var chatroom = req.db.get('newchatroom');
	chatroom.find({username : un}, {}, function(e,docs){
		if(docs[0]){ 
			res.render('login', {title: 'login', status: 'Username in use: try another username', success: false}); 
		}
		else {
			chatroom.find({email: em }, {}, function(e,docs){
				if(docs[0]){
					res.render('login', {title: 'login', status: 'Email in use: try another email', success: false})
				}			
				else{
					var newuser = newusers = [{ "username" : un, "password" : pass, "currentgameid" : 0,  "mmr" : 3000, "wins" : 0, "losses" : 0, "email" : em, "loggedin" : 0, "dotabuff" : dbuff }];
					chatroom.insert(newuser);

					//send email. Password sent in plaintext = bad bad bad;
					var transporter = req.transporter;
					var mailOptions = {
					    from: 'Grant Nicholas ✔ <grantnicholas2015@u.northwestern.edu>', // sender address
					    to: ''+em+', grantnicholas2015@u.northwestern.edu', // list of receivers //kevinchen@u.northwestern.edu 
					    subject: 'CIHL Account Registration Complete ', // Subject line
					    text: 'The account:\n '+ un + ' has been created with password:\n '+ pass +'. ', // plaintext body
					    html: 'The account:\n '+ un + ' has been created with password:\n '+ pass +'. ' // html body
					};

					transporter.sendMail(mailOptions, function(error, info){
					    if(error){
					        console.log(error);
					    }else{
					        console.log('Message sent: ' + info.response);
					    }
					});

					res.render('login', {title: 'login', status: 'Your account has been successfully created', success: true});
				}
			}); 
		}

	});
};

/*
Want to do validation with AJAX so that it does not require a page reload to catch errors; todo
exports.getValidateRegister = function(req,res){
	chatroom.find({username : un}, {}, function(e,docs){
		if(docs[0]){ 
			res.send("Username already exists: try another"); 
		}
		else {
			chatroom.find({email: })
			req.session.un = un;
			req.session.user = docs[0];
			res.redirect('/chat');			
		}
	}); 

};
*/
