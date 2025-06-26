const { routes, params } = require('./konspecCode.router');
const schemas = require('./konspecCode.schemas');
const controller = require('./konspecCode.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};