
const routes = {
    staffInsert: {
        description: '',
        path: '/staffInsert',
        verb: 'post'
    },
    countryImport: {
        description: '',
        path: '/countryImport',
        verb: 'post'
    },
    stateImport: {
        description: '',
        path: '/stateImport',
        verb: 'post'
    },
    cityImport: {
        description: '',
        path: '/cityImport',
        verb: 'post'
    },
    postCodeImport: {
        description: '',
        path: '/postCodeImport',
        verb: 'post'
    },
    staff_UpdateReportsTo: {
        description: '',
        path: '/link_reportsTo',
        verb: 'post'
    },
    customerInsert: {
        description: '',
        path: '/customerimport',
        verb: 'post'
    },
    customer_UpdateLinkedStaff: {
        description: '',
        path: '/link_staff',
        verb: 'post'
    },
    customer_LinkContacts: {
        description: '',
        path: '/link_contacts',
        verb: 'post'
    },
    staff_UpdateReagionAreaZOne: {
        description: '',
        path: '/update_Region',
        verb: 'get'
    },
    RegionAreaZone: {
        description: '',
        path: '/importregionareazone',
        verb: 'post'
    },
    contactsImport: {
        description: '',
        path: '/importcontacts',
        verb: 'post'
    },
    vendorsImport: {
        description: '',
        path: '/importvendors',
        verb: 'post'
    },
    importResMatrix: {
        description: '',
        path: '/importresmatrix',
        verb: 'post'
    },
};

module.exports = { routes };