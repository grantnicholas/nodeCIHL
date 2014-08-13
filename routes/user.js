exports.getLogin = function(req, res) {
	res.render('login', {
		title: 'Login'
	});
};

exports.postLogin = function(req, res) {
	return;
}