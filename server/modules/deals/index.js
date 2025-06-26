const { routes, params } = require('./deals.router');
const schemas = require('./deals.schemas');
const controller = require('./deals.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};