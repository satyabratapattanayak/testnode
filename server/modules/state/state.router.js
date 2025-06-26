const routes = {
    listAll: {
        description: '',
        path: '/list',
        verb: 'all'
    },
    Details: {
        description: '',
        path: '/details/:stateCode',
        verb: 'get'
    },
    create: {
        description: '',
        path: '/create',
        verb: 'post'
    },
    update: {
        description: '',
        path: '/update/:stateCode',
        verb: 'put'
    },
    Delete: {
        description: '',
        path: '/delete/:stateCode',
        verb: 'delete'
    }
};

module.exports = { routes };