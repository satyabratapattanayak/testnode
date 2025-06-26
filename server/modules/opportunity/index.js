const { routes, params } = require('./opportunity.router');
const schemas = require('../customers/customer.schemas');
const controller = require('../customers/customer.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};