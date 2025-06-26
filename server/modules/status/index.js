const { routes, params } = require('./status.router');
const schemas = require('./status.schemas');
const controller = require('./status.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};