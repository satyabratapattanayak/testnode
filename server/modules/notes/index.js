const { routes, params } = require('./notes.router');
const schemas = require('./notes.schemas');
const controller = require('./notes.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};