const { routes, params } = require('./venues.router');
const schemas = require('./venues.schemas');
const controller = require('./venues.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};