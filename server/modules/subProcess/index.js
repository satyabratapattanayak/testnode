const { routes, params } = require('./subProcess.router');
const schemas = require('./subProcess.schemas');
const controller = require('./subProcess.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};