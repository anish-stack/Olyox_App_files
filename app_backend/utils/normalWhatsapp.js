const axios = require('axios');
require('dotenv').config();

const SendWhatsAppMessageNormal = async (Message, MobileNumber) => {
    try {
        console.log('Starting SendWhatsAppMessage function...');
        console.log(`Input Message: ${Message}`);
        console.log(`Input MobileNumber: ${MobileNumber}`);
     
        if (!Message || !MobileNumber) {
            console.log('Validation failed: Missing message or mobile number.');
            return {
                success: false,
                message: 'Message and mobile number are required.',
            };
        }

        const isValidNumber = /^(?:\+91|91)?[6-9]\d{9}$/.test(MobileNumber);
        if (!isValidNumber) {
            console.log(`Validation failed: Invalid mobile number - ${MobileNumber}`);
            return {
                success: false,
                message: `Invalid mobile number: ${MobileNumber}`,
            };
        }

        const apiKey = process.env.WHATSAPP_API_KEY || '968791cad69d4ec0a97639f33c19ce68';
        if (!apiKey) {
            console.log('Missing WhatsApp API key.');
            return {
                success: false,
                message: 'Missing WhatsApp API key.',
            };
        }

        console.log('Sending WhatsApp message...');
        const waResponse = await axios.get('https://api.wtap.sms4power.com/wapp/v2/api/send', {
            params: {
                apikey: apiKey,
                mobile: MobileNumber,
                msg: Message,
            },
        });

        // Log the full response for better insight, including status, data, or errors
        console.log('WhatsApp API response received:', waResponse.status);
        console.log('Response data:', waResponse.data);

        if (waResponse.status === 200) {
            return {
                success: true,
                message: 'WhatsApp message sent successfully!',
            };
        } else {
            console.log('Failed to send WhatsApp message, API response:', waResponse.data);
            return {
                success: false,
                message: 'Failed to send WhatsApp message.',
            };
        }

    } catch (error) {
        console.error('Error sending WhatsApp message:', error.message || error);
        return {
            success: false,
            message: 'An error occurred while sending the WhatsApp message.',
        };
    }
};

module.exports = SendWhatsAppMessageNormal;
