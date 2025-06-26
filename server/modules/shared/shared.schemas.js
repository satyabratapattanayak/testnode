const Joi = require('joi');

const schemas = {
    getUniqueNo: {
        headers: {},
        params: {},
        body: {
            type: Joi.string().required(),
        }
    },
};

module.exports = schemas;