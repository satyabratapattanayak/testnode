const { routes, params } = require('./customer.router');
const schemas = require('./customer.schemas');
const controller = require('./customer.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};