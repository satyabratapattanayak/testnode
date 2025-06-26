const { routes, params } = require('./expense_report.router');
const schemas = require('./expense_report.schemas');
const controller = require('./expense_report.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};