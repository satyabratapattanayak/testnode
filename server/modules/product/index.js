const { routes, params } = require('./product.router');
const schemas = require('./product.schemas');
const controller = require('./product.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};