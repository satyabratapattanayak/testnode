const routes = {
    listAll: {
        description: '',
        path: '/list',
        verb: 'get'
    },
    details: {
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
};

module.exports = { routes };