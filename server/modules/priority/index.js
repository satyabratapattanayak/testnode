const { routes, params } = require('./priority.router');
const schemas = require('./priority.schemas');
const controller = require('./priority.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};