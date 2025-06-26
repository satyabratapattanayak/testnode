const Joi = require('joi');


const customerSchema = Joi.object().keys({
    customer_code: Joi.string(), // .required(),
    customer_name: Joi.string().required(), // .max({ limit: 500000 }), // { data: Buffer, contentType: String }, //Joi.string().max(500000), // Data: Buffer, // .required(), // uri({ scheme: ['http', 'https'] }) ,
});


const schemas = {
    // listAll: {
    //     headers: { Authorization: Joi.string().required(), },
    //     params: {},
    //     body: {
    //     }
    // },
    create: {
        headers: {},
        params: {},
        body: {
            // customer_code: Joi.string().required(),
            // customer_name: Joi.string().required(),
            // lead_name: Joi.string().required(),
        }
    },
    customerDetails: {
        params: {
            // id: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        }
    },
    update: {
        headers: {},
        params: {
            id: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        },
        body: {}
    },
    deleteCustomer: {
        headers: {},
        params: {
            id: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        },
        body: {}
    },
    linkContacts: {
        headers: {},
        params: {
            // id: Joi.string().regex(/^[A-Fa-f0-9]{24}$/).required()
        },
        body: {
            contactId: Joi.array().items(Joi.string().regex(/^[A-Fa-f0-9]{24}$/)) //.required()).min(1),
        }
    },
    linkStaff: {
        headers: {},
        params: {},
        body: {
            userId: Joi.array().items(Joi.string().regex(/^[A-Fa-f0-9]{24}$/)) //.required()).min(1),
        }
    },
    listCustomersToLink: {
        headers: {},
        params: {
        },
        body: {
            // customerId: Joi.array().items(Joi.string().regex(/^[A-Fa-f0-9]{24}$/)) //.required()).min(1),
            // customerId: Joi.string().regex(/^[A-Fa-f0-9]{24}$/)
        }
    },
    addLinkedCustomer: {
        headers: {},
        params: {},
        body: {
            contact_name: Joi.string().required()
        }
    },
    addLinkedMarketInfo: {
        headers: {},
        params: {},
        body: {
            // currently_supplier: Joi.string().required()
        }
    },
    addLinked_cmr_Details: {
        headers: {},
        params: {},
        body: {
            // Customer_Name: Joi.string().required(),
            // CRM_CMR_No: Joi.string().required()
        }
    },
    addLinked_Customer_Procurement_Cycle: {
        headers: {},
        params: {},
        body: {}
    },
    addLinked_Customer_Quantity_Requirement: {
        headers: {},
        params: {},
        body: {
            // crm_no: Joi.string().required(),
        }
    },
    addLinked_Customer_Machinery_Details: {
        headers: {},
        params: {},
        body: {
            // capacities: Joi.string().required(),
        }
    },
    addLinked_Customer_Input_Material_Details: {
        headers: {},
        params: {},
        body: {
            // additives: Joi.string().required(),
        }
    },
};

module.exports = schemas, customerSchema;
