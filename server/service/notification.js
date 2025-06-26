const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
const serviceAccount = require('../config/firebase-adminsdk.json');
const { notificationEmail, notificationPush, SENDGRID_KEY } = require('../config/config');

let flag = true;
let flagPush = true

const NotificationService = {
    init: () => {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: 'https://seven-crm.firebaseio.com'
        });
        sgMail.setApiKey(SENDGRID_KEY);
    },
    sendMessage: (registrationToken, message) => {
        console.log('sendPush:: ', notificationPush, ' :: ');

        if (notificationPush) {
            console.log('PUSH notification ENABLED');
            return admin.messaging().sendToDevice(registrationToken, message);
        } else {
            console.log('PUSH notification DISABLED');
            return Promise.resolve([{ headers: { 'x-message-id': 'disabled' } }]);
            // return admin.messaging().sendToDevice(registrationToken, message);
        }
    },
    sendEmail: (message) => {
        console.log('sendEmail:: ', notificationEmail);

        if (notificationEmail) {
            console.log('EMAIL notification ENABLED');
            return sgMail.send(message);
        } else {
            console.log('EMAIL notification DISABLED');
             return Promise.resolve([{ headers: { 'x-message-id': 'disabled' } }]);

            // if (flag) {
            //     //  flag = false
            //     message.to = [{ name: 'Ravi DS', email: 'ravi@seventech.co' }]
            //     console.log('EMASIL SENT TO: ', message);

            //     return sgMail.send(message);
            // }
        }
    }
};
module.exports = NotificationService;