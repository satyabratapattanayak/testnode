const Joi = require('joi');

const schemas = {
    getPermissions: {
        headers: {},
        params: {},
        body: {
            // userId: Joi.string().required(),
            // module: Joi.string().required(),
        }
    },
};

module.exports = schemas;