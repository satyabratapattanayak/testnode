const { routes, params } = require('./auth.router');
const schemas = require('./auth.schemas');
const controller = require('./auth.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};