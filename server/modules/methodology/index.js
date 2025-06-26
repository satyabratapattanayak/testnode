const { routes, params } = require('./methodology.router');
const schemas = require('./methodology.schemas');
const controller = require('./methodology.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};