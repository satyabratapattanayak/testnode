const { routes, params } = require('./video.router');
const schemas = require('./video.schemas');
const controller = require('./video.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};