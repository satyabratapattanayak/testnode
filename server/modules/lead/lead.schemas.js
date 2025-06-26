const Joi = require('joi');

const schemas = {
    create: {
        headers: {},
        params: {},
        body: {
            // lead_name: Joi.string().required(),
            // phone: Joi.number().length(10),
            // city: Joi.string().required(),
            // email: Joi.string().email()
            // lead_assigned_to
            lead_assigned_to: Joi.array().items(Joi.string().regex(/^[A-Fa-f0-9]{24}$/)) //.required()).min(1),
        }
    },
    update: {
        headers: {},
        params: {
            id: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        },
        body: {
            // lead_name: Joi.string().required(),
            // phone: Joi.number().length(10),
            // city: Joi.string().required(),
            // email: Joi.string().email()
            lead_assigned_to: Joi.array().items(Joi.string().regex(/^[A-Fa-f0-9]{24}$/)) //.required()).min(1),
        }
    },
    leadDetails: {
        params: {
            // id: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        }
    },
    deleteLead: {
        headers: {},
        params: {
            id: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        },
        body: {}
    }
};

module.exports = schemas;
