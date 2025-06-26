const routes = {
    listAll: {
        description: '',
        path: '/list',
        verb: 'all'
    },
    listCMR: {
        description: '',
        path: '/listcmr',
        verb: 'all'
    },
       CMRlist: {
        description: '',
        path: '/cmrlist',
        verb: 'all'
    },
    CMR_AwaitingApproval: {
        description: '',
        path: '/cmr-awaitong-approval',
        verb: 'all'
    },
    listCustomersToLink: {
        description: '',
        path: '/listCustomersToLink',
        verb: 'post'
    },
    /* filter: {
        description: '',
        path: '/filterBy',
        verb: 'get'
    }, */
    filter: {
        description: '',
        path: '/filter',
        verb: 'post'
    },
    create: {
        description: '',
        path: '/create',
        verb: 'post'
    },
    listBDactivity: {
        description: '',
        path: '/list/bdactivity',
        verb: 'all'
    },
    listBDstages: {
        description: '',
        path: '/list/bdstage',
        verb: 'all'
    },
    listCustomerCategory: {
        description: '',
        path: '/customercategory/list',
        verb: 'get'
    },
    update: {
        description: '',
        path: '/update/:id',
        verb: 'put'
    },
    deleteCustomer: {
        description: '',
        path: '/delete/:id',
        verb: 'delete'
    },
    addNotesOnCMR: {
        description: '',
        path: '/cmr-notes/:cmrId/addNotes',
        verb: 'post'
    },
    customerDetails: {
        description: '',
        path: '/:id',
        verb: 'get'
    },
    BDandCustomer_details: {
        description: '',
        path: '/:customerId/bddetails',
        verb: 'get'
    },
    opportunityDetails: {
        description: '',
        path: '/:customerId/bddetails/:opportunityId',
        verb: 'get'
    },
    createQuotes: {
        description: '',
        path: '/:customerId/createQuotes',
        verb: 'post'
    },
    addLinkedCustomer: {
        description: '',
        path: '/:customerId/addLinkedCustomer',
        verb: 'post'
    },
    addLinkedMarketInfo: {
        description: '',
        path: '/:customerId/addLinkedMarketInfo',
        verb: 'post'
    },
    updateLinkedMarketInfo: {
        description: '',
        path: '/:customerId/updateLinkedMarketInfo',
        verb: 'post'
    },
    addLinked_Customer_Quantity_Requirement: {
        description: '',
        path: '/:customerId/addLinkedCustomerQuantityRequirement',
        verb: 'post'
    },
    updateLinked_Customer_Quantity_Requirement: {
        description: '',
        path: '/:customerId/updateLinkedCustomerQuantityRequirement',
        verb: 'post'
    },
    addLinked_Customer_Input_Material_Details: {
        description: '',
        path: '/:customerId/addLinkedCustomerInputMaterials',
        verb: 'post'
    },
    updateLinked_Customer_Input_Material_Details: {
        description: '',
        path: '/:customerId/updateLinkedCustomerInputMaterials',
        verb: 'post'
    },
    addLinked_Customer_Material_Details: {
        description: '',
        path: '/:customerId/addLinkedCustomerMaterials',
        verb: 'post'
    },
    updateLinked_Customer_Material_Details: {
        description: '',
        path: '/:customerId/updateLinkedCustomerMaterials',
        verb: 'post'
    },
    addLinked_Customer_Procurement_Cycle: {
        description: '',
        path: '/:customerId/addLinkedCustomerProcurementCycle',
        verb: 'post'
    },
    updateLinked_Customer_Procurement_Cycle: {
        description: '',
        path: '/:customerId/updateLinkedCustomerProcurementCycle',
        verb: 'post'
    },
    addLinked_Customer_Machinery_Details: {
        description: '',
        path: '/:customerId/addLinkedCustomerMachinerydetails',
        verb: 'post'
    },
    updateLinked_Customer_Machinery_Details: {
        description: '',
        path: '/:customerId/updateLinkedCustomerMachinerydetails',
        verb: 'post'
    },
    addLinked_customer_sample_order: {
        description: '',
        path: '/:customerId/addLinkedCustomerSampleOrder',
        verb: 'post'
    },
    updateLinked_customer_sample_order: {
        description: '',
        path: '/:customerId/updateLinkedCustomerSampleOrder',
        verb: 'post'
    },
    addLinked_cmr_Details: {
        description: '',
        path: '/:customerId/addLinkedOpportunities',
        verb: 'post'
    },
    updateLinked_cmr_Details: {
        description: '',
        path: '/:customerId/updateLinkedOpportunities',
        verb: 'post'
    },
    linkContacts: {
        description: '',
        path: '/:id/linkContacts',
        verb: 'post'
    },
    linkStaff: {
        description: '',
        path: '/:id/linkStaff',
        verb: 'post'
    },
    addNotes: {
        description: '',
        path: '/:customerId/addNotes',
        verb: 'post'
    },
    addTargets: {
        description: '',
        path: '/:customerId/addTargets',
        verb: 'post'
    },
    updateTargets: {
        description: '',
        path: '/:customerId/updateTargets/:targetId',
        verb: 'put'
    },
    deleteTargets: {
        description: '',
        path: '/:customerId/deleteTargets/:targetId',
        verb: 'delete'
    },
    unLinkContacts: {
        description: '',
        path: '/:id/unLinkContacts/:contactId',
        verb: 'post'
    },
    unLinkStaff: {
        description: '',
        path: '/:id/unLinkStaff/:staffId',
        verb: 'post'
    },
    viewSingleCMR: {
        description: '',
        path: '/cmrdetails/:cmrId',
        verb: 'get'
    },
    updateSingleCMR: {
        description: '',
        path: '/updatecmrdetails/:cmrId',
        verb: 'put'
    },
    canApprove: {
        description: '',
        path: '/:id/canApprove',
        verb: 'post'
    },
    approveOrReject: {
        description: '',
        path: '/:id/approveOrReject',
        verb: 'post'
    },
    distinctCMRList: {
        description: '',
        path: '/distinctCMRList/:type',
        verb: 'all'
    },
    cmrPorential: {
        description: '',
        path: '/cmrPorential',
        verb: 'all'
    },
    customerPotential: {
        description: '',
        path: '/customerPotential',
        verb: 'all'
    },
    updateStaffResponsibilityMatrix: {
        description: '',
        path: '/update-staff-responsibility-matrix',
        verb: 'post'
    },
};

module.exports = { routes };
