const { routes, params } = require('./formio.router');
const schemas = require('./formio.schemas');
const controller = require('./formio.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};