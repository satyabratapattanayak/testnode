const { routes, params } = require('./audit.router');
const schemas = require('./audit.schemas');
const controller = require('./audit.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};