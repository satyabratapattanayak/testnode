module.exports = {
    /**
     * Application configuration section
     * http://pm2.keymetrics.io/docs/usage/application-declaration/
     */
    apps: [
        // First application
        {
            name: 'crm_dev_backend',
            script: './main.js',
            env: {
                'COMMON_VARIABLE': 'true',
                'JWT_SECRET': '12345678',
                'SEND_MAIL_USER_KEY': 'ashraf.seventech',
                'SEND_MAIL_SECRET_KEY': 'ashraf123',
                'PRODUCTION': false,
                'HOST': '43.254.162.114',
                'DB_IP': '159.65.148.28',
                'PRIVATE_DB_IP': '10.139.128.212',
                'PORT': 5000,
                'DB_NAME': 'sevenCRM',
                'CONNECTION_STRING': 'mongodb://sevencrm2:sevencrm13579@159.65.148.28:27017/sevenCRM',
                'FILE_UPLOAD_PATH': '/var/lib/jenkins/workspace/crm_backend/uploads/',
                'NOTIFICATION_ENABLE': false,
            },
            env_production: {
                NODE_ENV: 'production'
            }
        }
    ]
};