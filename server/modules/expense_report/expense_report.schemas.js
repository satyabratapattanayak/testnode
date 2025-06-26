const Joi = require('joi');

const schemas = {
    create: {
        headers: {},
        params: {},
        body: {
            customer: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        }
    },
    details: {
        params: {
            id: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        }
    },
    update: {
        headers: {},
        params: {
            id: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        },
        body: {
            customer: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        }
    },
};

module.exports = schemas;