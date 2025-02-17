const express = require('express');
const { createUser, verify_user, resendOtp,fine_me, login, findAllOrders } = require('../../user_controller/user.register.controller');
const Protect = require('../../middleware/Auth');

const users = express.Router();

users.post('/register', createUser)
users.post('/verify-user', verify_user)
users.post('/resend-otp', resendOtp)
users.post('/login', login)
users.get('/find_me',Protect, fine_me)
users.get('/find-Orders-details',Protect, findAllOrders)

// router.get('/find-Orders-details', Protect, findAllOrders);


module.exports = users;
