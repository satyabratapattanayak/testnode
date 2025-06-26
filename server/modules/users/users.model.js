// @ts-check
const DataAccess = require('../../helpers/DataAccess');
const objectid = require('mongodb').ObjectID;
const { isEmpty, last, isUndefined } = require('lodash');

const Audit = require('../audit/audit.model.js');
const acl = require('../../service/acl');
const { deleteNotes } = require('../shared/shared.controller');
const notificationActionModel = require('../../triggers/actions');
const sharedModel = require('../shared/shared.model');
const { mapUsersQuery, auditActions, Modules, formatDate, AllUsers } = require('../shared/shared.model');

let collection_name = 'users';
let mydb;
const database = require('../../service/database');
database.getDb().then(res => { mydb = res; });

const collection = (collectionName) => { return mydb.collection(collectionName); };

let saveUsersActivity = (body) => {
    Audit.addLog({
        module: Modules().user, // todo: send moduleId
        action: body.action,
        documentId: objectid(body.documentId),
        userId: objectid(body.userId),
        message: body.message,
        data: body.data,
        date: new Date()
    });
};

const getRandomString = () => {
    let string = Math.random().toString(36).slice(-8);
    console.log('called 1');
    return string;
}
const encryptPassword = (body, currentLoggedUser) => {
    return new Promise((resolve, reject) => {
        let hash = '';
        // const bcrypt = require('bcrypt');
        // const saltRounds = 10;
        // bcrypt.genSalt(saltRounds, function(err, salt) {
        // bcrypt.hash(body.password, salt, function(err, hash) {
        // Store hash in your password DB.
        resolve(hash);
        //  });
        //  });
    })
}

let countId = [];
const getAllUsers = (userId) => {
    return new Promise((resolve, reject) => {
        const collections = collection(collection_name);
        return collections.find().toArray().then((users) => {
            if (!isEmpty(users)) {
                users.forEach(element => {
                    countId.push(element._id);
                    return getAllUsers(objectid(element._id));
                });
            } else {
                resolve(countId);
                return countId;
            }
            // console.log('countId: ', countId);
            resolve(countId);
            return countId;
        });
    });
};
const getUserRoles = (role_access_reports_mapping) => {
    let roles = [];
    if (role_access_reports_mapping) {
        for (let i = 0; i < role_access_reports_mapping.length; i++) {
            if (roles.indexOf(role_access_reports_mapping[i].role) == -1) {
                roles.push(role_access_reports_mapping[i].role);
            }
        }
    }
    return roles;

}
const getUserAccessLevel = (role_access_reports_mapping) => {
    return new Promise((resolve, reject) => {
        let acls = [];
        if (role_access_reports_mapping) {
            for (let i = 0; i < role_access_reports_mapping.length; i++) {
                acls.push(role_access_reports_mapping[i].access_level);
            }
        }

        let user_access_levels = [];

        const collections = collection('access_level');
        let matchedACL;
        collections.find({}).sort({ 'hierarchy': 1 }).toArray().then(aclDetails => {

            aclDetails.forEach(acl => {
                acls.forEach(useracl => {
                    if (useracl == acl._id) {
                        matchedACL = acl;
                    }
                });
            });
            if (matchedACL) {
                aclDetails.forEach(acl => {
                    if (acl.hierarchy > matchedACL.hierarchy) {
                        user_access_levels.push(acl._id);
                    }
                });
            }
            resolve(user_access_levels);
        }, reject);
    });
}

const check = (userId, array1) => {
    return new Promise((resolve, reject) => {
        getAllUsers(objectid(userId)).then((data) => {
            console.log('data: ', data);
            if (!isEmpty(data)) {
                data.forEach(element => {
                    array1.push(objectid(element._id));
                    check(element._id, array1);
                });
            } else {
                resolve(array1);
                return array1;
            }
        });
        console.log('array1: ', array1);
        resolve(array1);
        return array1;
    });
};


const model = {
    findByEmpCode: async (empCode) => {
        let empDetails = await DataAccess.findOne(collection_name, { emp_code: empCode, deleted: { $ne: 1 } }) || {};
        return empDetails;
    },

    findById: (id, loggedUser) => {
        const crieteria = [
            { $match: { _id: objectid(id) } },
            // { $addFields: { "state": { "$toObjectId": "$state" } } },
            { $lookup: { from: 'role', localField: 'role_access_reports_mapping.role', foreignField: '_id', as: 'role_details' } },
            { $lookup: { from: 'access_level', localField: 'role_access_reports_mapping.access_level', foreignField: '_id', as: 'access_level_details' } },
            // { $lookup: { from: 'users', localField: 'role_access_reports_mapping.reports_to.id', foreignField: '_id', as: 'reportsTo_details' } },
            { $lookup: { from: 'users', localField: 'role_access_reports_mapping.reports_to', foreignField: '_id', as: 'reportsTo_details' } },
            { $lookup: { from: 'region', localField: 'region', foreignField: '_id', as: 'region_details' } },
            { $lookup: { from: 'area', localField: 'area', foreignField: '_id', as: 'area_details' } },
            { $lookup: { from: 'zone', localField: 'zone', foreignField: '_id', as: 'zone_details' } },
            // { $lookup: { from: 'state', localField: 'state', foreignField: '_id', as: 'state_details' } },
            {
                '$lookup': {
                    from: 'state',
                    let: { customer_state: '$state', },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        {
                                            $eq: ['$_id', '$$customer_state']
                                        },
                                        {
                                            $eq: ['$stateCode', '$$customer_state']
                                        },
                                    ],
                                }
                            }
                        }
                    ],
                    as: 'state_details'
                }
            },



            {
                '$lookup': {
                    from: 'customer',
                    let: {
                        'primary_account_manager': '$emp_code',
                        'primary_field_coordinator': '$emp_code',
                        'primary_biss_development': '$emp_code',
                        'primary_technical_services': '$emp_code',
                        'primary_product_development': '$emp_code',
                        'primary_door_opener': '$emp_code',
                        'primary_salesOps': '$emp_code',
                        'secondary_account_manager': '$emp_code',
                        'secondary_field_coordinator': '$emp_code',
                        'secondary_biss_development': '$emp_code',
                        'secondary_technical_services': '$emp_code',
                        'secondary_product_development': '$emp_code',
                        'secondary_door_opener': '$emp_code',
                        'secondary_salesOps': '$emp_code',
                        'tertiary_account_manager': '$emp_code',
                        'tertiary_field_coordinator': '$emp_code',
                        'tertiary_biss_development': '$emp_code',
                        'tertiary_technical_services': '$emp_code',
                        'tertiary_product_development': '$emp_code',
                        'tertiary_door_opener': '$emp_code',
                        'tertiary_salesOps': '$emp_code',
                        'area_manager': '$emp_code',
                        'rbm': '$emp_code',
                        'sales_executive': '$emp_code',
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        {
                                            $eq: ['$responsibility_matrix.primary_account_manager', '$$primary_account_manager']
                                        },
                                        {
                                            $eq: ['$responsibility_matrix.primary_field_coordinator', '$$primary_field_coordinator']
                                        },
                                        {
                                            $eq: ['$responsibility_matrix.primary_biss_development', '$$primary_biss_development']
                                        },
                                        {
                                            $eq: ['$responsibility_matrix.primary_technical_services', '$$primary_technical_services']
                                        },
                                        {
                                            $eq: ['$responsibility_matrix.primary_product_development', '$$primary_product_development']
                                        },
                                        {
                                            $eq: ['$responsibility_matrix.primary_door_opener', '$$primary_door_opener']
                                        },
                                        {
                                            $eq: ['$responsibility_matrix.primary_salesOps', '$$primary_salesOps']
                                        },
                                        {
                                            $eq: ['$responsibility_matrix.secondary_account_manager', '$$secondary_account_manager']
                                        },
                                        {
                                            $eq: ['$responsibility_matrix.secondary_field_coordinator', '$$secondary_field_coordinator']
                                        },
                                        {
                                            $eq: ['$responsibility_matrix.secondary_biss_development', '$$secondary_biss_development']
                                        },
                                        {
                                            $eq: ['$responsibility_matrix.secondary_technical_services', '$$secondary_technical_services']
                                        },
                                        {
                                            $eq: ['$responsibility_matrix.secondary_product_development', '$$secondary_product_development']
                                        },
                                        {
                                            $eq: ['$responsibility_matrix.secondary_door_opener', '$$secondary_door_opener']
                                        },
                                        {
                                            $eq: ['$responsibility_matrix.secondary_salesOps', '$$secondary_salesOps']
                                        },
                                        {
                                            $eq: ['$responsibility_matrix.tertiary_account_manager', '$$tertiary_account_manager']
                                        },
                                        {
                                            $eq: ['$responsibility_matrix.tertiary_field_coordinator', '$$tertiary_field_coordinator']
                                        },
                                        {
                                            $eq: ['$responsibility_matrix.tertiary_biss_development', '$$tertiary_biss_development']
                                        },
                                        {
                                            $eq: ['$responsibility_matrix.tertiary_technical_services', '$$tertiary_technical_services']
                                        },
                                        {
                                            $eq: ['$responsibility_matrix.tertiary_product_development', '$$tertiary_product_development']
                                        },
                                        {
                                            $eq: ['$responsibility_matrix.tertiary_door_opener', '$$tertiary_door_opener']
                                        },
                                        {
                                            $eq: ['$responsibility_matrix.tertiary_salesOps', '$$tertiary_salesOps']
                                        },
                                        {
                                            $eq: ['$sales_executive', '$$sales_executive']
                                        },
                                        {
                                            $eq: ['$rbm', '$$rbm']
                                        },
                                        {
                                            $eq: ['$area_manager', '$$area_manager']
                                        },
                                    ],
                                }
                            }
                        }
                    ],
                    as: 'linked_customers1'
                }
            },
            // { $lookup: { from: 'customer', localField: '_id', foreignField: 'linked_staff.staffId', as: 'linked_customers2' } },


            {
                '$lookup': {
                    from: 'customer',
                    let: { 'userId': '$_id', },
                    pipeline: [
                        { $unwind: { 'path': '$linked_staff', preserveNullAndEmptyArrays: true } },
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: ['$linked_staff.staffId', '$$userId']
                                        },
                                        {
                                            $ne: ['$deleted', 1]
                                        },
                                    ],
                                }
                            }
                        }
                    ],
                    as: 'linked_customers2'
                }
            },

            {
                $addFields: {
                    linked_customers: { $concatArrays: ['$linked_customers2', '$linked_customers1'] },
                    // linked_customers: '$linked_customers1',

                }
            },

            { $lookup: { from: 'lead', localField: '_id', foreignField: 'linked_staff.staffId', as: 'linked_leads' } },

            { $lookup: { from: 'zone', localField: 'linked_leads.lead_zone', foreignField: '_id', as: 'linked_leads_zone_details' } },

            { $lookup: { from: 'business_category', localField: 'linked_leads.crm_division', foreignField: 'key', as: 'crm_division_details' } },
            { $lookup: { from: 'business_group', localField: 'linked_leads.businesscode', foreignField: 'key', as: 'businesscode_details' } },
            { $lookup: { from: 'business_division ', localField: 'linked_leads.businessunit', foreignField: 'key', as: 'bunitDetails' } },

            { $lookup: { from: 'business_category', localField: 'linked_customers.crm_division', foreignField: 'key', as: 'customer_crm_division_details' } },
            { $lookup: { from: 'business_group', localField: 'linked_customers.businesscode', foreignField: 'key', as: 'customer_businesscode_details' } },
            { $lookup: { from: 'business_division ', localField: 'linked_customers.businessunit', foreignField: 'key', as: 'customer_bunitDetails' } },


            { $lookup: { from: 'business_division', localField: 'businessunit', foreignField: 'key', as: 'businessUnit_details' } },
            { $lookup: { from: 'business_category', localField: 'businesscategory', foreignField: 'key', as: 'businessCategory_details' } },
            {
                $addFields: {
                    // 'state_name': { $arrayElemAt: ['$state_details.state', 0] },
                    'linked_leads.lead_zone': { $arrayElemAt: ['$linked_leads_zone_details.zone', 0] },
                    'linked_leads.crm_division': { $arrayElemAt: ['$crm_division_details', 0] },
                    'linked_leads.businesscode': { $arrayElemAt: ['$businesscode_details', 0] },
                    'linked_leads.businessunit': { $arrayElemAt: ['$bunitDetails', 0] },

                    'linked_customers.crm_division': { $arrayElemAt: ['$crm_division_details', 0] },
                    'linked_customers.businesscode': { $arrayElemAt: ['$businesscode_details', 0] },
                    'linked_customers.businessunit': { $arrayElemAt: ['$bunitDetails', 0] },

                    'state_name': { $arrayElemAt: ['$state_details.state', 0] },


                    'businessunit': '$businessUnit_details', 'businesscategory': '$businessCategory_details'
                }
            },
            { $lookup: { from: 'zone', localField: 'linked_customers.customer_zone', foreignField: '_id', as: 'linked_customers_zone_details' } },
            { $lookup: { from: 'business_category', localField: 'linked_customers.customer_business_category', foreignField: '_id', as: 'linked_customers_bc_details' } },

            {
                $project: {
                    tokens: 0,
                    acl_meta: 0,
                    state_details: 0,
                    'state.country': 0,
                    'state.created_at': 0,
                    'state.region': 0,
                    businesscode_details: 0,
                    linked_leads_zone_details: 0,
                    'linked_leads.lead_business_category': 0,
                    'linked_leads.lead_business_division': 0,
                    'linked_leads.lead_business_group': 0,
                    'createdBy_details.password': 0, 'linked_customers.linked_staff': 0,
                    'linked_customers.targets': 0, 'linked_customers.phone': 0, 'linked_customers.address': 0,
                    'createdBy_details.phone': 0, 'createdBy_details.address': 0, 'linked_customers.customer_region': 0,
                    'linked_customers.customer_area': 0, 'linked_customers.customer_referred_by': 0,
                    'linked_customers.linked_contacts': 0, 'linked_customers.customer_code': 0, 'linked_customers.customer_postCode': 0,
                    'linked_customers.deleted': 0, 'linked_customers.created_at': 0, 'linked_customers.created_by': 0,
                    businessUnit_details: 0, 'businessunit._id': 0, businessCategory_details: 0, 'businesscategory._id': 0,

                    'linked_customers.acl_meta': 0, 'linked_customers.bank_guarantee': 0, 'linked_customers.cin_number': 0, 'linked_customers.credit_days': 0, 'linked_customers.credit_limit': 0, 'linked_customers.credit_rating': 0,
                    'linked_customers.crm_brand_region': 0, 'linked_customers.currency_code': 0, 'linked_customers.customer_address1': 0, 'linked_customers.customer_address2': 0, 'linked_customers.customer_contact_point_techservice': 0, 'linked_customers.customer_contact_point_techservices_designation': 0,
                    'linked_customers.customer_continent': 0, 'linked_customers.customer_country': 0, 'linked_customers.customer_email': 0,
                    'linked_customers.customer_sub_continent': 0, 'linked_customers.customer_type': 0, 'linked_customers.gst_registration_num': 0,
                    'linked_customers.gst_registration_type': 0, 'linked_customers.industrial_area': 0, 'linked_customers.last_credit_rating_review_date': 0,
                    'linked_customers.modified_At': 0, 'linked_customers.name_onpan': 0, 'linked_customers.pan_num': 0, 'linked_customers.pan_status': 0, 'linked_customers.projected_customer_category': 0,
                    'linked_customers.responsibility_matrix': 0,
                }
            },
            { $sort: { 'first_name': 1 } }
        ];
        return DataAccess.aggregate('users', crieteria);
    },

    staffListBasedOnRole: (role) => {
        try {
            const crieteria = [
                { $match: { deleted: { $ne: 1 }, isActive: { $ne: false }, 'role_access_reports_mapping.role': { $in: role } } },
                { $project: { first_name: 1, last_name: 1, emp_code: 1, 'roles.role': 1 } },
                { $sort: { first_name: 1 } }
            ];
            return DataAccess.aggregate(collection_name, crieteria);
        } catch (error) {
            throw new Error(error);
        }

    },
    staffListBasedOnRoleAndReporters: async (body, loggedUser) => {
        try {
            let customerDetails = await DataAccess.findOne('customer', { _id: objectid(body.customer_id), deleted: { $ne: 1 } }) ||{};
            const crieteria = [
                {
                    $match: {
                        deleted: { $ne: 1 }, isActive: true, $or: [
                            { _id: loggedUser._id },
                            { emp_code: customerDetails.rbm },
                            { emp_code: customerDetails.area_manager },
                            { emp_code: customerDetails.sales_executive },
                            { $and: [{ region: { $in: [customerDetails.customer_region] } }, { area: { $in: [customerDetails.customer_area] } }, { zone: { $in: [customerDetails.customer_zone] } }, { 'role_access_reports_mapping.role': { $in: body.roles } },] },]
                    }
                },
                { $project: { first_name: 1, last_name: 1, emp_code: 1 } },
                { $sort: { first_name: 1 } }
            ];
            let resp = await DataAccess.aggregate(collection_name, crieteria);
            return resp;
        } catch (error) {
            throw new Error(error)
        }
    },

    listUsersToCreateSchedule: (loggedUser) => {
        let query = { deleted: { $ne: 1 }, isActive: { $ne: false } };
        let allowedViewRoles = acl.getUserViewRoles(loggedUser.group);
        console.log('listUsersToCreateSchedule userGroup: ', loggedUser.group, ' :: hierechyLevel :', allowedViewRoles);

        if (loggedUser.group && loggedUser.group.indexOf('admin') != -1) {
        } else {
            query['$or'] = [
                { _id: objectid(loggedUser._id) },
                // { 'role_access_reports_mapping.reports_to.id': { '$in': [objectid(loggedUser._id)] } },
                { 'group': { $in: allowedViewRoles } },
            ];
        }

        // query['role_access_reports_mapping.role'] = { $in: [1, 2, 3, 9, 13] }

        console.log('query: ', query);

        const crieteria = [
            { $match: query },
            { $lookup: { from: 'role', localField: 'role_access_reports_mapping.role', foreignField: '_id', as: 'role_details' } },
            { $lookup: { from: 'access_level', localField: 'role_access_reports_mapping.access_level', foreignField: '_id', as: 'accessLevel_details' } },
            { $addFields: { name: { $concat: ['$first_name', ' ', '$last_name'] } } },
            // { $sort: { 'access_level': 1 } }
            { $sort: { name: 1 } }
        ];
        return DataAccess.aggregate('users', crieteria);
    },
    advance_filter: (filter, loggedUser) => {
        console.log('logged user: ', loggedUser);

        return getUserAccessLevel(loggedUser.role_access_reports_mapping).then((access_levels) => {
            console.log('access_levels: ', access_levels);

            let roles = getUserRoles(loggedUser.role_access_reports_mapping);
            console.log('roles: ', roles);

            const Nullquery = { $ne: null };


            let query = {
                deleted: { $ne: 1 },
                isActive: { $ne: false },
                $and: [{
                    $or: [
                        { _id: objectid(loggedUser._id) },
                        {
                            '$and': [
                                { 'role_access_reports_mapping.access_level': { '$in': access_levels } },
                                { 'role_access_reports_mapping.role': { '$in': roles } }
                            ]
                        }
                    ]
                }]
            };
            let temp_zone = [];

            if (filter.zone && filter.zone.length > 0) {
                filter.zone.forEach(element => { temp_zone.push(objectid(element)); });
                query['$and'].push({ zone: { '$in': temp_zone } });
            } else if (loggedUser.zone && loggedUser.zone.length > 0) {
                loggedUser.zone.forEach(element => { temp_zone.push(objectid(element)); });
                query['$and'].push({ zone: { '$in': temp_zone } });
            }
            let temp_area = [];
            if (filter.area && filter.area.length > 0) {
                filter.area.forEach(element => { temp_area.push(objectid(element)); });
                query['$and'].push({ area: { '$in': temp_area } });
            } else if (loggedUser.area && loggedUser.area.length > 0) {
                loggedUser.area.forEach(element => { temp_area.push(objectid(element)); });
                query['$and'].push({ area: { '$in': temp_area } });
            }
            let temp_region = [];
            if (filter.region && filter.region.length > 0) {
                filter.region.forEach(element => { temp_region.push(objectid(element)); });
                query['$and'].push({ region: { '$in': temp_region } });
            } else if (loggedUser.region && loggedUser.region.length > 0) {
                loggedUser.region.forEach(element => { temp_region.push(objectid(element)); });
                query['$and'].push({ region: { '$in': temp_region } });
            }

            console.log('query==>: ', JSON.stringify(query));

            if (mydb) {
                const collections = collection(collection_name);
                return collections
                    .aggregate([
                        { $match: query },
                        { $lookup: { from: 'region', localField: 'region', foreignField: '_id', as: 'region_details' } },
                        { $lookup: { from: 'area', localField: 'area', foreignField: '_id', as: 'area_details' } },
                        { $lookup: { from: 'zone', localField: 'zone', foreignField: '_id', as: 'zone_details' } },
                        { $lookup: { from: 'access_level', localField: 'role_access_reports_mapping.access_level', foreignField: '_id', as: 'accessLevel_details' } },
                        { $lookup: { from: 'users', localField: 'reports_to', foreignField: '_id', as: 'reports_details' } },
                        {
                            $project: {
                                first_name: 1,
                                last_name: 1,
                                emp_code: 1,
                            }
                        },
                        // { $sort: { 'role_access_reports_mapping.access_level': 1 } }
                        { $sort: { first_name: 1 } }
                    ])
                    .toArray().then((result) => { return result; });
            }
        });
    },

    basic_filter: async (loggedUser, params) => {
        if (loggedUser.group.includes('admin') || loggedUser.group.includes('director') || loggedUser.group.includes('hr') || loggedUser.group.includes('fin_accts') || (loggedUser.role_access_reports_mapping.some(item => item.role === 3))) {
            let crieteria = [
                { $match: { deleted: { $ne: 1 }, isActive: { $ne: false } } },
                { $addFields: { name: { $concat: ['$first_name', ' ', '$last_name', '(', '$job_title', ')'] } } },
                { $project: { name: 1, role_access_reports_mapping: 1 } },
                { $sort: { name: 1 } }
            ];
            const result = await DataAccess.aggregate(collection_name, crieteria);
            return result;
        } else {
            return await getUsersByReportingTO(loggedUser._id);
        }
        
        
        // let unvAvailableRoles = acl.getUserUnAvailableRoles(loggedUser.group, true);
        // let query = { deleted: { $ne: 1 }, isActive: { $ne: false } };
        // if (!isEmpty(params)) {
        //     if (params.module == 'track-live' || params.module == 'route-history') {
        //         if (loggedUser.group.includes('admin') || loggedUser.group.includes('director')) {
        //             query['role_access_reports_mapping.role'] = { $in: [2, 3, 8, 9, 13] }
        //         } else {
        //             query['$or'] = [
        //                 { _id: objectid(loggedUser._id) },
        //                 { 'role_access_reports_mapping.reports_to.id': { $in: [objectid(loggedUser._id)] } },
        //                 { 'group': { $nin: unvAvailableRoles } }
        //             ];
        //         }
        //     }
        // }

        // if (isEmpty(params)) {
        //     if (loggedUser.group.includes('admin') || loggedUser.group.includes('director')) { } else {
        //         query['$or'] = [
        //             { _id: objectid(loggedUser._id) },
        //             // { 'role_access_reports_mapping.reports_to.id': { $in: [objectid(loggedUser._id)] } },
        //             // { 'group': { $in: allowedViewRoles } }
        //         ];
        //     }
        // }

        // console.log('BASIC FILTER QUERY: ', query);

        // let crieteria = [
        //     // { $match: { 'role_access_reports_mapping.reports_to.id': { $in: [objectid(loggedUser._id)] } } },
        //     { $match: query },
        //     { $addFields: { name: { $concat: ['$first_name', ' ', '$last_name', '(', '$job_title', ')'] } } },
        //     { $project: { name: 1, role_access_reports_mapping: 1 } },
        //     { $sort: { name: 1 } }
        // ];
        // const result = await DataAccess.aggregate(collection_name, crieteria);
        // return result;
    },

    listUsersToCreateMeetings: async (params, loggedUser) => {
        try {
            let query = { deleted: { $ne: 1 }, isActive: { $ne: false } };
            if (params && params.associated_with == 'customer') {
                query['group'] = { $in: ['admin', 'sales_officer', 'technical_service'] };
            }
            let crieteria = [
                { $match: query },
                { $addFields: { name: { $concat: ['$first_name', ' ', '$last_name'] } } },
                { $project: { name: 1 } },
                { $sort: { name: 1 } }
            ];
            const result = await DataAccess.aggregate(collection_name, crieteria);
            return result;
        } catch (error) {
            throw new Error(error);
        }
    },

    listUsersOfRespMatrix: async (loggedUser, params) => {
        console.log('params: ', params);
        const allUsers = AllUsers()

        let response = {
            Primary: {},
            Secondary: {},
            Tertiary: {},
        };
        let primaryAM_Role, primaryAM_ACL,
            primaryFC_Role, primaryFC_ACL,
            primaryBD_Role, primaryBD_ACL,
            primaryTS_Role, primaryTS_ACL,
            primaryPD_Role, primaryPD_ACL,
            primaryDO_Role, primaryDO_ACL,
            primarySO_Role, primarySO_ACL,
            primaryAMuserData,
            primaryFCuserData,
            primaryBDuserData,
            primaryTSuserData,
            primaryPDuserData,
            primaryDOuserData,
            primarySOuserData;
        let secondaryAM_Role, secondaryAM_ACL,
            secondaryFC_Role, secondaryFC_ACL,
            secondaryBD_Role, secondaryBD_ACL,
            secondaryTS_Role, secondaryTS_ACL,
            secondaryPD_Role, secondaryPD_ACL,
            secondaryDO_Role, secondaryDO_ACL,
            secondarySO_Role, secondarySO_ACL,
            secondaryAMuserData,
            secondaryFCuserData,
            secondaryBDuserData,
            secondaryTSuserData,
            secondaryPDuserData,
            secondaryDOuserData,
            secondarySOuserData;

        let tertiaryAM_Role, tertiaryAM_ACL,
            tertiaryFC_Role, tertiaryFC_ACL,
            tertiaryBD_Role, tertiaryBD_ACL,
            tertiaryTS_Role, tertiaryTS_ACL,
            tertiaryPD_Role, tertiaryPD_ACL,
            tertiaryDO_Role, tertiaryDO_ACL,
            tertiarySO_Role, tertiarySO_ACL,
            tertiaryAMuserData,
            tertiaryFCuserData,
            tertiaryBDuserData,
            tertiaryTSuserData,
            tertiaryPDuserData,
            tertiaryDOuserData,
            tertiarySOuserData;

        let customerData = {}

        try {

            if (params && params.customerId) {
                customerData = await DataAccess.findOne(Modules().customer, { _id: objectid(params.customerId) })
            }

            const region = customerData && customerData.customer_region ? customerData.customer_region : null;
            const area = customerData && customerData.customer_area ? customerData.customer_area : null;
            const zone = customerData && customerData.customer_zone ? customerData.customer_zone : null;
            const customerCategory = customerData && customerData.customer_category ? customerData.customer_category : null;
            const businessUnit = customerData && customerData.businessunit ? customerData.businessunit : null;
            const customerRespMatrixUsers = customerData && customerData.responsibility_matrix ? customerData.responsibility_matrix : null;

            const respMatrixConfig = await DataAccess.findOne(Modules().RespMatrixConfig, { client: 'konspec' });

            if (customerCategory) {
                await setRespMatrixUsers(customerCategory)
            }

            async function setRespMatrixUsers(cust_category) {
                declarePrimaryUsersVariables(cust_category, respMatrixConfig)
                declareSecondaryUsersVariables(cust_category, respMatrixConfig)
                declareTertiaryUsersVariables(cust_category, respMatrixConfig)
                if (businessUnit === 'masterbatch') {
                    filterUsers()
                    setResponse()
                } else {
                    await setUsersByRole()
                    setResponse()
                }
            }

            async function setUsersByRole() {
                console.log('OTHERRRRRRRR');
                const users = await model.staffListBasedOnRole([2, 8, 13])
                const TechnicalServiceUsers = await model.staffListBasedOnRole([8])
                const DoorOpenerUsers = await model.staffListBasedOnRole([2, 13])
                const ProductDevelopmentUsers = await model.staffListBasedOnRole([6, 8])
                const BusinessDevelopmentUsers = await model.staffListBasedOnRole([2, 3, 8, 13])
                const SalesOpsUsers = await model.staffListBasedOnRole([3])

                for (const user of users) {
                    primaryAMuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code })
                    primaryFCuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code })
                    secondaryAMuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code })
                    secondaryFCuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code })
                    tertiaryAMuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code })
                    tertiaryFCuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code })
                }

                for (const user of BusinessDevelopmentUsers) {
                    primaryBDuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code })
                    secondaryBDuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code })
                    tertiaryBDuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code })
                }
                for (const user of TechnicalServiceUsers) {
                    primaryTSuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code })
                    secondaryTSuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code })
                    tertiaryTSuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code })
                }
                for (const user of SalesOpsUsers) {
                    primarySOuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code })
                    secondarySOuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code })
                    tertiarySOuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code })
                }
                for (const user of DoorOpenerUsers) {
                    primaryDOuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code })
                    secondaryDOuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code })
                    tertiaryDOuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code })
                }
                for (const user of ProductDevelopmentUsers) {
                    primaryPDuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code })
                    secondaryPDuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code })
                    tertiaryPDuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code })
                }
            }

            function filterUsers() {
                for (const user of allUsers) {

                    const userRegions = String(user.region);
                    const userAreas = String(user.area);
                    const userZones = String(user.zone);

                    setPrimaryAccountManagers(user, userRegions, userAreas, userZones)
                    setPrimaryFieldCoordinators(user, userRegions, userAreas, userZones)
                    setPrimaryBusinessDevelopments(user, userRegions, userAreas, userZones)
                    setPrimaryTechnicalService(user, userRegions, userAreas, userZones)
                    setPrimaryProductDevelopment(user, userRegions, userAreas, userZones)
                    setPrimaryDoorOpener(user, userRegions, userAreas, userZones)
                    setPrimarySalesOps(user, userRegions, userAreas, userZones)

                    setSecondaryAccountManagers(user, userRegions, userAreas, userZones)
                    setSecondaryFieldCoordinators(user, userRegions, userAreas, userZones)
                    setSecondaryBusinessDevelopments(user, userRegions, userAreas, userZones)
                    setSecondaryTechnicalService(user, userRegions, userAreas, userZones)
                    setSecondaryProductDevelopment(user, userRegions, userAreas, userZones)
                    setSecondaryDoorOpener(user, userRegions, userAreas, userZones)
                    setSecondarySalesOps(user, userRegions, userAreas, userZones)

                    setTertiaryAccountManagers(user, userRegions, userAreas, userZones)
                    setTertiaryFieldCoordinators(user, userRegions, userAreas, userZones)
                    setTertiaryBusinessDevelopments(user, userRegions, userAreas, userZones)
                    setTertiaryTechnicalService(user, userRegions, userAreas, userZones)
                    setTertiaryProductDevelopment(user, userRegions, userAreas, userZones)
                    setTertiaryDoorOpener(user, userRegions, userAreas, userZones)
                    setTertiarySalesOps(user, userRegions, userAreas, userZones)
                }
            }

            function setPrimaryAccountManagers(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === primaryAM_Role && RoleACL.access_level === primaryAM_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            primaryAMuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code });
                        }
                    }
                }
            }
            function setPrimaryFieldCoordinators(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === primaryFC_Role && RoleACL.access_level === primaryFC_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            primaryFCuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code });
                        }
                    }
                }
            }
            function setPrimaryBusinessDevelopments(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === primaryBD_Role && RoleACL.access_level === primaryBD_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            primaryBDuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code });
                        }
                    }
                }
            }
            function setPrimaryTechnicalService(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === primaryTS_Role && RoleACL.access_level === primaryTS_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            primaryTSuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code });
                        }
                    }
                }
            }
            function setPrimaryProductDevelopment(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === primaryPD_Role && RoleACL.access_level === primaryPD_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            primaryPDuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code });
                        }
                    }
                }
            }
            function setPrimaryDoorOpener(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === primaryDO_Role && RoleACL.access_level === primaryDO_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            primaryDOuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code });
                        }
                    }
                }
            }
            function setPrimarySalesOps(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === primarySO_Role && RoleACL.access_level === primarySO_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            primarySOuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code });
                        }
                    }
                }
            }


            function setSecondaryAccountManagers(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === secondaryAM_Role && RoleACL.access_level === secondaryAM_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            secondaryAMuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code });
                        }
                    }
                }
            }
            function setSecondaryFieldCoordinators(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === secondaryFC_Role && RoleACL.access_level === secondaryFC_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            secondaryFCuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code });
                        }
                    }
                }
            }
            function setSecondaryBusinessDevelopments(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === secondaryBD_Role && RoleACL.access_level === secondaryBD_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            secondaryBDuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code });
                        }
                    }
                }
            }
            function setSecondaryTechnicalService(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === secondaryTS_Role && RoleACL.access_level === secondaryTS_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            secondaryTSuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code });
                        }
                    }
                }
            }
            function setSecondaryProductDevelopment(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === secondaryPD_Role && RoleACL.access_level === secondaryPD_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            secondaryPDuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code });
                        }
                    }
                }
            }
            function setSecondaryDoorOpener(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === secondaryDO_Role && RoleACL.access_level === secondaryDO_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            secondaryDOuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code });
                        }
                    }
                }
            }
            function setSecondarySalesOps(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === secondarySO_Role && RoleACL.access_level === secondarySO_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            secondarySOuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code });
                        }
                    }
                }
            }


            function setTertiaryAccountManagers(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === tertiaryAM_Role && RoleACL.access_level === tertiaryAM_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            tertiaryAMuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code });
                        }
                    }
                }
            }
            function setTertiaryFieldCoordinators(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === tertiaryFC_Role && RoleACL.access_level === tertiaryFC_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            tertiaryFCuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code });
                        }
                    }
                }
            }
            function setTertiaryBusinessDevelopments(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === tertiaryBD_Role && RoleACL.access_level === tertiaryBD_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            tertiaryBDuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code });
                        }
                    }
                }
            }
            function setTertiaryTechnicalService(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === tertiaryTS_Role && RoleACL.access_level === tertiaryTS_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            tertiaryTSuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code });
                        }
                    }
                }
            }
            function setTertiaryProductDevelopment(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === tertiaryPD_Role && RoleACL.access_level === tertiaryPD_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            tertiaryPDuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code });
                        }
                    }
                }
            }
            function setTertiaryDoorOpener(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === tertiaryDO_Role && RoleACL.access_level === tertiaryDO_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            tertiaryDOuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code });
                        }
                    }
                }
            }
            function setTertiarySalesOps(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === tertiarySO_Role && RoleACL.access_level === tertiarySO_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            tertiarySOuserData.push({ _id: user._id, name: `${user.first_name} ${user.last_name}`, emp_code: user.emp_code });
                        }
                    }
                }
            }



            function declarePrimaryUsersVariables(cust_category, matrixConfigs) {
                console.log('declarePrimaryUsersVariables');
                primaryAM_Role = matrixConfigs[cust_category].primary.account_manager.role;
                primaryAM_ACL = matrixConfigs[cust_category].primary.account_manager.access_level;
                primaryFC_Role = matrixConfigs[cust_category].primary.field_coordinator.role;
                primaryFC_ACL = matrixConfigs[cust_category].primary.field_coordinator.access_level;
                primaryBD_Role = matrixConfigs[cust_category].primary.biss_development.role;
                primaryBD_ACL = matrixConfigs[cust_category].primary.biss_development.access_level;
                primaryTS_Role = matrixConfigs[cust_category].primary.technical_services.role;
                primaryTS_ACL = matrixConfigs[cust_category].primary.technical_services.access_level;
                primaryPD_Role = matrixConfigs[cust_category].primary.product_development.role;
                primaryPD_ACL = matrixConfigs[cust_category].primary.product_development.access_level;
                primaryDO_Role = matrixConfigs[cust_category].primary.door_opener.role;
                primaryDO_ACL = matrixConfigs[cust_category].primary.door_opener.access_level;
                primarySO_Role = matrixConfigs[cust_category].primary.salesOps.role;
                primarySO_ACL = matrixConfigs[cust_category].primary.salesOps.access_level;

                primaryAMuserData = [];
                primaryFCuserData = [];
                primaryBDuserData = [];
                primaryTSuserData = [];
                primaryPDuserData = [];
                primaryDOuserData = [];
                primarySOuserData = [];
            }
            function declareSecondaryUsersVariables(cust_category, matrixConfigs) {
                console.log('declarePrimaryUsersVariables');
                secondaryAM_Role = matrixConfigs[cust_category].secondary.account_manager.role;
                secondaryAM_ACL = matrixConfigs[cust_category].secondary.account_manager.access_level;
                secondaryFC_Role = matrixConfigs[cust_category].secondary.field_coordinator.role;
                secondaryFC_ACL = matrixConfigs[cust_category].secondary.field_coordinator.access_level;
                secondaryBD_Role = matrixConfigs[cust_category].secondary.biss_development.role;
                secondaryBD_ACL = matrixConfigs[cust_category].secondary.biss_development.access_level;
                secondaryTS_Role = matrixConfigs[cust_category].secondary.technical_services.role;
                secondaryTS_ACL = matrixConfigs[cust_category].secondary.technical_services.access_level;
                secondaryPD_Role = matrixConfigs[cust_category].secondary.product_development.role;
                secondaryPD_ACL = matrixConfigs[cust_category].secondary.product_development.access_level;
                secondaryDO_Role = matrixConfigs[cust_category].secondary.door_opener.role;
                secondaryDO_ACL = matrixConfigs[cust_category].secondary.door_opener.access_level;
                secondarySO_Role = matrixConfigs[cust_category].secondary.salesOps.role;
                secondarySO_ACL = matrixConfigs[cust_category].secondary.salesOps.access_level;
                secondaryAMuserData = [];
                secondaryFCuserData = [];
                secondaryBDuserData = [];
                secondaryTSuserData = [];
                secondaryPDuserData = [];
                secondaryDOuserData = [];
                secondarySOuserData = [];
            }
            function declareTertiaryUsersVariables(cust_category, matrixConfigs) {
                console.log('declarePrimaryUsersVariables');
                tertiaryAM_Role = matrixConfigs[cust_category].tertiary.account_manager.role;
                tertiaryAM_ACL = matrixConfigs[cust_category].tertiary.account_manager.access_level;
                tertiaryFC_Role = matrixConfigs[cust_category].tertiary.field_coordinator.role;
                tertiaryFC_ACL = matrixConfigs[cust_category].tertiary.field_coordinator.access_level;
                tertiaryBD_Role = matrixConfigs[cust_category].tertiary.biss_development.role;
                tertiaryBD_ACL = matrixConfigs[cust_category].tertiary.biss_development.access_level;
                tertiaryTS_Role = matrixConfigs[cust_category].tertiary.technical_services.role;
                tertiaryTS_ACL = matrixConfigs[cust_category].tertiary.technical_services.access_level;
                tertiaryPD_Role = matrixConfigs[cust_category].tertiary.product_development.role;
                tertiaryPD_ACL = matrixConfigs[cust_category].tertiary.product_development.access_level;
                tertiaryDO_Role = matrixConfigs[cust_category].tertiary.door_opener.role;
                tertiaryDO_ACL = matrixConfigs[cust_category].tertiary.door_opener.access_level;
                tertiarySO_Role = matrixConfigs[cust_category].tertiary.salesOps.role;
                tertiarySO_ACL = matrixConfigs[cust_category].tertiary.salesOps.access_level;
                tertiaryAMuserData = [];
                tertiaryFCuserData = [];
                tertiaryBDuserData = [];
                tertiaryTSuserData = [];
                tertiaryPDuserData = [];
                tertiaryDOuserData = [];
                tertiarySOuserData = [];
            }

            function setResponse() {
                console.log('RESSSSSSSS');

                setPrimaryUser()
                setSecondaryUser()
                setTertiaryUser()
                setDefaultData()
            }

            function setPrimaryUser() {
                response.Primary.AccountManagers = primaryAMuserData;
                response.Primary.FieldCoordinators = primaryFCuserData;
                response.Primary.BusinessDevelopments = primaryBDuserData;
                response.Primary.TechnicalService = primaryTSuserData;
                response.Primary.ProductDevelopment = primaryPDuserData;
                response.Primary.DoorOpener = primaryDOuserData;
                response.Primary.SalesOps = primarySOuserData;
            }

            function setSecondaryUser() {
                response.Secondary.AccountManagers = secondaryAMuserData;
                response.Secondary.FieldCoordinators = secondaryFCuserData;
                response.Secondary.BusinessDevelopments = secondaryBDuserData;
                response.Secondary.TechnicalService = secondaryTSuserData;
                response.Secondary.ProductDevelopment = secondaryPDuserData;
                response.Secondary.DoorOpener = secondaryDOuserData;
                response.Secondary.SalesOps = secondarySOuserData;
            }

            function setTertiaryUser() {
                response.Tertiary.AccountManagers = tertiaryAMuserData;
                response.Tertiary.FieldCoordinators = tertiaryFCuserData;
                response.Tertiary.BusinessDevelopments = tertiaryBDuserData;
                response.Tertiary.TechnicalService = tertiaryTSuserData;
                response.Tertiary.ProductDevelopment = tertiaryPDuserData;
                response.Tertiary.DoorOpener = tertiaryDOuserData;
                response.Tertiary.SalesOps = tertiarySOuserData;
            }

            function setDefaultData(params) {

                if (customerRespMatrixUsers) {
                    setPrevRespMatrixUsers(primaryAMuserData, customerRespMatrixUsers.primary_account_manager)
                    setPrevRespMatrixUsers(primaryFCuserData, customerRespMatrixUsers.primary_field_coordinator)
                    setPrevRespMatrixUsers(primaryBDuserData, customerRespMatrixUsers.primary_biss_development)
                    setPrevRespMatrixUsers(primaryTSuserData, customerRespMatrixUsers.primary_technical_services)
                    setPrevRespMatrixUsers(primaryPDuserData, customerRespMatrixUsers.primary_product_development)
                    setPrevRespMatrixUsers(primaryDOuserData, customerRespMatrixUsers.primary_door_opener)
                    setPrevRespMatrixUsers(primarySOuserData, customerRespMatrixUsers.primary_salesOps)
                    setPrevRespMatrixUsers(secondaryAMuserData, customerRespMatrixUsers.secondary_account_manager)
                    setPrevRespMatrixUsers(secondaryFCuserData, customerRespMatrixUsers.secondary_field_coordinator)
                    setPrevRespMatrixUsers(secondaryBDuserData, customerRespMatrixUsers.secondary_biss_development)
                    setPrevRespMatrixUsers(secondaryTSuserData, customerRespMatrixUsers.secondary_technical_services)
                    setPrevRespMatrixUsers(secondaryPDuserData, customerRespMatrixUsers.secondary_product_development)
                    setPrevRespMatrixUsers(secondaryDOuserData, customerRespMatrixUsers.secondary_door_opener)
                    setPrevRespMatrixUsers(secondarySOuserData, customerRespMatrixUsers.secondary_salesOps)
                    setPrevRespMatrixUsers(tertiaryAMuserData, customerRespMatrixUsers.tertiary_account_manager)
                    setPrevRespMatrixUsers(tertiaryFCuserData, customerRespMatrixUsers.tertiary_field_coordinator)
                    setPrevRespMatrixUsers(tertiaryBDuserData, customerRespMatrixUsers.tertiary_biss_development)
                    setPrevRespMatrixUsers(tertiaryTSuserData, customerRespMatrixUsers.tertiary_technical_services)
                    setPrevRespMatrixUsers(tertiaryPDuserData, customerRespMatrixUsers.tertiary_product_development)
                    setPrevRespMatrixUsers(tertiaryDOuserData, customerRespMatrixUsers.tertiary_door_opener)
                    setPrevRespMatrixUsers(tertiarySOuserData, customerRespMatrixUsers.tertiary_salesOps)
                }

                // primaryAMuserData.push({ name: 'N/A', emp_code: 'na' })
                // primaryFCuserData.push({ name: 'N/A', emp_code: 'na' })
                // primaryBDuserData.push({ name: 'N/A', emp_code: 'na' })
                // primaryTSuserData.push({ name: 'N/A', emp_code: 'na' })
                // primaryPDuserData.push({ name: 'N/A', emp_code: 'na' })
                // primaryDOuserData.push({ name: 'N/A', emp_code: 'na' })
                // primarySOuserData.push({ name: 'N/A', emp_code: 'na' })

                // secondaryAMuserData.push({ name: 'N/A', emp_code: 'na' })
                // secondaryFCuserData.push({ name: 'N/A', emp_code: 'na' })
                // secondaryBDuserData.push({ name: 'N/A', emp_code: 'na' })
                // secondaryTSuserData.push({ name: 'N/A', emp_code: 'na' })
                // secondaryPDuserData.push({ name: 'N/A', emp_code: 'na' })
                // secondaryDOuserData.push({ name: 'N/A', emp_code: 'na' })
                // secondarySOuserData.push({ name: 'N/A', emp_code: 'na' })

                // tertiaryAMuserData.push({ name: 'N/A', emp_code: 'na' })
                // tertiaryFCuserData.push({ name: 'N/A', emp_code: 'na' })
                // tertiaryBDuserData.push({ name: 'N/A', emp_code: 'na' })
                // tertiaryTSuserData.push({ name: 'N/A', emp_code: 'na' })
                // tertiaryPDuserData.push({ name: 'N/A', emp_code: 'na' })
                // tertiaryDOuserData.push({ name: 'N/A', emp_code: 'na' })
                // tertiarySOuserData.push({ name: 'N/A', emp_code: 'na' })

                function setPrevRespMatrixUsers(array, params) {
                    if (params && params !== '') {
                        const existUser = allUsers.find((user) => user.emp_code === params)
                        const allEmpCodes = array.map((e) => e.emp_code)
                        if (!allEmpCodes.includes(existUser.emp_code)) {
                            array.push({ _id: existUser._id, name: `${existUser.first_name} ${existUser.last_name}`, emp_code: existUser.emp_code });
                        }
                    }
                }

            }


            return response;
        } catch (error) {
            throw new Error(error);
        }




    },

    listUsersToReportsTo: (filter, loggedUser) => {

        let temp_region = [];
        let temp_area = [];
        let temp_zone = [];
        let temp_access_level = [];
        const Nullquery = { $ne: null };
        // let query = {};
        let query = { deleted: { $ne: 1 }, isActive: { $ne: false }, _id: { $ne: objectid(loggedUser._id) } };


        // filter.access_level.forEach(element => { temp_access_level.push(objectid(element)); });
        if (filter.region) {
            filter.region.forEach(element => { temp_region.push(objectid(element)); });
            // query = { region: { $in: temp_region }, access_level: { $lte: filter.access_level }, deleted: { $ne: 1 } };

            query['region'] = { $in: temp_region };
            // matchQuery['customer_region'] = { $in: regions };

        }

        if (filter.area) {
            filter.area.forEach(element => { temp_area.push(objectid(element)); });
            // query = { region: { $in: temp_region }, area: { $in: temp_area }, access_level: { $lte: filter.access_level }, deleted: { $ne: 1 } };
            query['area'] = { $in: temp_area };
        }

        if (filter.zone) {
            filter.zone.forEach(element => { temp_zone.push(objectid(element)); });
            // query = { deleted: { $ne: 1 }, region: { $in: temp_region }, area: { $in: temp_area }, zone: { $in: temp_zone }, 'role_access_reports_mapping.role': filter.role, 'role_access_reports_mapping.access_level': { $lte: filter.access_level } };
            query['zone'] = { $in: temp_zone };
        }

        if (filter.role) {
            query['role_access_reports_mapping.role'] = filter.role;
        }

        if (filter.access_level) {
            query['role_access_reports_mapping.access_level'] = { $lte: filter.access_level };
        }

        if (filter.userId) {
            query = { deleted: { $ne: 1 }, region: { $in: temp_region }, area: { $in: temp_area }, zone: { $in: temp_zone }, 'role_access_reports_mapping.role': filter.role, 'role_access_reports_mapping.access_level': { $lte: filter.access_level }, _id: { $ne: objectid(filter.userId) } };
        }

        console.log('QUERY::list reports to create staff: ', JSON.stringify(query));


        const crieteria = [
            { $match: query },
            { $lookup: { from: 'access_level', localField: 'access_level', foreignField: '_id', as: 'accessLevel_details' } },
            {
                $project: {
                    first_name: 1,
                    last_name: 1,
                    emp_code: 1,
                }
            },
            { $sort: { first_name: 1 } }
        ];
        return DataAccess.aggregate('users', crieteria);
    },

    all: async (loggedUser, filterquery, params) => {
        let query = await mapUsersQuery(loggedUser, filterquery);
        console.log('user list query: ', query);

        const crieteria = [
            {
                "$facet": {
                    "data": [
                        { $match: query },
                        ...common_queries.list
                    ],
                    "totalCount": [
                        { $match: query },
                        ...common_queries.list
                    ]
                }
            }];

        if (params && !isEmpty(params)) {

            if (params.filters && Object.keys(params.filters).length > 0) {
                let filterKeys = Object.keys(params.filters)
                let filter = {

                };

                for (let i = 0; i < filterKeys.length; i++) {

                    if (filterKeys[i] == 'roles') {
                        let key = 'department'
                        filter[key] = { "$regex": params.filters[filterKeys[i]].value, "$options": "i" }
                    } else {
                        filter[filterKeys[i]] = { "$regex": params.filters[filterKeys[i]].value, "$options": "i" }
                    }

                }
                crieteria[0]["$facet"]["data"].push({ "$match": filter });
                crieteria[0]["$facet"]["totalCount"].push({ "$match": filter });

            }

            if (params.sortField) {
                let sort = {};
                sort[params.sortField] = params.sortOrder
                crieteria[0]["$facet"]["data"].push({ "$sort": sort });
            }

            crieteria[0]["$facet"]["data"].push({ "$limit": params.first + params.rows });
            crieteria[0]["$facet"]["data"].push({ "$skip": params.first });
        }
        crieteria[0]["$facet"]["totalCount"].push({ "$count": 'count' });

        return DataAccess.aggregate('users', crieteria);
    },

    listStaffsToLink: (body) => {
        let users = [];
        return DataAccess.findOne('customer', { _id: objectid(body.customerId) }).then((customerDetails) => {

            if (customerDetails) {
                if (!isEmpty(customerDetails.linked_staff)) {
                    customerDetails.linked_staff.forEach(staff => {
                        users.push(objectid(staff.staffId));
                    });
                }
            }
            const crieteria = [
                { $match: { deleted: { $ne: 1 }, isActive: { $ne: false }, _id: { $nin: users }, } },
                { $project: { _id: 1, first_name: 1, last_name: 1 } },
                { $sort: { first_name: 1 } }
            ];
            return DataAccess.aggregate('users', crieteria);
        });
    },
    linkCustomers: (userId, body, currentLoggedUser) => {
        if (mydb) {
            console.log('body: ', body);
            // acl.allowUser('customer', currentLoggedUser, body);
            // acl.allowUser('customer', body, body);
            console.log('body: ', body);

            const collections = collection('customer');
            return collections
                .updateMany(
                    { _id: { $in: body } },
                    {
                        $push: {
                            linked_staff: { staffId: objectid(userId), addedBy: objectid(currentLoggedUser._id), linked_on: new Date() },
                            'acl_meta.users': userId
                        },
                        // $set: {}
                    })
                .then((result) => {
                    if (result.modifiedCount > 0) {
                        Audit.addLog({
                            module: 'customer',
                            action: 'link',
                            documentId: objectid(userId),
                            userId: objectid(currentLoggedUser._id),
                            data: body,
                            // message: 'linked the customer',
                            message: body.length > 1 ? 'linked ' + body.length + ' customers' : 'linked a customer',
                            date: new Date()
                        });
                        if (!isEmpty(body)) {
                            body.forEach(element => {
                                Audit.addLog({
                                    module: 'users',
                                    action: 'link',
                                    documentId: objectid(element),
                                    userId: objectid(currentLoggedUser._id),
                                    data: [{ userId: objectid(userId) }],
                                    message: 'linked a staff',
                                    date: new Date()
                                });
                            });
                        }
                    }
                    return result.modifiedCount > 0 ? 1 : 0;
                });
        }
    },

    linkLeads: (userId, body, currentLoggedUser) => {
        if (mydb) {
            const collections = collection('lead');
            return collections
                .updateMany({ _id: { $in: body } }, { $push: { linked_staff: { staffId: objectid(userId), addedBy: objectid(currentLoggedUser._id), linked_on: new Date() } } })
                .then((result) => {
                    if (result.modifiedCount > 0) {
                        // Audit.addLog({
                        //     module: 'users',
                        //     action: 'link',
                        //     documentId: objectid(userId),
                        //     userId: objectid(currentLoggedUser._id),
                        //     data: [{ customerId: body }],
                        //     message: body.length > 1 ? 'linked ' + body.length + ' leads' : 'linked a lead',
                        //     date: new Date()
                        // });
                        if (!isEmpty(body)) {
                            body.forEach(element => {
                                Audit.addLog({
                                    module: Modules().lead,
                                    action: auditActions().userLink,
                                    documentId: objectid(element),
                                    userId: objectid(currentLoggedUser._id),
                                    data: { users: [userId] },
                                    message: 'linked a staff',
                                    date: new Date()
                                });
                            });
                        }
                    }
                    return result.modifiedCount > 0 ? 1 : 0;
                });
        }
    },

    create: async (body, currentLoggedUser) => {
        try {
            let flag = false;
            body.isAdmin = 0;
            body.isFirstTimeLogin = 1;
            body.created_at = new Date();
            body.created_by = objectid(currentLoggedUser._id);

            if (body.passwordAutoGenerated) {
                body.password = getRandomString()
            }
            acl.allowUser('staff', currentLoggedUser, body);
            const found = await DataAccess.findOne('users', { email: body.email, });
            console.log('user: ', found);

            if (found) {
                if (found.deleted && found.deleted === 1) return 1
                return 0;
            } else {
                return encryptPassword(body, currentLoggedUser).then((hash) => {
                    //     body.password = hash;
                    return DataAccess.InsertOne('users', body).then((resp) => {
                        saveUsersActivity({
                            action: auditActions().create,
                            documentId: resp[0]._id,
                            userId: currentLoggedUser._id,
                            data: resp[0],
                            message: 'created the new staff'
                        });
                        return resp;
                    });
                })
            }
        } catch (error) {
            throw new Error(error)
        } finally {
            //   notificationActionModel.refreshUsers();
            // sharedModel.refreshUsers();
        }
    },

    update: async (id, body, currentLoggedUser) => {
        acl.allowUser('staff', currentLoggedUser, body);
        console.log('MODEL::data to update user info: ', body);
        try {
            const found = await DataAccess.findOne(collection_name, { email: { $eq: body.email }, _id: { $ne: objectid(id) }, deleted: { $ne: 1 } });
            if (found) {
                return 0;
            } else {
                return encryptPassword(body, currentLoggedUser).then((hash) => {
                    // body.password = hash;
                    return DataAccess.UpdateOne(collection_name, { _id: objectid(id) }, { $set: body }).then((result) => {
                        if (result.modifiedCount > 0) {
                            saveUsersActivity({ module: Modules().user, action: auditActions().update, documentId: id, userId: currentLoggedUser._id, data: body, message: 'updated the staff' });
                        }
                        return result.modifiedCount > 0 ? 1 : 2;
                    });
                });
            }
        } catch (error) {
            throw new Error(error)
        } finally {
            // notificationActionModel.refreshUsers();
            sharedModel.refreshUsers();
        }
    },

    delete: async (id, loggedUser) => {
        const result = await DataAccess.DeleteOne(collection_name, { _id: objectid(id) })
        console.log('resp: ', result.modifiedCount);
        if (result.modifiedCount > 0) {
            saveUsersActivity({
                module: Modules().user,
                action: auditActions().Delete,
                documentId: id,
                userId: loggedUser._id,
                data: [{ userId: objectid(id) }], message: 'deleted the staff'
            });

            deleteNotes(id);
            DataAccess.findAll('customer', { 'linked_staff.staffId': { $in: [objectid(id)] } }).then((resp) => {
                if (!isEmpty(resp)) {
                    resp.forEach(eachCustomer => {
                        DataAccess.UpdateOne('customer', { _id: objectid(eachCustomer._id) }, { $pull: { linked_staff: { staffId: objectid(id) } } });
                    });
                }
            });

            DataAccess.findAll('scheduler', { assigned_to: { $in: [objectid(id)] } }).then((found) => {
                if (!isEmpty(found)) {
                    found.forEach(ele => {
                        DataAccess.UpdateOne('scheduler', { _id: objectid(ele._id) }, { $pull: { assigned_to: objectid(id) } });
                    });
                }
            });
        }

        return result.matchedCount > 0 ? 1 : 0;
    },
    totalUsers: () => {
        if (mydb) {
            const collections = collection(collection_name);
            return collections.find().count().then((result) => { return result; });
        }
    },
};

module.exports = model;

async function getUsersByReportingTO(userId) {
    try {
      const hierarchy = [];
      const visitedUsers = new Set();
  
      // Recursive function to traverse the hierarchy in the forward direction
      async function traverseHierarchy(currentUser) {
        if (!currentUser || visitedUsers.has(currentUser._id.toString())) {
          return;
        }
  
        hierarchy.push({
          _id: `${currentUser._id}`,
          name: `${currentUser.first_name} ${currentUser.last_name} (${currentUser.job_title})`,
          role_access_reports_mapping: currentUser.role_access_reports_mapping,
        });
  
        visitedUsers.add(currentUser._id.toString()); 
  
        const subordinates = await DataAccess.findAll(collection_name, { 
            'role_access_reports_mapping.reports_to.id': objectid(currentUser._id)
          });
  
        for (const subordinate of subordinates) {
          await traverseHierarchy(subordinate);
        }
      }
  
      const user = await DataAccess.findOne(collection_name, { _id: objectid(userId)});
      if (!user) {
        console.log(`User not found with _id: ${userId}`);
        return [];
      }
  
      await traverseHierarchy(user);
  
      return hierarchy;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

const common_queries = {
    list: [
        { $lookup: { from: 'role', localField: 'role_access_reports_mapping.role', foreignField: '_id', as: 'role_details' } },
        { $lookup: { from: 'access_level', localField: 'role_access_reports_mapping.access_level', foreignField: '_id', as: 'access_level_details' } },
        {
            $project: {
                _id: 1,
                emp_code: 1,
                first_name: 1,
                last_name: 1,
                city: 1,
                department: 1,
                phone: 1,
                email: 1,
                role_access_reports_mapping: 1,
                role_details: 1,
                access_level_details: 1,
                created_at: formatDate('$created_at'),

            }
        },
        { $sort: { first_name: 1 } }
    ]
}