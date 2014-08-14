exports.index = function(req, res) {
	console.log("index requested")
	res.redirect('/login');
}