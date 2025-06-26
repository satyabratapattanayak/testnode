const Joi = require('joi');

const schemas = {
    create: {
        headers: {},
        params: {},
        body: {
            subject: Joi.string().required(),
            type: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required(),
            // assigned_to: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required(),
            category: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required(),
            status: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required(),
            // priority: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required(),
            assigned_to: Joi.array().items(Joi.string().required()).min(1),
        }
    },
    details: {
        params: {
            id: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        }
    },
    scheduleTypeDetails: {
        params: {
            id: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        }
    },
    update: {
        params: {
            id: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        },

    }
};

module.exports = schemas;
