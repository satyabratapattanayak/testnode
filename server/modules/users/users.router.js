const routes = {
    listAll: {
        description: '',
        path: '/list',
        verb: 'all'
    },
    listStaffsToLink: {
        description: '',
        path: '/listStaffsToLink',
        verb: 'post'
    },
    advance_filter: {
        description: '',
        path: '/advance_filter',
        verb: 'post'
    },
    basic_filter: {
        description: '',
        path: '/basic_filter',
        verb: 'get'
    },
    listUsersToCreateSchedule: {
        description: '',
        path: '/list_users',
        verb: 'get'
    },
    listUsersOfResponsibilityMatrix: {
        description: 'list all users of resp matrix based on customer category',
        path: '/resp-matrix-users',
        verb: 'post'
    },
    listUsersToReportsTo: {
        description: '',
        path: '/list_reportsTo',
        verb: 'post'
    },
    updateLocation: {
        description: '',
        path: '/updateLocation',
        verb: 'post'
    },
    sendLocation: {
        description: '',
        path: '/sendLocation',
        verb: 'post'
    },
    getLocations: {
        description: '',
        path: '/getLocations',
        verb: 'post'
    },
    getLastLocations: {
        description: '',
        path: '/getLastLocations',
        verb: 'post'
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
    deleteUser: {
        description: '',
        path: '/delete/:id',
        verb: 'delete'
    },
    listUsersBasedOnRole: {
        description: '',
        path: '/listByRoles',
        verb: 'all'
    },
    listUsersBasedOnRoleAndReporters: {
        description: '',
        path: '/listByRolesAndReporters',
        verb: 'all'
    },
    userDetails: {
        description: '',
        path: '/:id',
        verb: 'get'
    },
    addNotes: {
        description: '',
        path: '/:userId/addNotes',
        verb: 'post'
    },
    linkCustomers: {
        description: '',
        path: '/:userId/linkCustomer',
        verb: 'post'
    },
    linkLeads: {
        description: '',
        path: '/:userId/linkLeads',
        verb: 'post'
    },
    /* listAllAreaManager: {
       description: '',
       path: '/list/areaManagers',
       verb: 'get'
   },
   listAllSalesExecutives: {
       description: '',
       path: '/list/salesExecutives',
       verb: 'get'
   }, */
};

module.exports = { routes };