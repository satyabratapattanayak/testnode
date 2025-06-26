const Joi = require('joi');

const schemas = {
    details: {
        params: {
            id: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        }
    },
    create: {
        headers: {},
        params: {},
        body: {
            state: Joi.string().required(),
            stateCode: Joi.string().required(),
            country: Joi.string().required(),
            // city: Joi.array().items(Joi.string().required()),
        }
    },
    update: {
        headers: {},
        params: {
            stateCode: Joi.string().required()
        },
        body: {
            state: Joi.string().required(),
            stateCode: Joi.string().required(),
            country: Joi.string().required(),
            // city: Joi.array().items(Joi.string().required()),
        }
    },
    Delete: {
        headers: {},
        params: {
            stateCode: Joi.string().required()
        },
        body: {

        }
    },
};

module.exports = schemas;