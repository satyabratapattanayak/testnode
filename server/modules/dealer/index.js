const { routes, params } = require('./dealer.router');
const schemas = require('./dealer.schemas');
const controller = require('./dealer.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};