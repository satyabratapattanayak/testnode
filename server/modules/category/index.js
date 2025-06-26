const { routes, params } = require('./category.router');
const schemas = require('./category.schemas');
const controller = require('./category.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};