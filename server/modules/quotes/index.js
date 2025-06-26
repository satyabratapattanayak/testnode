const { routes, params } = require('./quotes.router');
const schemas = require('./quotes.schemas');
const controller = require('./quotes.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};