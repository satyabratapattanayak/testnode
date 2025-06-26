const routes = {
    listAll: {
        description: '',
        path: '/list',
        verb: 'post'
    },
    Create: {
        description: '',
        path: '/create',
        verb: 'post'
    },
    Update: {
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
        path: '/:id/addNotes',
        verb: 'post'
    },
};

module.exports = { routes };