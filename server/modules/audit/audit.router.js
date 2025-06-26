const routes = {
    custom: {
        description: '',
        path: '/custom',
        verb: 'all'
    },
    /*  listAll: {
         description: '',
         path: '/list',
         verb: 'get'
     }, */
    auditDetails: {
        description: '',
        path: '/',
        verb: 'get'
    },
    filter: {
        description: '',
        path: '/:id/filterBy?',
        verb: 'get'
    },
};

module.exports = { routes };