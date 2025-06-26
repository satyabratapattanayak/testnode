const { routes, params } = require('./area.router');
const schemas = require('./area.schemas');
const controller = require('./area.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};