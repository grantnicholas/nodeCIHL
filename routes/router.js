var express = require('express');
var router = express.Router();

var homeController = require('../routes/home');
var userController = require('../routes/user');
var forgotpassController = require('../routes/forgotpass');
var chatController = require('../routes/chat');

router.get('/', function(req, res) {
	res.redirect('/login');
})
router.get('/login', userController.getLogin);
router.post('/login', userController.postLogin);
router.post('/login', userController.postRegister);
router.post('/chat', chatController.postMessage);
router.get('/chat', chatController.getChatroom);
router.get('/forgotpass', forgotpassController.getForgotPass);
router.post('/forgotpass', forgotpassController.postForgotPass);

module.exports = router;
