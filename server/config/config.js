
const { development, production, konspecDev, local } = require('../config/dbEnv.json');

const config = {
    production: (process.env.PRODUCTION === 'true'),
    ipAdds: process.env.HOST,
    origin: process.env.ORIGIN,
    host: process.env.HOST,
    PORT: process.env.PORT,
    mongoDBurl: process.env.CONNECTION_STRING,
    db_name: process.env.DB_NAME,
    fileUploadPath: process.env.FILE_UPLOAD_PATH,
    imageURL: `https://${process.env.HOST}/api/file/get?fileId=`,
    placeholder_image: 'https://via.placeholder.com/150',
    jwtSecretKey: '123456789',
    jwtTokenExpireTime: '24h', // '168h', 1 week // '43800h' 5 year
    jwtTokenExpireTimeForMobile: '12h', // '24h', // '168h', 1 week // '43800h' 5 year
    notification_Enabled: (process.env.NOTIFICATION_ENABLE === 'true'),
    notificationEmail: (process.env.NOTIFICATION_EMAIL === 'true'),
    notificationPush: (process.env.NOTIFICATION_PUSH === 'true'),
    notificationFromAdds: process.env.NOTIFICATION_FROM_ADDS,
    notificationFromAddsName: process.env.NOTIFICATION_FROM_ADDS_NAME,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    SENDGRID_KEY: process.env.SENDGRID_API_KEY,
    timeZone: process.env.TIME_ZONE,
    client: process.env.client,
    overStayedDays: {
        s1: [4, 8, 13],
        s2: [8, 12, 17],
        s3: [16, 20, 25],
        s4: [16, 20, 25],
        s5: [16, 20, 25],
        s6: [16, 20, 25],
        s7: [31, 35, 40],
        s8: [31, 35, 40]
    }
};




module.exports = config;
