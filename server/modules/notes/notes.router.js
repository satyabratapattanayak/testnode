const routes = {
    NotesTypes: {
        description: '',
        path: '/notes-types',
        verb: 'all'
    },
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
    Delete: {
        description: '',
        path: '/delete/:id',
        verb: 'delete'
    },
    details: {
        description: '',
        path: '/:id',
        verb: 'all'
    },
    noteById: {
        description: 'Get details of a note by ID',
        path: '/note/:id',
        verb: 'get'
    }
};

module.exports = { routes };