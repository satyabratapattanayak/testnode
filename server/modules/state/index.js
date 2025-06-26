const { routes, params } = require('./state.router');
const schemas = require('./state.schemas');
const controller = require('./state.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};