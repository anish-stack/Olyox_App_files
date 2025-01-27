const express = require('express');
const multer = require('multer');
const { register_restaurant, register_restaurant_fake,add_food_listing } = require('../../Tiffins/Create_Restaurant');
const { find_Restaurant, find_Restaurant_foods ,find_Restaurant_And_Her_foods } = require('../../Tiffins/Get_resturant');

const tiffin = express.Router();

// Multer setup
const storage = multer.memoryStorage()

const upload = multer({ storage: storage });

// Tiffin routes
tiffin.post('/register_restaurant',upload.single('logo'),register_restaurant)
tiffin.get('/fake_register_restaurant',register_restaurant_fake)
tiffin.post('/register_listing',add_food_listing)


// get tiffins
tiffin.get('/get_restaurant',find_Restaurant)
tiffin.get('/find_Restaurant_foods',find_Restaurant_foods)
tiffin.get('/find_Restaurant_And_Her_foods',find_Restaurant_And_Her_foods)



module.exports = tiffin;