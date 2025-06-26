const { routes, params } = require('./process.router');
const schemas = require('./process.schemas');
const controller = require('./process.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};