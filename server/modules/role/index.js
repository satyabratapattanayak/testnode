const { routes, params } = require('./role.router');
const schemas = require('./role.schemas');
const controller = require('./role.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};