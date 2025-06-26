const { routes, params } = require('./industry.router');
const schemas = require('./industry.schemas');
const controller = require('./industry.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};