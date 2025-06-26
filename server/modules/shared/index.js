const { routes, params } = require('./shared.router');
const schemas = require('./shared.schemas');
const controller = require('./shared.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};