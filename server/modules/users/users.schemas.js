const Joi = require('joi');

const schemas = {
    create: {
        headers: {},
        params: {},
        body: {
            first_name: Joi.string().required(),
            emp_code: Joi.string().required(),
            email: Joi.string().email({ minDomainAtoms: 2 }),
            region: Joi.array().items(Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()).min(1),
        }
    },
    userDetails: {
        params: {
            id: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        }
    },
    update: {
        headers: {},
        params: {},
        body: {
            // first_name: Joi.string().required(),
            email: Joi.string().email({ minDomainAtoms: 2 }),
            // state: Joi.string().regex(/^[A-Fa-f0-9]{24}$/),
            // region: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        }
    },
    listStaffsToLink: {
        headers: {},
        params: {
        },
        body: {
            customerId: Joi.string().regex(/^[A-Fa-f0-9]{24}$/)
            // staffId: Joi.array().items(Joi.string().regex(/^[A-Fa-f0-9]{24}$/)) //.required()).min(1),
        }
    },
    linkCustomers: {
        headers: {},
        params: {
            userId: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        },
        body: {
            customerId: Joi.array().items(Joi.string().regex(/^[A-Fa-f0-9]{24}$/)) //.required()).min(1),
        }
    },
};

module.exports = schemas;