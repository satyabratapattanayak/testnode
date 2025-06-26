const Joi = require('joi');

const schemas = {
    create: {
        headers: {},
        params: {},
        body: {
            hierarchy: Joi.number().integer().min(1).max(100),
        }
    },
    update: {
        headers: {},
        params: {},
        body: {
            hierarchy: Joi.number().integer().min(1).max(100),
        }
    },
};

module.exports = schemas;