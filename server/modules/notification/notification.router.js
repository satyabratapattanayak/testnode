const routes = {
    listAll: {
        description: '',
        path: '/list',
        verb: 'all'
    },
    create: {
        description: '',
        path: '/create',
        verb: 'post'
    },
    markAllAsRead: {
        description: '',
        path: '/mark-all-as-read',
        verb: 'all'
    },
    markAllAsDeleted: {
        description: '',
        path: '/mark-all-as-deleted',
        verb: 'all'
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