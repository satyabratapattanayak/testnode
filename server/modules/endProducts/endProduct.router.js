const routes = {
    listAll: {
        description: '',
        path: '/list',
        verb: 'get'
    },
    create: {
        description: '',
        path: '/create',
        verb: 'post'
    },
    update: {
        description: '',
        path: '/update/:id',
        verb: 'put'
    },
    Delete: {
        description: '',
        path: '/delete/:id',
        verb: 'delete'
    },
    Details: {
        description: '',
        path: '/:id',
        verb: 'get'
    },
    Details_linkedIndustryAndSubIndustry: {
        description: '',
        path: '/:id/DetailsLinkedIndustryAndSubIndustry',
        verb: 'post'
    },
    Details_linkedProcessAndSubProcess: {
        description: '',
        path: '/:id/DetailslinkedProcessAndSubProcess',
        verb: 'post'
    },
    Details_linkedCategoryAndSubCategory: {
        description: '',
        path: '/:id/DetailslinkedCategoryAndSubCategory',
        verb: 'post'
    },
    linkIndustryAndSubIndustry: {
        description: '',
        path: '/:id/linkIndustryAndSubIndustry',
        verb: 'post'
    },
    linkProcessAndSubProcess: {
        description: '',
        path: '/:id/linkProcessAndSubProcess',
        verb: 'post'
    },
    linkCategoryAndSubCategory: {
        description: '',
        path: '/:id/linkCategoryAndSubCategory',
        verb: 'post'
    },
    linkRecommendationChart: {
        description: '',
        path: '/:id/linkrecommendationchart',
        verb: 'post'
    },
    linkKonspecCode: {
        description: '',
        path: '/:id/linkkonspeccode',
        verb: 'post'
    },
    linkVideo: {
        description: '',
        path: '/:id/linkvideo',
        verb: 'post'
    },
    linkCustomer: {
        description: '',
        path: '/:id/linkCustomer',
        verb: 'post'
    },
    addTestimonials: {
        description: '',
        path: '/:id/addtestimonials',
        verb: 'post'
    },
    unLinkIndustryAndSubIndustry: {
        description: '',
        path: '/:id/unLinkIndustryAndSubIndustry',
        verb: 'post'
    },
    unLinkProcessAndSubProcess: {
        description: '',
        path: '/:id/unLinkProcessAndSubProcess',
        verb: 'post'
    },
    unLinkCategoryAndSubCategory: {
        description: '',
        path: '/:id/unLinkCategoryAndSubCategory',
        verb: 'post'
    },
    unLinkRecommendationChart: {
        description: '',
        path: '/:id/unLinkRecommendationChart',
        verb: 'post'
    },
    unLinkKonspecCode: {
        description: '',
        path: '/:id/unLinkKonspecCode',
        verb: 'post'
    },
    unLinkVideo: {
        description: '',
        path: '/:id/unlinkvideo',
        verb: 'post'
    },
    unLinkCustomer: {
        description: '',
        path: '/:id/unLinkCustomer',
        verb: 'post'
    },
    viewTestimonials: {
        description: '',
        path: '/:endProductId/viewtestimonials/:testmonialId',
        verb: 'get'
    },
    updateTestimonials: {
        description: '',
        path: '/:endProductId/viewtestimonials/:testmonialId/update',
        verb: 'post'
    },
    deleteTestimonials: {
        description: '',
        path: '/:endProductId/viewtestimonials/:testmonialId/delete',
        verb: 'delete'
    },
};

module.exports = { routes };