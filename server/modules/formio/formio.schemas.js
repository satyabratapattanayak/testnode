const Joi = require('joi');

const schemas = {
    create: {
        headers: {},
        params: {},
        body: {
            industry: Joi.string().required(),
            endApplication: Joi.string().required(),
            formioCode: Joi.string().required(),
            type: Joi.string().required(),
        }
    },
    update: {
        headers: {},
        body: {
            industry: Joi.string().required(),
            endApplication: Joi.string().required(),
            formioCode: Joi.string().required(),
            type: Joi.string().required(),
        }
    },
    Delete: {
        headers: {},
        params: {
            formioCode: Joi.string().required()
        },
        body: {

        }
    },
};

module.exports = schemas;