exports.getLogin = function(req, res) {
	console.log("getLogin called.")
	res.render('login', {
		title: 'Login'
	});
};

exports.postLogin = function(req, res) {
	return;
}