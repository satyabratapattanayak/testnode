const Joi = require('joi');

const schemas = {
    Details: {
        headers: {},
        params: {
            id: Joi.string().required(),
        },
        body: {}
    },
    update: {
        headers: {},
        params: {
            id: Joi.string().required(),
        },
        body: {}
    },
    unLinkIndustryAndSubIndustry: {
        headers: {},
        params: {
            id: Joi.string().required(),
        },
        body: {
            industryId: Joi.string().required(),
        }
    },
    unLinkProcessAndSubProcess: {
        headers: {},
        params: {
            id: Joi.string().required(),
        },
        body: {
            processId: Joi.string().required(),
        }
    },
    unLinkCategoryAndSubCategory: {
        headers: {},
        params: {
            id: Joi.string().required(),
        },
        body: {
            categoryId: Joi.string().required(),
        }
    },
    unLinkRecommendationChart: {
        headers: {},
        params: {
            id: Joi.string().required(),
        },
        body: {
            RecommendationChartId: Joi.string().required(),
        }
    },
    unLinkKonspecCode: {
        headers: {},
        params: {
            id: Joi.string().required(),
        },
        body: {
            konspecCodeId: Joi.string().required(),
        }
    },
    unLinkCustomer: {
        headers: {},
        params: {
            id: Joi.string().required(),
        },
        body: {
            customerId: Joi.string().required(),
        }
    },
};

module.exports = schemas;