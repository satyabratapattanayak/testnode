const routes = {
    create: {
        description: '',
        path: '/create',
        verb: 'post'
    },
    listAll: {
        description: '',
        path: '/list',
        verb: 'get'
    },
    filter: {
        description: '',
        path: '/filter',
        verb: 'post'
    },
    schedule_options_list: {
        description: '',
        path: '/options_list',
        verb: 'get'
    },
    mobileList: {
        description: '',
        path: '/mobile/list',
        verb: 'all'
    },
    MobileShowMarkers: {
        description: '',
        path: '/mobile/show-markers',
        verb: 'all'
    },
    listAllTaskTypes: {
        description: '',
        path: '/scheduleTypes/list',
        verb: 'get'
    },
    listScheduleCategories: {
        description: '',
        path: '/scheduleCategories/list',
        verb: 'get'
    },
    listAllTaskFields: {
        description: '',
        path: '/taskFields/list',
        verb: 'get'
    },
    createTaskTypes: {
        description: '',
        path: '/create/taskTypes',
        verb: 'post'
    },
    createTaskFields: {
        description: '',
        path: '/create/taskFields',
        verb: 'post'
    },
    checkIn: {
        description: '',
        path: '/checkIn/:id',
        verb: 'post'
    },
    update: {
        description: '',
        path: '/update/:id?',
        verb: 'put'
    },
    changeScheduleStatus: {
        description: '',
        path: '/changeStatus/:id',
        verb: 'put'
    },
    scheduleTypeDetails: {
        description: '',
        path: '/scheduleTypes/:id',
        verb: 'get'
    },
    deleteSchedule: {
        description: '',
        path: '/delete/:id/:type',
        verb: 'delete'
    },
    details: {
        description: '',
        path: '/:id',
        verb: 'get'
    },


    /* getByAssignee: {
        description: '',
        path: '/',
        verb: 'get'
    }, */
    addNotes: {
        description: '',
        path: '/:taskId/addNotes',
        verb: 'post'
    },
};

module.exports = { routes };

