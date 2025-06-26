const Joi = require('joi');

const schemas = {
    create: {
        headers: {},
        params: {},
        body: {
            contact_name: Joi.string().required(),
            // region: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        }
    },
    contactDetails: {
        params: {
            id: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
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
        }
    },
    deleteContact: {
        headers: {},
        params: {
            id: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        },
        body: {}
    },
    listContactsToLink: {
        headers: {},
        params: {
        },
        body: {
            customerId: Joi.string().regex(/^[A-Fa-f0-9]{24}$/)
            // contactId: Joi.array().items(Joi.string().regex(/^[A-Fa-f0-9]{24}$/)) //.required()).min(1),
        }
    },
    linkCustomers: {
        headers: {},
        params: {
            contactId: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        },
        body: {
            customerId: Joi.array().items(Joi.string().regex(/^[A-Fa-f0-9]{24}$/)) //.required()).min(1),
        }
    },
};

module.exports = schemas;