exports.getForgotPass = function(req, res) {
	if (req.session.user) {
		return res.redirect('/chat');
	}
	res.render('forgotpass', {
	success: 0,
	status: "Enter your email to reset your password"
	});
};

exports.postForgotPass = function(req, res) {

	if (req.session.user) {
		return res.redirect('/chat');
	}
	var chatroom = req.db.get('newchatroom');
	var em = req.body.email;
	var generatePassword = req.generatePassword;
	var newpass =generatePassword();
	console.log(newpass);

	chatroom.findOne({email : em}, function(e,doc){
		if(!doc){ 
			res.render('forgotpass', {status: 'Invalid email address: ', success: false});
		}
		else{
			var hashedPassword = req.passwordHash.generate(newpass);
			chatroom.update({_id : doc._id}, {$set: {password : hashedPassword}  });
			var transporter = req.transporter;
			var mailOptions = {
			    from: 'CIHL Robot ✔ <cihl.robot@gmail.com>', // sender address
			    to: ''+em                                    ,  //email address
			    subject: 'CIHL Account Registration Complete ', // Subject line
			    text: 'Your new password for the account ' + doc.username + ' is:\n '+ newpass , // plaintext body
			    html: 'Your new password for the account ' + doc.username + ' is:\n '+ newpass // html body
			};

			transporter.sendMail(mailOptions, function(error, info){
			    if(error){
			        console.log(error);
			    }else{
			        console.log('Message sent: ' + info.response);
			    }
			});

			//res.redirect('login')
			res.location('login');
			res.render('login', {title: 'login', status: 'Password is reset: check email for new password', success: true});
		}
	

	});

};