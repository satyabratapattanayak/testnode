const { routes, params } = require('./lead.router');
const schemas = require('./lead.schemas');
const controller = require('./lead.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};