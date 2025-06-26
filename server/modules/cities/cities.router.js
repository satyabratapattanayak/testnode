const routes = {
    listAll: {
        description: '',
        path: '/list',
        verb: 'get'
    },
    listPostCode: {
        description: '',
        path: '/postcode',
        verb: 'get'
    },
    create: {
        description: '',
        path: '/create',
        verb: 'post'
    },
    createPostCode: {
        description: '',
        path: '/create-postCode',
        verb: 'post'
    },
    updatePostCode: {
        description: '',
        path: '/update/updatePostCode/:postcode',
        verb: 'put'
    },
    Details: {
        description: '',
        path: '/details/:cityname',
        verb: 'get'
    },
    postCodeDetails: {
        description: '',
        path: '/postcode/:postCode',
        verb: 'get'
    },
    update: {
        description: '',
        path: '/update/:id',
        verb: 'put'
    },
    Delete: {
        description: '',
        path: '/delete/:name',
        verb: 'delete'
    },
    DeletePostCode: {
        description: '',
        path: '/delete/deletePostCode/:postCode',
        verb: 'delete'
    }
};

module.exports = { routes };