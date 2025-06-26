const { routes, params } = require('./region.router');
const schemas = require('./region.schemas');
const controller = require('./region.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};