const { routes, params } = require('./group.router');
const schemas = require('./group.schemas');
const controller = require('./group.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};