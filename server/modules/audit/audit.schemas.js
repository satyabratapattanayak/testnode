const Joi = require('joi');

const schemas = {
    findByDocumentId: {
        params: {
            id: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        }
    }
};

module.exports = schemas;