
const placeholderImage = "https://media.istockphoto.com/id/104731717/photo/luxury-resort.jpg?s=612x612&w=0&k=20&c=cODMSPbYyrn1FHake1xYz9M8r15iOfGz9Aosy9Db7mI=";

const HotelData = [
    {
        id: 1,
        name: "Hotel Sunshine",
        location: "New York, USA",
        price: 150,
        stars: 4,
        images: {
            main: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS5zUtFpwsa9xtdfNBO25J83NrVaWnPpeUjPA&s",
            others: [placeholderImage, placeholderImage, placeholderImage]
        },
        review: "Great location and friendly staff. Rooms were clean and comfortable."
    },
    {
        id: 2,
        name: "Ocean View Resort",
        location: "Miami, USA",
        price: 200,
        stars: 5,
        images: {
            main: "https://blupp.b-cdn.net/eroshotel/d6b22751-c200-4420-8829-c60d98dc40dd/hotel-lobby.jpeg?quality=80&width=400",
            others: [placeholderImage, placeholderImage, placeholderImage]
        },
        review: "Amazing ocean views and excellent service. Highly recommend!"
    },
    {
        id: 3,
        name: "Mountain Retreat",
        location: "Denver, USA",
        price: 180,
        stars: 4,
        images: {
            main: "https://www.salamanderdc.com/images/hero/full/LivingRoomReimagined-1920x1200.jpg",
            others: [placeholderImage, placeholderImage, placeholderImage]
        },
        review: "Beautiful scenery and peaceful atmosphere. Perfect for a getaway."
    },
    {
        id: 4,
        name: "City Lights Hotel",
        location: "Los Angeles, USA",
        price: 220,
        stars: 5,
        images: {
            main: "https://www.gingerhotels.com/resourcefiles/hotelprofile/new-fff.jpg?version=1062025103241",
            others: [placeholderImage, placeholderImage, placeholderImage]
        },
        review: "Luxurious rooms and top-notch amenities. Great for business trips."
    },
    {
        id: 5,
        name: "Desert Oasis",
        location: "Phoenix, USA",
        price: 130,
        stars: 3,
        images: {
            main: "https://w-hotels.marriott.com/wp-content/uploads/2024/03/W_HOTELS_mobile-hero-v3-unionsq.jpg",
            others: [placeholderImage, placeholderImage, placeholderImage]
        },
        review: "Affordable and comfortable. Convenient location for exploring the city."
    },
    {
        id: 6,
        name: "Lakeside Inn",
        location: "Chicago, USA",
        price: 160,
        stars: 4,
        images: {
            main: "https://images.wsj.net/im-65599456?size=1.5",
            others: [placeholderImage, placeholderImage, placeholderImage]
        },
        review: "Charming hotel with beautiful lake views. Friendly and helpful staff."
    },
    {
        id: 7,
        name: "Urban Escape",
        location: "San Francisco, USA",
        price: 210,
        stars: 5,
        images: {
            main: "https://img.freepik.com/free-photo/luxury-classic-modern-bedroom-suite-hotel_105762-1787.jpg?semt=ais_hybrid",
            others: [placeholderImage, placeholderImage, placeholderImage]
        },
        review: "Modern and stylish. Great location for exploring the city."
    },
    {
        id: 8,
        name: "Cozy Cottage",
        location: "Nashville, USA",
        price: 140,
        stars: 3,
        images: {
            main: "https://media.istockphoto.com/id/1050564510/photo/3d-rendering-beautiful-luxury-bedroom-suite-in-hotel-with-tv.jpg?s=612x612&w=0&k=20&c=ZYEso7dgPl889aYddhY2Fj3GOyuwqliHkbbT8pjl_iM=",
            others: [placeholderImage, placeholderImage, placeholderImage]
        },
        review: "Quaint and cozy. Perfect for a relaxing stay."
    },

];

module.exports = HotelData;