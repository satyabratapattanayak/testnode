const { routes, params } = require('./schedule.router');
const schemas = require('./schedule.schemas');
const controller = require('./schedule.controller');

module.exports = {
    params,
    routes,
    schemas,
    controller,
};
