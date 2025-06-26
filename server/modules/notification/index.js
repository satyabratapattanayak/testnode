const { routes, params } = require('./notification.router');
const schemas = require('./notification.schemas');
const controller = require('./notification.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};