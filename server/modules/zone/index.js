const { routes, params } = require('./zone.router');
const schemas = require('./zone.schemas');
const controller = require('./zone.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};