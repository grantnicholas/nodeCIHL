var express = require('express');
var router = express.Router();

var homeController = require('../routes/home');
var userController = require('../routes/user');
var chatController = require('../routes/chat');

router.get('/', homeController.index);
router.get('/login', userController.getLogin);
router.post('/login', userController.postLogin);
router.get('/chat', userController.getLogin);
router.post('/chat', userController.postLogin);

module.exports = router;