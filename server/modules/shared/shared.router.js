const routes = {
    brandNames: {
        description: '',
        path: '/brands',
        verb: 'get'
    },
    PunchIn: {
        description: '',
        path: '/punch-in',
        verb: 'all'
    },
    PunchOut: {
        description: '',
        path: '/punch-out/:id',
        verb: 'all'
    },
    ListPunchInReport: {
        description: '',
        path: '/list-punch-in-out',
        verb: 'all'
    },
    ExportPunchInReport: {
        description: '',
        path: '/export-punchIn-report',
        verb: 'all'
    },
    segment: {
        description: '',
        path: '/segments',
        verb: 'get'
    },
    universalSearch: {
        description: '',
        path: '/search',
        verb: 'all'
    },
    termsOfUse: {
        description: '',
        path: '/termsOfUse',
        verb: 'get'
    },
    ReminderFrequency: {
        description: '',
        path: '/reminder-frequency',
        verb: 'get'
    },
    PrivacyPolicy: {
        description: '',
        path: '/privacypolicy',
        verb: 'get'
    },
    getUniqueNo: {
        description: '',
        path: '/getuniqueno',
        verb: 'post'
    },
    getDefaultValue: {
        description: '',
        path: '/getdefaultvalue',
        verb: 'post'
    },
    businessUnit: {
        description: '',
        path: '/businessunit/list',
        verb: 'get'
    },
    businessCode: {
        description: '',
        path: '/businesscode/list',
        verb: 'get'
    },
    listCustomerCategory: {
        description: '',
        path: '/customercategory/list',
        verb: 'get'
    },
    testCron: {
        description: '',
        path: '/testcron',
        verb: 'get'
    },
};

module.exports = { routes };