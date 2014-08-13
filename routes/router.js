var express = require('express');
var router = express.Router();

var homeController = require('../routes/home');
var userController = require('../routes/user');

router.get('/', homeController.index);
router.get('/login', userController.getLogin);
router.post('/login', userController.postLogin);

module.exports = router;