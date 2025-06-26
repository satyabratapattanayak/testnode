const routes = {
    create: {
        description: '',
        path: '/create',
        verb: 'post'
    },
    listBC: {
        description: '',
        path: '/category/list',
        verb: 'get'
    },
    listBD: {
        description: '',
        path: '/division/list',
        verb: 'get'
    },
    listBG: {
        description: '',
        path: '/group/list',
        verb: 'get'
    },
    detailsBG: {
        description: '',
        path: '/group/:id',
        verb: 'get'
    },
    detailsBC: {
        description: '',
        path: '/category/:id',
        verb: 'get'
    },
    detailsBD: {
        description: '',
        path: '/division/:id',
        verb: 'get'
    },
};

module.exports = { routes };