const Joi = require('joi');

const schemas = {
    create: {
        headers: {},
        params: {},
        body: {}
    },
    update: {
        headers: {},
        params: {
            id: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        },
        body: {}
    },
    Details: {
        headers: {},
        params: {
            id: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        },
        body: {}
    },
    Delete: {
        headers: {},
        params: {
            id: Joi.string().required(),
        },
        body: {}
    },
};

module.exports = schemas;