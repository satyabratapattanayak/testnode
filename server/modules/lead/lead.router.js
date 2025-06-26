const routes = {
    listAll: {
        description: '',
        path: '/list',
        verb: 'post'
    },
    filter: {
        description: '',
        path: '/filter',
        verb: 'post'
    },
    listLeadsToLink: {
        description: '',
        path: '/listLeadsToLink',
        verb: 'post'
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
    deleteLead: {
        description: '',
        path: '/delete/:id',
        verb: 'delete'
    },
    leadDetails: {
        description: '',
        path: '/:id',
        verb: 'get'
    },
    addNotes: {
        description: '',
        path: '/:leadId/addNotes',
        verb: 'post'
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
    linkStaff: {
        description: '',
        path: '/:id/linkStaff',
        verb: 'post'
    },
    unLinkStaff: {
        description: '',
        path: '/:id/unLinkStaff/:staffId',
        verb: 'post'
    },

};

module.exports = { routes };