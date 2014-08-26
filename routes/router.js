var express = require('express');
var router = express.Router();

var homeController = require('../routes/home');
var userController = require('../routes/user');
var chatController = require('../routes/chat');

// router.get('/', homeController.index);
router.get('/', function(req, res) {
	console.log("function called");
	res.redirect('/login');
})
router.get('/login', userController.getLogin);
router.post('/login', userController.postLogin);
router.post('/login', userController.postRegister);
//router.get('/validate', userController.getValidateRegister)
router.post('/chat', chatController.postMessage);

module.exports = router;
