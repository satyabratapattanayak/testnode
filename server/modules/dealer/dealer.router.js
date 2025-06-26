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
    addNotes: {
        description: '',
        path: '/:id/addNotes',
        verb: 'post'
    },
    Details: {
        description: '',
        path: '/:id',
        verb: 'get'
    },

};

module.exports = { routes };
