const Joi = require('joi');

const schemas = {
    details: {
        params: {
            id: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        }
    }
};

module.exports = schemas;