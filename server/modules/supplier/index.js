const { routes, params } = require('./supplier.router');
const schemas = require('./supplier.schemas');
const controller = require('./supplier.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};