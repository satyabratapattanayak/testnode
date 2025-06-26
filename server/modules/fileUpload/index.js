const { routes, params } = require('./upload.router');
const schemas = require('./upload.schemas');
const controller = require('./upload.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};