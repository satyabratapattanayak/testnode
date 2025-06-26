const { routes, params } = require('./import.router');
const schemas = require('./import.schemas');
const controller = require('./import.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};