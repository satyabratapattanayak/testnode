const { routes, params } = require('./cities.router');
const schemas = require('./cities.schemas');
const controller = require('./cities.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};