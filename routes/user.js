exports.getLogin = function(req, res) {
	if (req.session.user) {
		return res.redirect('/chat');
	}
	res.render('login', {
	title: 'Login',
	success: 0,
	status: "Please login to enter the chatroom"
	});
};


exports.postLogin = function(req, res) {
	var un = req.body.username
	var pass = req.body.password;
	var chatroom = req.db.get('newchatroom');

	chatroom.findOne({username : un}, function(e,doc){
		if(!doc){ 
			res.render('login', {title: 'login', status: 'Invalid username: ', success: false});
		}
		else {
			if(req.passwordHash.verify(pass, doc.password) ){
				req.session.un = un;
				req.session.user = doc;
				res.redirect('/chat');	
			}		
			else{
				res.render('login', {title: 'login', status: 'Invalid password: ', success: false});;
			}
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
					var hashedPassword = req.passwordHash.generate(pass);
					var newuser = newusers = [{ "username" : un, "password" : hashedPassword, "currentgameid" : 0,  "mmr" : 3000, "wins" : 0, "losses" : 0, "email" : em, "loggedin" : 0, "dotabuff" : dbuff }];
					chatroom.insert(newuser);

					var transporter = req.transporter;
					var mailOptions = {
					    from: 'CIHL Robot ✔ <cihl.robot@gmail.com>', // sender address
					    to: ''+em                                  , // list of receivers 
					    subject: 'CIHL Account Registration Complete ', // Subject line
					    text: 'The account:\n '+ un + ' has been created. ', // plaintext body
					    html: 'The account:\n '+ un + ' has been created ' // html body
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
