var express = require('express');
var router = express.Router();

router.post('/showresults', function(req,res){
	console.log(req.body.username);
	console.log(req.body.password);
	res.render('showresults', {username : req.body.username, password : req.body.password});
});

module.exports = router;
