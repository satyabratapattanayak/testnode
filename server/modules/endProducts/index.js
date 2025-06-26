const { routes, params } = require('./endProduct.router');
const schemas = require('./endProduct.schemas');
const controller = require('./endProduct.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};