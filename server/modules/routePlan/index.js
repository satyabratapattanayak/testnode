const { routes, params } = require('./routePlan.router');
const schemas = require('./routePlan.schemas');
const controller = require('./routePlan.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};