const routes = {
    listAll: {
        description: '',
        path: '/list',
        verb: 'get'
    },
    filter_list: {
        description: '',
        path: '/filter_list',
        verb: 'get'
    },
    listTaggedAreaZone: {
        description: '',
        path: '/listRegionWithTaggedAreaZone',
        verb: 'get'
    },
    listAllWithAreaZone: {
        description: '',
        path: '/listRegionAreaZone',
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
    DeleteRegion: {
        description: '',
        path: '/delete/:id',
        verb: 'delete'
    },
    details: {
        description: '',
        path: '/:id',
        verb: 'get'
    },


};

module.exports = { routes };