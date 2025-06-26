const { routes, params } = require('./countries.router');
const schemas = require('./countries.schemas');
const controller = require('./countries.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};