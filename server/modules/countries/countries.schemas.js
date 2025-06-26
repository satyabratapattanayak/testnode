const Joi = require('joi');

const schemas = {
    create: {
        headers: {},
        params: {},
        body: {
            country: Joi.string().required(),
            countryCode: Joi.string().required(),
            // type: Joi.string().required(),
        }
    },
    update: {
        headers: {},
        params: {
            countryCode: Joi.string().required()
        },
        body: {
            country: Joi.string().required(),
            countryCode: Joi.string().required(),
            type: Joi.string().required(),
        }
    },
    Delete: {
        headers: {},
        params: {
            countryCode: Joi.string().required()
        },
        body: {

        }
    },
};

module.exports = schemas;