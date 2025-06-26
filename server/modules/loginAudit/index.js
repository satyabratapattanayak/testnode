const { routes, params } = require('./loginAudit.router');
const schemas = require('./loginAudit.schemas');
const controller = require('./loginAudit.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};