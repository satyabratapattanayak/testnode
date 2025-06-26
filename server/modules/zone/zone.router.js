const routes = {
    listAll: {
        description: '',
        path: '/list',
        verb: 'get'
    },
    filter_List: {
        description: '',
        path: '/filter_list',
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
    DeleteZone: {
        description: '',
        path: '/delete/:id',
        verb: 'delete'
    },
    details: {
        description: '',
        path: '/:id',
        verb: 'get'
    }
};

module.exports = { routes };