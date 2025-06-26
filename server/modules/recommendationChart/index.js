const { routes, params } = require('./recemmondationChart.router');
const schemas = require('./recemmondationChart.schemas');
const controller = require('./recemmondationChart.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};