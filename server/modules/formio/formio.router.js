const routes = {
    listAll: {
        description: '',
        path: '/list',
        verb: 'get'
    },
    Details: {
        description: '',
        path: '/details/:formioCode',
        verb: 'get'
    },
    create: {
        description: '',
        path: '/create',
        verb: 'post'
    },
    update: {
        description: '',
        path: '/update',
        verb: 'post'
    },
    Delete: {
        description: '',
        path: '/delete/:formioCode',
        verb: 'delete'
    },
    deleteResponse: {
        description: '',
        path: '/deleteResponse/:id',
        verb: 'delete'
    },
    saveResponse: {
        description: '',
        path: '/saveResponse',
        verb: 'post'
    },
    listResponses: {
        description: '',
        path: '/listResponses',
        verb: 'post'
    },
    responseDetail: {
        description: '',
        path: '/responseDetail/:id',
        verb: 'get'
    },

};

module.exports = { routes };