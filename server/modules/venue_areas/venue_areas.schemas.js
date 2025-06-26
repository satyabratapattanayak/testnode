const Joi = require('joi');

const schemas = {
    create: {
        headers: {},
        params: {},
        body: {
            area_name: Joi.string().required(),
        }
    },
};

module.exports = schemas;