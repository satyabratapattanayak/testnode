const Joi = require('joi');

const schemas = {
    listAll: {
        headers: {

        },
        params: {
        },
        body: {
        },
    },
    Details: {
        headers: {},
        params: {
        },
        body: {}
    },
    update: {
        headers: {},
        params: {
            // id: Joi.string().required(),
        },
        body: {}
    },
};

module.exports = schemas;