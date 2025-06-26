const routes = {
    listGroups: {
        description: '',
        path: '/list',
        verb: 'get'
    },
    listPermissions: {
        description: '',
        path: '/listpermissions',
        verb: 'get'
    },
    createGroup: {
        description: '',
        path: '/creategroup',
        verb: 'post'
    },
    createPermission: {
        description: '',
        path: '/createpermission',
        verb: 'post'
    },
    getPermissions: {
        description: '',
        path: '/permissions',
        verb: 'post'
    },
    updateGroup: {
        description: '',
        path: '/update/:id',
        verb: 'put'
    },
    permissionDetails: {
        description: '',
        path: '/permissions/:id',
        verb: 'get'
    },
    groupDetails: {
        description: '',
        path: '/:key',
        verb: 'get'
    },
};

module.exports = { routes };