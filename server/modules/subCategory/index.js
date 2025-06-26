const { routes, params } = require('./subCategory.router');
const schemas = require('./subCategory.schemas');
const controller = require('./subCategory.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};