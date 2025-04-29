const cron = require('node-cron');
const Riders = require('../models/Rider.model');
const moment = require('moment');
const SendWhatsAppMessage = require('../utils/whatsapp_send');

const startExpiryCheckJob = () => {
    cron.schedule('*/10 * * * * *', async () => {
        console.log('🔄 [CRON] Running every 10 seconds -', new Date().toLocaleString());

        try {
            const today = moment().startOf('day');
            console.log('📅 [INFO] Today:', today.format('YYYY-MM-DD'));

            const paidRiders = await Riders.find({ isPaid: true });

            console.log(`👀 [INFO] Found ${paidRiders.length} paid riders.`);

            for (const rider of paidRiders) {
                const riderName = rider?.name || 'Unknown';
                const expireDate = moment(rider?.RechargeData?.expireData).startOf('day');

                console.log(`➡️ Checking rider: ${riderName}`);
                console.log(`📆 Expire Date: ${expireDate.format('YYYY-MM-DD')}`);

                if (expireDate.isSameOrBefore(today)) {
                    console.log(`⚠️ [MATCH] Rider ${riderName} plan expires today.`);

                    // Update rider status
                    rider.isPaid = false;
                    rider.isAvailable = false;
                    await rider.save();

                    // Send WhatsApp notification
                    const message = `👋 Hello ${riderName},\n\nYour membership plan has expired today.\nPlease recharge to continue enjoying our services.\n\nThanks,\nTeam`;

                    const contactNumber = rider?.number || rider?.phone || rider?.contact || 'N/A';
                    console.log(`📱 Sending WhatsApp to: ${contactNumber}`);
                    await SendWhatsAppMessage(message, contactNumber);

                    console.log(`✅ [DONE] Rider "${riderName}" marked as unpaid and unavailable. Notification sent.`);
                } else {
                    console.log(`✅ [SKIP] Rider ${riderName} plan is still valid.`);
                }
            }

        } catch (error) {
            console.error('❌ [ERROR] Cron job error:', error.message);
        }

        console.log('-----------------------------');
    });
};

module.exports = startExpiryCheckJob;
