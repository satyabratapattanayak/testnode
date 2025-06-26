const { routes, params } = require('./users.router');
const schemas = require('./users.schemas');
const controller = require('./users.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};