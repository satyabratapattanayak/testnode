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
    Details: {
        description: '',
        path: '/:id',
        verb: 'get'
    },
};

module.exports = { routes };