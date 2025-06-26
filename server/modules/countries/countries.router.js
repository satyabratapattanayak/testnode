const routes = {
    listAll: {
        description: '',
        path: '/list',
        verb: 'get'
    },
    Details: {
        description: '',
        path: '/details/:countryCode',
        verb: 'get'
    },
    create: {
        description: '',
        path: '/create',
        verb: 'post'
    },
    update: {
        description: '',
        path: '/update/:countryCode',
        verb: 'put'
    },
    Delete: {
        description: '',
        path: '/delete/:countryCode',
        verb: 'delete'
    }
};

module.exports = { routes };