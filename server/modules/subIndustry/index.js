const { routes, params } = require('./subIndustry.router');
const schemas = require('./subIndustry.schemas');
const controller = require('./subIndustry.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};