const { routes, params } = require('./venue_areas.router');
const schemas = require('./venue_areas.schemas');
const controller = require('./venue_areas.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};