const routes = {
    listAll: {
        description: '',
        path: '/list',
        verb: 'all'
    },
    listContactsToLink: {
        description: '',
        path: '/listContactsToLink',
        verb: 'post'
    },
    filter: {
        description: '',
        path: '/filterBy',
        verb: 'get'
    },
    contactDetails: {
        description: '',
        path: '/:id',
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
    addNotes: {
        description: '',
        path: '/:contactId/addNotes',
        verb: 'post'
    },
    linkCustomers: {
        description: '',
        path: '/:contactId/linkCustomer',
        verb: 'post'
    },
    deleteContact: {
        description: '',
        path: '/delete/:id',
        verb: 'delete'
    },

};

module.exports = { routes };