const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid-transport');
const viewEngine = require('express-handlebars');
const hbs = require('nodemailer-express-handlebars');

const config = require('./config');

const options = {
    auth: {
        api_user: config.nodemailer_key,
        api_key: config.nodemailer_secret_key
    }
};

const transporter = nodemailer.createTransport(sgTransport(options));

transporter.use('compile', hbs({
    viewEngine,
    viewPath: 'server/mail-templates',
    extName: '.hbs'
}));

module.exports = { transporter };