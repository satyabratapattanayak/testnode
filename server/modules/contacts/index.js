const { routes, params } = require('./contacts.router');
const schemas = require('./contacts.schemas');
const controller = require('./contacts.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};