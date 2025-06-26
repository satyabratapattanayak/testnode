const { routes, params } = require('./widget.router');
const schemas = require('./widget.schemas');
const controller = require('./widget.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};