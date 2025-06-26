const Joi = require('joi');

const schemas = {
    forgotPassword: {
        headers: {},
        params: {},
        body: {
            // email: Joi.string().required(),
            email: Joi.string().email({ minDomainSegments: 2 }).required()
        }
    },
    resetPassword: {
        headers: {},
        params: {},
        body: {
            password: Joi.string().required(),
        }
    },

};

module.exports = schemas;