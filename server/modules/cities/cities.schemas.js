const Joi = require('joi');

const schemas = {
    create: {
        headers: {},
        params: {},
        body: {
            city: Joi.string().required(),
            state: Joi.string().required(),
            // postCode: Joi.array().items(Joi.string().required()),
        }
    },
    update: {
        headers: {},
        params: {
            id: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        },
        body: {
            city: Joi.string().required(),
            state: Joi.string().required(),
            // postCode: Joi.array().items(Joi.string().required()),
        }
    },
    Delete: {
        headers: {},
        params: {
            // id: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        },
        body: {

        }
    },
};

module.exports = schemas;