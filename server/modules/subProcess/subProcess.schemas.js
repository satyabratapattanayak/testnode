const Joi = require('joi');

const schemas = {
    Details: {
        headers: {},
        params: {
            id: Joi.string().required(),
        },
        body: {}
    },
    update: {
        headers: {},
        params: {
            id: Joi.string().required(),
        },
        body: {}
    },
};

module.exports = schemas;