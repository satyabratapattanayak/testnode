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
    Details: {
        description: '',
        path: '/:id',
        verb: 'get'
    },
    addNotes: {
        description: '',
        path: '/:supplierId/addNotes',
        verb: 'post'
    },
};

module.exports = { routes };