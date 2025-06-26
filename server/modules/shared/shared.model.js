// @ts-check
const ObjectId = require('mongodb').ObjectID;
const NodeGeocoder = require('node-geocoder');
const { isEmpty, isUndefined } = require('lodash');

const DataAccess = require('../../helpers/DataAccess');
const Audit = require('../audit/audit.model');
const acl = require('../../service/acl');
const Config = require('../../config/config');
const { getDefaultDataPermission, getUsersDataPermission } = require('../../service/acl');
const { cmrStatusList } = require('./shared.constant.js');

let mydb;
const database = require('../../service/database');
database.getDb().then(res => { mydb = res; });


const options = {
    provider: 'google',
    // Optional depending on the providers
    httpAdapter: 'https', // Default
    apiKey: Config.GOOGLE_API_KEY, // 'AIzaSyB7WVZN4uspiY4hP2nLSiyATmWc2t0epZU', // for Mapquest, OpenCage, Google Premier
    formatter: null         // 'gpx', 'string', ...
};

const geocoder = NodeGeocoder(options);

const filterByRegionAreaZone = (loggedUser, query, module) => {
    let region = module + '_region';
    let area = module + '_area';
    let zone = module + '_zone';

    if (!query['$or'][0]) {
        query['$or'][0] = { $and: [] };
    }

    if (!isEmpty(loggedUser.region)) {
        loggedUser.region.push(ObjectId('5c5a7e24932704b38ec31a96'));
        let loggedUserRegion = loggedUser.region;
        query['$or'][0]['$and'].push({ [region]: { '$in': loggedUserRegion } });
    }

    if (!isEmpty(loggedUser.area)) {
        loggedUser.area.push(ObjectId('5c5ac8c11086f2e73b5ddb66'));
        let loggedUserArea = loggedUser.area;
        query['$or'][0]['$and'].push({ [area]: { '$in': loggedUserArea } });
    }

    if (!isEmpty(loggedUser.zone)) {
        loggedUser.zone.push(ObjectId('5c5ac9021086f2e73b5ddb67'));
        let loggedUserZone = loggedUser.zone;
        query['$or'][0]['$and'].push({ [zone]: { '$in': loggedUserZone } });
    }
};



const setDefaultPermission = (query, permission, loggedUser, module) => {
    if (!query['$or']) {
        query['$or'] = [];
    }
    if (!permission) {
        delete query['$or'];
    }
    if (permission && permission.RegionAreaZone) {
        filterByRegionAreaZone(loggedUser, query, module);
    }

    if (permission && permission.Group) {
        let aclPermissions = acl.getAclQueryPermissions(module, 'view', loggedUser);
        if (permission.RegionAreaZone) {
            query['$or'][0]['$and'][0] = { $or: [] };
            query['$or'][0]['$and'][0]['$or'].push(
                { 'acl_meta.permissions': { '$in': aclPermissions } },
                { 'acl_meta.users': { $in: [loggedUser._id.toString(), loggedUser._id] } }
            );
        } else {
            query['$or'].push(
                { 'acl_meta.permissions': { '$in': aclPermissions } },
                { 'acl_meta.users': { $in: [loggedUser._id.toString(), loggedUser._id] } }
            );
        }
    }

    if (permission && permission.DirectAssign) {
        model.mapResMatrix(query, loggedUser);
    }

}

const setLoggedUserPermission = (loggedUserPermission, query, loggedUser, module) => {
    if (!query['$or']) {
        query['$or'] = [];
    }
    if (loggedUserPermission.RegionAreaZone) {
        // query['$or'] = [];
        filterByRegionAreaZone(loggedUser, query, module);
    }

    if (loggedUserPermission.Group) {
        let aclPermissions = acl.getAclQueryPermissions(module, 'view', loggedUser);
        if (loggedUserPermission.RegionAreaZone) {
            query['$or'][0]['$and'].push({ $or: [] });
            query['$or'][0]['$and'][3]['$or'].push({ 'acl_meta.permissions': { '$in': aclPermissions } }, { 'acl_meta.users': { $in: [loggedUser._id.toString(), loggedUser._id] } });
        } else {
            // query['$or'] = [];
            query['$or'].push({ 'acl_meta.permissions': { '$in': aclPermissions } }, { 'acl_meta.users': { $in: [loggedUser._id.toString(), loggedUser._id] } });
        }
    }



    if (loggedUserPermission.DirectAssign) {
        model.mapResMatrix(query, loggedUser);
    }
}

let allUsersData = [];

async function loadUsers(db) {
    let data = await db.collection(model.Modules().user).aggregate([{ $match: { deleted: { $ne: 1 } } }, {
        $project: {
            emp_code: 1,
            email: 1,
            first_name: 1,
            last_name: 1,
            role_access_reports_mapping: 1,
            region: 1,
            area: 1,
            zone: 1,
            businessunit: 1
        }
    }]).toArray();
    allUsersData = data;
}

const model = {
    AllUsers() {
        return allUsersData;
    },

    init: async (db) => {
        loadUsers(db)
    },

    refreshUsers: async () => {
        const data = await DataAccess.aggregate(model.Modules().user, [{ $match: { deleted: { $ne: 1 } } }, { $project: { emp_code: 1, email: 1, first_name: 1, last_name: 1, role_access_reports_mapping: 1, region: 1, area: 1, zone: 1, businessunit: 1 } }]);
        allUsersData = data;
    },
    findByQuery: async (collectionName, query) => {
        let data = await DataAccess.findOne(collectionName, query);
        return data;
    },

    punchIn: async (user, data) => {
        console.log('came to model');

        try {
            const doc = {
                module: model.Modules().punchInOut,
                action: model.auditActions().punchIn,
                userId: ObjectId(user._id),
                documentId: null,
                data: {
                    punch_in: new Date()
                },
                message: 'punch in;',
                date: new Date()
            }
            const newData = await DataAccess.InsertOne('audit', doc);
            console.log('newData puncIn: ', newData);
            return newData[0]
        } catch (error) {
            throw new Error(error)
        }
    },
    punchOut: async (user, id, data) => {
        try {
            const newData = await DataAccess.UpdateOne('audit', { _id: ObjectId(id) }, { $set: { 'data.punch_out': new Date() } });
            console.log('newData: ', newData);

            return newData
        } catch (error) {
            throw new Error(error)
        }
    },

    listPunchInReport: async (loggedUser, query1, params) => {
        try {
            let sort = {};
            let query = { module: model.Modules().punchInOut,
                          date: {"$gte": new Date(new Date().setMonth(new Date().getMonth() - 3)), "$lte": new Date()}
                        };
            if (params && !isEmpty(params) && params.user) {
                query["userId"] = ObjectId(params.user);
            }
            const crieteria = [
                {
                    "$facet": {
                        "data": [
                            {"$sort":{"date": -1}},
                            { $match: query },
                            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'userDetails' } },
                            {
                                $project: {
                                    username: { $concat: [{ $arrayElemAt: ['$userDetails.first_name', 0] }, ' ', { $arrayElemAt: ['$userDetails.last_name', 0] }] },
                                    employeeId: { $arrayElemAt: ['$userDetails.emp_code', 0] },
                                    punch_in: { $arrayElemAt: [model.formatDate('$data.punch_in'), 0] },
                                    punch_out: { $arrayElemAt: [model.formatDate('$data.punch_out'), 0] },
                                    app_version: {
                                        "$cond": {
                                            if: {
                                                "$gte": [
                                                    { "$dateToString": { format: "%Y-%m-%d", date: '$data.punch_in' } },
                                                    '2024-09-11'
                                                ]
                                            },
                                            then: '2.0.2',
                                            else: '2.0.1'
                                        }
                                    }
                                }
                            }
                        ]
                        ,
                        "totalCount": [
                            // { $match: query },
                            { $match: { module: model.Modules().punchInOut } },
                            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'userDetails' } },
                            {
                                $project: {
                                    username: { $concat: [{ $arrayElemAt: ['$userDetails.first_name', 0] }, ' ', { $arrayElemAt: ['$userDetails.last_name', 0] }] },
                                    employeeId: { $arrayElemAt: ['$userDetails.emp_code', 0] },
                                    punch_in: { $arrayElemAt: [model.formatDate('$data.punch_in'), 0] },
                                    punch_out: { $arrayElemAt: [model.formatDate('$data.punch_out'), 0] },
                                }
                            }
                            // { "$count": "count" }
                        ]
                    }
                }];
            if (params && !isEmpty(params)) {

                if (params.options.filters && Object.keys(params.options.filters).length > 0) {
                    let filterKeys = Object.keys(params.options.filters)
                    let filter = {

                    };
                    for (let i = 0; i < filterKeys.length; i++) {
                        filter[filterKeys[i]] = { "$regex": params.options.filters[filterKeys[i]].value, "$options": "i" }
                        // totalMatch[filterKeys[i]] = { "$regex": params.filters[filterKeys[i]].value, "$options": "i" }
                    }
                    crieteria[0]["$facet"]["data"].push({ "$match": filter });
                    crieteria[0]["$facet"]["totalCount"].push({ "$match": filter });
                }

                if (params.options.sortField) {
                    let sort = {};
                    sort[params.options.sortField] = params.options.sortOrder
                    crieteria[0]["$facet"]["data"].push({ "$sort": sort });
                }

                crieteria[0]["$facet"]["data"].push({ "$limit": params.options.first + params.options.rows });
                crieteria[0]["$facet"]["data"].push({ "$skip": params.options.first })
            }
            crieteria[0]["$facet"]["totalCount"].push({ "$count": "count" });

            const data = await DataAccess.aggregate('audit', crieteria)


            return data;
        } catch (error) {
            throw new Error(error)
        }
    },
    exportPunchInReport: async (loggedUser, query1, params) => {
        try {
            let query = { module: model.Modules().punchInOut };
            if (params && !isEmpty(params) && params.user) {
                query["userId"] = ObjectId(params.user);
            }
            const pipeline = [
                { $match: query },
                { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'userDetails' } },
                {
                    $project: {
                        username: { $concat: [{ $arrayElemAt: ['$userDetails.first_name', 0] }, ' ', { $arrayElemAt: ['$userDetails.last_name', 0] }] },
                        employeeId: { $arrayElemAt: ['$userDetails.emp_code', 0] },
                        punch_in: { $arrayElemAt: [model.formatDate('$data.punch_in'), 0] },
                        punch_out: { $arrayElemAt: [model.formatDate('$data.punch_out'), 0] },
                    }
                }
            ]
            const data = await DataAccess.aggregate('audit', pipeline);
            if (params) {
                var enddate = new Date(params.enddate);
                enddate.setDate(enddate.getDate() + 1);
                var startdate = new Date(params.startdate);
                const data1 = data.filter(ele => {
                    return new Date(ele.punch_in) <= new Date(enddate) && new Date(ele.punch_in) >= new Date(startdate)
                })
                return data1;
            } else {
                return data;
            }

        } catch (error) {
            throw new Error(error)
        }
    },

    checkDatalListingPermission: (permission = []) => {
        let canListAll = {
            customer: false,
            lead: false,
            users: false,
            contacts: false,
            cmr: false,
        };
        if (permission.includes('admin') || permission.includes('director') || permission.includes('vp')) {
            canListAll.customer = true;
            canListAll.lead = true;
            canListAll.users = true;
            canListAll.contacts = true;
            canListAll.cmr = true;
        } else if (permission.includes('cmr_approver')) {
            canListAll.cmr = true;
        }
        return canListAll;
    },

    universalSearch: async (key, loggedUser, params) => {
        try {
            let resp = {};
            await getSearchResults(loggedUser, key, params, resp);
            return resp;
        } catch (error) {
            throw new Error(error);
        }
    },
    termsOfUse: () => {
        return DataAccess.findOne('privacyPolicy', { _id: 'termsOfUse' });
    },
    PrivacyPolicy: () => {
        return DataAccess.findOne('privacyPolicy', { _id: 'privacyPolicy' });
    },

    brands: () => {
        return DataAccess.findAll('brands', {});
    },
    segment: () => {
        return DataAccess.findAll('segment', {});
    },
    ReminderFrequency: () => {
        return DataAccess.findAll('reminderFrequency', {});
    },

    mapCustomerQuery: async (loggedUser, query) => {

        if (!query) {
            query = { deleted: { $ne: 1 }, isDealersCustomer: { $ne: true } };
        }
        query.deleted = { $ne: 1 };
        query.isDealersCustomer = { $ne: true };

        let loggedUserPermission = await getUsersDataPermission(loggedUser.group, model.Modules().customer);
        let defaultPermission = await getDefaultDataPermission(model.Modules().customer);
        console.log('mapCustomerQuery :: permissions: ', defaultPermission, ' :: ', loggedUserPermission);
        if (!loggedUserPermission) {
            console.log('checked default permission');
            setDefaultPermission(query, defaultPermission, loggedUser, model.Modules().customer);
        } else {
            if (!isEmpty(loggedUserPermission)) {
                console.log('checked logged user permission');
                setLoggedUserPermission(loggedUserPermission, query, loggedUser, model.Modules().customer);
            }
        }
        return query;
    },

    mapCMRQuery: async (loggedUser, query) => {
        if (!query) {
            query = { deleted: { $ne: 1 }, };
        }
        query.deleted = { $ne: 1 };

        let loggedUserPermission = await getUsersDataPermission(loggedUser.group, model.Modules().cmr);
        let defaultPermission = await getDefaultDataPermission(model.Modules().cmr);
        console.log('mapCMRQuery :: permissions: ', defaultPermission, ' :: ', loggedUserPermission);

        if (!loggedUserPermission) {
            console.log('checked default permission');
            let permission = defaultPermission;
            if (permission.RegionAreaZone) {
                filterByRegionAreaZone(loggedUser, query, model.Modules().customer);
            }

            if (permission.Group) {
                let aclPermissions = acl.getAclQueryPermissions(model.Modules().customer, 'view', loggedUser);
                if (permission.RegionAreaZone) {
                    query['$or'][0]['$and'][0] = { $or: [] };
                    query['$or'][0]['$and'][0]['$or'].push(
                        { 'acl_meta.permissions': { '$in': aclPermissions } },
                        { 'acl_meta.users': { $in: [loggedUser._id.toString(), loggedUser._id] } }
                    );
                } else {
                    query['$or'].push(
                        { 'acl_meta.permissions': { '$in': aclPermissions } },
                        { 'acl_meta.users': { $in: [loggedUser._id.toString(), loggedUser._id] } }
                    );
                }
            }

            if (permission.DirectAssign) {
                model.mapResMatrix(query, loggedUser);
            }

        } else {
            if (!isEmpty(loggedUserPermission)) {
                console.log('checked logged user permission');
                if (loggedUserPermission.RegionAreaZone) {
                    let ids = await getRegionAreaCustomerIdsToListCMRs(loggedUser, model.Modules().customer)
                    if (!query['$or']) {
                        query['$or'] = []
                    }
                    if (!query['$or'][0]) {
                        query['$or'][0] = { $and: [] };
                    }
                    query['$or'][0]['$and'].push({ customer_id: { $in: ids } })
                }

                if (loggedUserPermission.DirectAssign) {
                    let ids = await getCustomerIdsToListCMRs(loggedUser, query)
                    if (loggedUserPermission.RegionAreaZone) {
                        query['$or'].push({ customer_id: { $in: ids } })
                        delete query['customer_id'];
                    } else {
                        query['customer_id'] = { $in: ids }
                    }

                }
            }
        }
        return query;
    },

    mapBDQuery: async (loggedUser, query) => {
        if (!query) { query = { deleted: { $ne: 1 } }; }
        query['deleted'] = { $ne: 1 };
        let loggedUserPermission = await getUsersDataPermission(loggedUser.group, model.Modules().bd);
        let defaultPermission = await getDefaultDataPermission(model.Modules().bd);
        console.log('mapBDQuery :: permissions: ', defaultPermission, ' :: ', loggedUserPermission);

        if (!loggedUserPermission) {
            console.log('checked default permission');
            setDefaultPermission(query, defaultPermission, loggedUser, model.Modules().customer);
        } else {
            if (!isEmpty(loggedUserPermission)) {
                console.log('checked logged user permission');
                setLoggedUserPermission(loggedUserPermission, query, loggedUser, model.Modules().customer);
            }
        }
        return query;
    },
    mapLeadQuery: async (loggedUser, query) => {
        if (!query) {
            query = { deleted: { $ne: 1 }, isArchived: { $ne: 1 } };
        }

        query.deleted = { $ne: 1 };
        query.isArchived = { $ne: 1 };

        let loggedUserPermission = await getUsersDataPermission(loggedUser.group, model.Modules().lead);
        let defaultPermission = await getDefaultDataPermission(model.Modules().lead);

        console.log('mapLeadQuery :: permissions: ', defaultPermission, ' :: ', loggedUserPermission);

        if (!loggedUserPermission) {
            console.log('checked default permission');
            setDefaultPermission(query, defaultPermission, loggedUser, model.Modules().lead);
        } else {
            if (!isEmpty(loggedUserPermission)) {
                console.log('checked logged user permission');
                setLoggedUserPermission(loggedUserPermission, query, loggedUser, model.Modules().lead);
            }
        }
        return query;
    },

    mapContactsQuery: async (loggedUser, query) => {
        if (!query) {
            query = { deleted: { $ne: 1 } };
        }
        query['deleted'] = { $ne: 1 };

        let loggedUserPermission = await getUsersDataPermission(loggedUser.group, model.Modules().contact);
        let defaultPermission = await getDefaultDataPermission(model.Modules().contact);

        if (!loggedUserPermission) {
            console.log('checked default permission');
            setDefaultPermission(query, defaultPermission, loggedUser, model.Modules().contact);
        } else {
            if (!isEmpty(loggedUserPermission)) {
                console.log('checked logged user permission');
                setLoggedUserPermission(loggedUserPermission, query, loggedUser, model.Modules().contact);
            }
        }
        return query;
    },
    mapSupplierQuery: async (loggedUser, query) => {
        if (!query) {
            query = { deleted: { $ne: 1 } };
        }
        query['deleted'] = { $ne: 1 };

        let loggedUserPermission = await getUsersDataPermission(loggedUser.group, model.Modules().supplier);
        let defaultPermission = await getDefaultDataPermission(model.Modules().supplier);
        console.log('mapSupplierQuery permissions: ', defaultPermission, ' :: ', loggedUserPermission);
        if (!loggedUserPermission) {
            console.log('checked default permission');
            setDefaultPermission(query, defaultPermission, loggedUser, model.Modules().supplier);
        } else {
            if (!isEmpty(loggedUserPermission)) {
                console.log('checked logged user permission');
                setLoggedUserPermission(loggedUserPermission, query, loggedUser, model.Modules().supplier);
            }
        }

        return query;
    },
    mapUsersQuery: async (user = {}, query = {}) => {
        if (!query) {
            query = { deleted: { $ne: 1 } };
        }
        query['deleted'] = { $ne: 1 };
        // query['isActive'] = { $ne: false };

        // temperarely commented below restriction bcoz user list restriction not yet finalised.
        // let allowedViewRoles = acl.getUserViewRoles(loggedUser.group);
        // query["$or"] = [{ 'group': { $in: allowedViewRoles } }, { "_id": objectid(loggedUser._id) }, { "acl_meta.users": objectid(loggedUser._id) }];

        return query;

    },

    setApprovalStageQuery: (query, loggedUser, params) => {
        let approvalStage;
        if (loggedUser.group.includes('area_manager')) {
            approvalStage = { $eq: 1 };
        } else if (loggedUser.group.includes('rbm')) {
            approvalStage = { $in: [1, 2] };
            if (params.awaitingRole) {
                approvalStage = { $eq: 2 };
            }

        } else if (loggedUser.group.includes('director')) {
            approvalStage = { $in: [1, 2, 3] };
            if (params.awaitingRole) {
                approvalStage = { $eq: 3 };
            }
        } else if (loggedUser.group.includes('vp')) {
            approvalStage = { $in: [1, 2, 3] };
            if (params.awaitingRole) {
                approvalStage = { $eq: 3 };
            }
        } else if (loggedUser.group.includes('admin')) {
            approvalStage = { $in: [1, 2, 3] };
            if (params.awaitingRole) {
                approvalStage = { $eq: 3 };
            }
        } else if (loggedUser.group.includes('technical_service')) {
            approvalStage = { $in: [1, 2, 3] };
            if (params.awaitingRole) {
                approvalStage = { $eq: 3 };
            }
        } else {
            approvalStage = { $nin: [0, 4, ''] };
        }

        if (loggedUser.group.includes('cmr_approver')) {
            approvalStage = { $in: [1, 2, 3] };
            if (params.awaitingRole) {
                approvalStage = { $eq: 3 };
            }
        }
        query['approvalStage'] = approvalStage;
        if (params && params.bd_flow_id && approvalStage) {
            delete query['approvalStage'];
            query['bd_flow_id'] = params.bd_flow_id;
        }
    },

    setCMRapprovalStatus: async (data) => {
        data.forEach(element => {
            if (!element.approvalStage || element.approvalStage == '') {
                element.status = 'Un Sent';
            } else if (element.approvalStage && element.approvalStage == 1) {
                element.status = 'Waiting for an Approval from Area Manager';
            } else if (element.approvalStage && element.approvalStage == 2) {
                element.status = 'Waiting for an Approval from RBM';
            } else if (element.approvalStage && element.approvalStage == 3) {
                element.status = 'Waiting for an Approval from CMR Approver ';
            } else if (element.approvalStage && element.approvalStage == 4) {
                element.status = 'Approved by CMR Approver ';
            }
        });
    },
    CreateRespMatrix: async (custId, oldData, currentData) => {
        console.log('fn::CreateRespMatrix');
        const region = currentData && currentData.customer_region ? currentData.customer_region : oldData.customer_region;
        const area = currentData && currentData.customer_area ? currentData.customer_area : oldData.customer_area;
        const zone = currentData && currentData.customer_zone ? currentData.customer_zone : oldData.customer_zone;
        const businessunit = currentData && currentData.businessunit ? currentData.businessunit : oldData.businessunit;
        if (!oldData.responsibility_matrix || isEmpty(oldData.responsibility_matrix)) {
            if (!currentData.responsibility_matrix) currentData.responsibility_matrix = {}
            if (Config.client === 'konspec') {
                const allUsers = allUsersData;
                const matrixConfigs = await DataAccess.findOne(model.Modules().RespMatrixConfig, { client: 'konspec' })
                if (currentData.customer_category && currentData.customer_category !== '') {
                    const key = currentData.customer_category;
                    switch (key) {
                        case 'PALLADIUM': {
                            console.log('PALLADIUM:');
                            generateRespMatrix('PALLADIUM', matrixConfigs, allUsers);
                            break;
                        }
                        case 'PLATINUM': {
                            generateRespMatrix('PLATINUM', matrixConfigs, allUsers);
                            break;
                        }
                        case 'GOLD': {
                            generateRespMatrix('GOLD', matrixConfigs, allUsers);
                            break;
                        }
                        case 'BLUE': {
                            generateRespMatrix('BLUE', matrixConfigs, allUsers);
                            break;
                        }
                        case 'SILVER': {
                            console.log('SILVER:');
                            generateRespMatrix('SILVER', matrixConfigs, allUsers);
                            break;
                        }
                        default:
                            break;
                    }
                }
            }
        }

        async function generateRespMatrix(cust_category, matrixConfigs, allUsers) {
            console.log('fn::generateRespMatrix: ');

            const PrimaryMatrixVariables = declarePrimaryMatrixVariables(matrixConfigs, cust_category);
            const SecondaryMatrixVariables = declareSecondaryMatrixVariables(matrixConfigs, cust_category);
            const TertiaryMatrixVariables = declareTertiaryMatrixVariables(matrixConfigs, cust_category);
            var { primaryAM_Role, primaryAM_ACL,
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
                primarySOuserData,
                primaryAMuserDataBuisnessunitFiltered,
                primaryFCuserDataBuisnessunitFiltered,
                primaryBDuserDataBuisnessunitFiltered,
                primaryTSuserDataBuisnessunitFiltered,
                primaryPDuserDataBuisnessunitFiltered,
                primaryDOuserDataBuisnessunitFiltered,
                primarySOuserDataBuisnessunitFiltered } = PrimaryMatrixVariables;
            var {
                secondaryAM_Role, secondaryAM_ACL,
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
                secondarySOuserData,
                secondaryAMuserDataBuisnessunitFiltered,
                secondaryFCuserDataBuisnessunitFiltered,
                secondaryBDuserDataBuisnessunitFiltered,
                secondaryTSuserDataBuisnessunitFiltered,
                secondaryPDuserDataBuisnessunitFiltered,
                secondaryDOuserDataBuisnessunitFiltered,
                secondarySOuserDataBuisnessunitFiltered } = SecondaryMatrixVariables;

            var {
                tertiaryAM_Role, tertiaryAM_ACL,
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
                tertiarySOuserData,
                tertiaryAMuserDataBuisnessunitFiltered,
                tertiaryFCuserDataBuisnessunitFiltered,
                tertiaryBDuserDataBuisnessunitFiltered,
                tertiaryTSuserDataBuisnessunitFiltered,
                tertiaryPDuserDataBuisnessunitFiltered,
                tertiaryDOuserDataBuisnessunitFiltered,
                tertiarySOuserDataBuisnessunitFiltered } = TertiaryMatrixVariables;

            for (const user of allUsers) {

                const userRegions = user.region ? String(user.region) : [];
                const userAreas = user.area ? String(user.area) : [];
                const userZones = user.zone ? String(user.zone) : [];

                filterPrimaryAMusers(user, userRegions, userAreas, userZones);
                filterPrimaryFCusers(user, userRegions, userAreas, userZones);
                filterPrimaryBDusers(user, userRegions, userAreas, userZones);
                filterPrimaryTSusers(user, userRegions, userAreas, userZones);
                filterPrimaryPDusers(user, userRegions, userAreas, userZones);
                filterPrimaryDOusers(user, userRegions, userAreas, userZones);
                filterPrimarySOusers(user, userRegions, userAreas, userZones);

                filterSecondaryAMusers(user, userRegions, userAreas, userZones);
                filterSecondaryFCusers(user, userRegions, userAreas, userZones);
                filterSecondaryBDusers(user, userRegions, userAreas, userZones);
                filterSecondaryTSusers(user, userRegions, userAreas, userZones);
                filterSecondaryPDusers(user, userRegions, userAreas, userZones);
                filterSecondaryDOusers(user, userRegions, userAreas, userZones);
                filterSecondarySOusers(user, userRegions, userAreas, userZones);

                filterTertiaryAMusers(user, userRegions, userAreas, userZones);
                filterTertiaryFCusers(user, userRegions, userAreas, userZones);
                filterTertiaryBDusers(user, userRegions, userAreas, userZones);
                filterTertiaryTSusers(user, userRegions, userAreas, userZones);
                filterTertiaryPDusers(user, userRegions, userAreas, userZones);
                filterTertiaryDOusers(user, userRegions, userAreas, userZones);
                filterTertiarySOusers(user, userRegions, userAreas, userZones);

            }

            setPrimaryUsers();
            setSecondaryUsers();
            setTertiaryUsers();

            /* ****************************************START PRIMARY DATA*************************************************** */
            function filterPrimaryAMusers(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === primaryAM_Role && RoleACL.access_level === primaryAM_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            primaryAMuserData.push(user);
                            if (user.businessunit && user.businessunit.length > 0 && user.businessunit.includes(String(businessunit))) {
                                primaryAMuserDataBuisnessunitFiltered.push(user)
                            }
                        }
                    }
                }
            }

            function filterPrimarySOusers(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === primarySO_Role && RoleACL.access_level === primarySO_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            primarySOuserData.push(user);
                            if (user.businessunit && user.businessunit.length > 0 && user.businessunit.includes(String(businessunit))) {
                                primarySOuserDataBuisnessunitFiltered.push(user)
                            }
                        }
                    }
                }
            }

            function filterPrimaryDOusers(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === primaryDO_Role && RoleACL.access_level === primaryDO_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            primaryDOuserData.push(user);
                            if (user.businessunit && user.businessunit.length > 0 && user.businessunit.includes(String(businessunit))) {
                                primaryDOuserDataBuisnessunitFiltered.push(user)
                            }
                        }
                    }
                }
            }

            function filterPrimaryPDusers(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === primaryPD_Role && RoleACL.access_level === primaryPD_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            primaryPDuserData.push(user);
                            if (user.businessunit && user.businessunit.length > 0 && user.businessunit.includes(String(businessunit))) {
                                primaryPDuserDataBuisnessunitFiltered.push(user)
                            }
                        }
                    }
                }
            }

            function filterPrimaryTSusers(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === primaryTS_Role && RoleACL.access_level === primaryTS_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            primaryTSuserData.push(user);
                            if (user.businessunit && user.businessunit.length > 0 && user.businessunit.includes(String(businessunit))) {
                                primaryTSuserDataBuisnessunitFiltered.push(user)
                            }
                        }
                    }
                }
            }

            function filterPrimaryBDusers(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === primaryBD_Role && RoleACL.access_level === primaryBD_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            primaryBDuserData.push(user);
                            if (user.businessunit && user.businessunit.length > 0 && user.businessunit.includes(String(businessunit))) {
                                primaryBDuserDataBuisnessunitFiltered.push(user)
                            }
                        }
                    }
                }
            }

            function filterPrimaryFCusers(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === primaryFC_Role && RoleACL.access_level === primaryFC_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            primaryFCuserData.push(user);
                            if (user.businessunit && user.businessunit.length > 0 && user.businessunit.includes(String(businessunit))) {
                                primaryFCuserDataBuisnessunitFiltered.push(user)
                            }
                        }
                    }
                }
            }
            /* *****************************************END PRIMARY DATA************************************************** */

            /* *****************************************START SECONDARY DATA********************************************** */
            function filterSecondaryAMusers(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === secondaryAM_Role && RoleACL.access_level === secondaryAM_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            secondaryAMuserData.push(user);
                            if (user.businessunit && user.businessunit.length > 0 && user.businessunit.includes(String(businessunit))) {
                                secondaryAMuserDataBuisnessunitFiltered.push(user)
                            }
                        }
                    }
                }
            }

            function filterSecondarySOusers(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === secondarySO_Role && RoleACL.access_level === secondarySO_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            secondarySOuserData.push(user);
                            if (user.businessunit && user.businessunit.length > 0 && user.businessunit.includes(String(businessunit))) {
                                secondarySOuserDataBuisnessunitFiltered.push(user)
                            }
                        }
                    }
                }
            }

            function filterSecondaryDOusers(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === secondaryDO_Role && RoleACL.access_level === secondaryDO_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            secondaryDOuserData.push(user);
                            if (user.businessunit && user.businessunit.length > 0 && user.businessunit.includes(String(businessunit))) {
                                secondaryDOuserDataBuisnessunitFiltered.push(user)
                            }
                        }
                    }
                }
            }

            function filterSecondaryPDusers(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === secondaryPD_Role && RoleACL.access_level === secondaryPD_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            secondaryPDuserData.push(user);
                            if (user.businessunit && user.businessunit.length > 0 && user.businessunit.includes(String(businessunit))) {
                                secondaryPDuserDataBuisnessunitFiltered.push(user)
                            }
                        }
                    }
                }
            }

            function filterSecondaryTSusers(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === secondaryTS_Role && RoleACL.access_level === secondaryTS_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            secondaryTSuserData.push(user);
                            if (user.businessunit && user.businessunit.length > 0 && user.businessunit.includes(String(businessunit))) {
                                secondaryTSuserDataBuisnessunitFiltered.push(user)
                            }
                        }
                    }
                }
            }

            function filterSecondaryBDusers(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === secondaryBD_Role && RoleACL.access_level === secondaryBD_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            secondaryBDuserData.push(user);
                            if (user.businessunit && user.businessunit.length > 0 && user.businessunit.includes(String(businessunit))) {
                                secondaryBDuserDataBuisnessunitFiltered.push(user)
                            }
                        }
                    }
                }
            }

            function filterSecondaryFCusers(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === secondaryFC_Role && RoleACL.access_level === secondaryFC_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            secondaryFCuserData.push(user);
                            if (user.businessunit && user.businessunit.length > 0 && user.businessunit.includes(String(businessunit))) {
                                secondaryFCuserDataBuisnessunitFiltered.push(user)
                            }
                        }
                    }
                }
            }
            /* *****************************************END SECONDARY DATA************************************************ */

            /* *****************************************START TERTIARY DATA*********************************************** */
            function filterTertiaryAMusers(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === tertiaryAM_Role && RoleACL.access_level === tertiaryAM_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            tertiaryAMuserData.push(user);
                            if (user.businessunit && user.businessunit.length > 0 && user.businessunit.includes(String(businessunit))) {
                                tertiaryAMuserDataBuisnessunitFiltered.push(user)
                            }
                        }
                    }
                }
            }

            function filterTertiarySOusers(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === tertiarySO_Role && RoleACL.access_level === tertiarySO_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            tertiarySOuserData.push(user);
                            if (user.businessunit && user.businessunit.length > 0 && user.businessunit.includes(String(businessunit))) {
                                tertiarySOuserDataBuisnessunitFiltered.push(user)
                            }
                        }
                    }
                }
            }

            function filterTertiaryDOusers(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === tertiaryDO_Role && RoleACL.access_level === tertiaryDO_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            tertiaryDOuserData.push(user);
                            if (user.businessunit && user.businessunit.length > 0 && user.businessunit.includes(String(businessunit))) {
                                tertiaryDOuserDataBuisnessunitFiltered.push(user)
                            }
                        }
                    }
                }
            }

            function filterTertiaryPDusers(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === tertiaryPD_Role && RoleACL.access_level === tertiaryPD_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            tertiaryPDuserData.push(user);
                            if (user.businessunit && user.businessunit.length > 0 && user.businessunit.includes(String(businessunit))) {
                                tertiaryPDuserDataBuisnessunitFiltered.push(user)
                            }
                        }
                    }
                }
            }

            function filterTertiaryTSusers(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === tertiaryTS_Role && RoleACL.access_level === tertiaryTS_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            tertiaryTSuserData.push(user);
                            if (user.businessunit && user.businessunit.length > 0 && user.businessunit.includes(String(businessunit))) {
                                tertiaryTSuserDataBuisnessunitFiltered.push(user)
                            }
                        }
                    }
                }
            }

            function filterTertiaryBDusers(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === tertiaryBD_Role && RoleACL.access_level === tertiaryBD_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            tertiaryBDuserData.push(user);
                            if (user.businessunit && user.businessunit.length > 0 && user.businessunit.includes(String(businessunit))) {
                                tertiaryBDuserDataBuisnessunitFiltered.push(user)
                            }
                        }
                    }
                }
            }

            function filterTertiaryFCusers(user, userRegions, userAreas, userZones) {
                for (const RoleACL of user.role_access_reports_mapping) {
                    if (RoleACL.role === tertiaryFC_Role && RoleACL.access_level === tertiaryFC_ACL) {
                        if (userRegions.includes(String(region)) && userAreas.includes(String(area)) && userZones.includes(String(zone))) {
                            tertiaryFCuserData.push(user);
                            if (user.businessunit && user.businessunit.length > 0 && user.businessunit.includes(String(businessunit))) {
                                tertiaryFCuserDataBuisnessunitFiltered.push(user)
                            }
                        }
                    }
                }
            }
            /* *****************************************END TERTIARY DATA************************************************ */

            // setPrimaryUsers();
            // setSecondaryUsers();
            // setTertiaryUsers();

            function setPrimaryUsers() {
                currentData.responsibility_matrix.primary_account_manager = primaryAMuserDataBuisnessunitFiltered && primaryAMuserDataBuisnessunitFiltered.length > 0 ? primaryAMuserDataBuisnessunitFiltered[0].emp_code : primaryAMuserData && primaryAMuserData.length > 0 ? primaryAMuserData[0].emp_code : '';
                currentData.responsibility_matrix.primary_field_coordinator = primaryFCuserDataBuisnessunitFiltered && primaryFCuserDataBuisnessunitFiltered.length > 0 ? primaryFCuserDataBuisnessunitFiltered[0].emp_code : primaryFCuserData && primaryFCuserData.length > 0 ? primaryFCuserData[0].emp_code : '';
                currentData.responsibility_matrix.primary_biss_development = primaryBDuserDataBuisnessunitFiltered && primaryBDuserDataBuisnessunitFiltered.length > 0 ? primaryBDuserDataBuisnessunitFiltered[0].emp_code : primaryBDuserData && primaryBDuserData.length > 0 ? primaryBDuserData[0].emp_code : '';
                currentData.responsibility_matrix.primary_technical_services = primaryTSuserDataBuisnessunitFiltered && primaryTSuserDataBuisnessunitFiltered.length > 0 ? primaryTSuserDataBuisnessunitFiltered[0].emp_code : primaryTSuserData && primaryTSuserData.length > 0 ? primaryTSuserData[0].emp_code : '';
                currentData.responsibility_matrix.primary_product_development = primaryPDuserDataBuisnessunitFiltered && primaryPDuserDataBuisnessunitFiltered.length > 0 ? primaryPDuserDataBuisnessunitFiltered[0].emp_code : primaryPDuserData && primaryPDuserData.length > 0 ? primaryPDuserData[0].emp_code : '';
                currentData.responsibility_matrix.primary_door_opener = primaryDOuserDataBuisnessunitFiltered && primaryDOuserDataBuisnessunitFiltered.length > 0 ? primaryDOuserDataBuisnessunitFiltered[0].emp_code : primaryDOuserData && primaryDOuserData.length > 0 ? primaryDOuserData[0].emp_code : '';
                currentData.responsibility_matrix.primary_salesOps = primarySOuserDataBuisnessunitFiltered && primarySOuserDataBuisnessunitFiltered.length > 0 ? primarySOuserDataBuisnessunitFiltered[0].emp_code : primarySOuserData && primarySOuserData.length > 0 ? primarySOuserData[0].emp_code : '';
            }

            function setSecondaryUsers() {
                currentData.responsibility_matrix.secondary_account_manager = secondaryAMuserDataBuisnessunitFiltered && secondaryAMuserDataBuisnessunitFiltered.length > 0 ? secondaryAMuserDataBuisnessunitFiltered[0].emp_code : secondaryAMuserData && secondaryAMuserData.length > 0 ? secondaryAMuserData[0].emp_code : '';
                currentData.responsibility_matrix.secondary_field_coordinator = secondaryFCuserDataBuisnessunitFiltered && secondaryFCuserDataBuisnessunitFiltered.length > 0 ? secondaryFCuserDataBuisnessunitFiltered[0].emp_code : secondaryFCuserData && secondaryFCuserData.length > 0 ? secondaryFCuserData[0].emp_code : '';
                currentData.responsibility_matrix.secondary_biss_development = secondaryBDuserDataBuisnessunitFiltered && secondaryBDuserDataBuisnessunitFiltered.length > 0 ? secondaryBDuserDataBuisnessunitFiltered[0].emp_code : secondaryBDuserData && secondaryBDuserData.length > 0 ? secondaryBDuserData[0].emp_code : '';
                currentData.responsibility_matrix.secondary_technical_services = secondaryTSuserDataBuisnessunitFiltered && secondaryTSuserDataBuisnessunitFiltered.length > 0 ? secondaryTSuserDataBuisnessunitFiltered[0].emp_code : secondaryTSuserData && secondaryTSuserData.length > 0 ? secondaryTSuserData[0].emp_code : '';
                currentData.responsibility_matrix.secondary_product_development = secondaryPDuserDataBuisnessunitFiltered && secondaryPDuserDataBuisnessunitFiltered.length > 0 ? secondaryPDuserDataBuisnessunitFiltered[0].emp_code : secondaryPDuserData && secondaryPDuserData.length > 0 ? secondaryPDuserData[0].emp_code : '';
                currentData.responsibility_matrix.secondary_door_opener = secondaryDOuserDataBuisnessunitFiltered && secondaryDOuserDataBuisnessunitFiltered.length > 0 ? secondaryDOuserDataBuisnessunitFiltered[0].emp_code : secondaryDOuserData && secondaryDOuserData.length > 0 ? secondaryDOuserData[0].emp_code : '';
                currentData.responsibility_matrix.secondary_salesOps = secondarySOuserDataBuisnessunitFiltered && secondarySOuserDataBuisnessunitFiltered.length > 0 ? secondarySOuserDataBuisnessunitFiltered[0].emp_code : secondarySOuserData && secondarySOuserData.length > 0 ? secondarySOuserData[0].emp_code : '';
            }

            function setTertiaryUsers() {
                currentData.responsibility_matrix.tertiary_account_manager = tertiaryAMuserDataBuisnessunitFiltered && tertiaryAMuserDataBuisnessunitFiltered.length > 0 ? tertiaryAMuserDataBuisnessunitFiltered[0].emp_code : tertiaryAMuserData && tertiaryAMuserData.length > 0 ? tertiaryAMuserData[0].emp_code : '';
                currentData.responsibility_matrix.tertiary_field_coordinator = tertiaryFCuserDataBuisnessunitFiltered && tertiaryFCuserDataBuisnessunitFiltered.length > 0 ? tertiaryFCuserDataBuisnessunitFiltered[0].emp_code : tertiaryFCuserData && tertiaryFCuserData.length > 0 ? tertiaryFCuserData[0].emp_code : '';
                currentData.responsibility_matrix.tertiary_biss_development = tertiaryBDuserDataBuisnessunitFiltered && tertiaryBDuserDataBuisnessunitFiltered.length > 0 ? tertiaryBDuserDataBuisnessunitFiltered[0].emp_code : tertiaryBDuserData && tertiaryBDuserData.length > 0 ? tertiaryBDuserData[0].emp_code : '';
                currentData.responsibility_matrix.tertiary_technical_services = tertiaryTSuserDataBuisnessunitFiltered && tertiaryTSuserDataBuisnessunitFiltered.length > 0 ? tertiaryTSuserDataBuisnessunitFiltered[0].emp_code : tertiaryTSuserData && tertiaryTSuserData.length > 0 ? tertiaryTSuserData[0].emp_code : '';
                currentData.responsibility_matrix.tertiary_product_development = tertiaryPDuserDataBuisnessunitFiltered && tertiaryPDuserDataBuisnessunitFiltered.length > 0 ? tertiaryPDuserDataBuisnessunitFiltered[0].emp_code : tertiaryPDuserData && tertiaryPDuserData.length > 0 ? tertiaryPDuserData[0].emp_code : '';
                currentData.responsibility_matrix.tertiary_door_opener = tertiaryDOuserDataBuisnessunitFiltered && tertiaryDOuserDataBuisnessunitFiltered.length > 0 ? tertiaryDOuserDataBuisnessunitFiltered[0].emp_code : tertiaryDOuserData && tertiaryDOuserData.length > 0 ? tertiaryDOuserData[0].emp_code : '';
                currentData.responsibility_matrix.tertiary_salesOps = tertiarySOuserDataBuisnessunitFiltered && tertiarySOuserDataBuisnessunitFiltered.length > 0 ? tertiarySOuserDataBuisnessunitFiltered[0].emp_code : tertiarySOuserData && tertiarySOuserData.length > 0 ? tertiarySOuserData[0].emp_code : '';
            }



            DataAccess.UpdateOne(model.Modules().customer, { _id: ObjectId(custId) }, { $set: { responsibility_matrix: currentData.responsibility_matrix } })


        }
    },

    mapResMatrix: (query, loggedUser) => {
        // query['$or'] = [
        if (!query['$or']) {
            query['$or'] = [];
        }
        query['$or'].push(
            {
                'linked_staff.staffId': ObjectId(loggedUser._id)
            },
            {
                'area_manager': loggedUser.emp_code
            },
            {
                'sales_executive': loggedUser.emp_code
            },
            {
                'rbm': loggedUser.emp_code
            },
            {
                'responsibility_matrix.primary_account_manager': loggedUser.emp_code
            },
            {
                'responsibility_matrix.primary_field_coordinator': loggedUser.emp_code
            },
            {
                'responsibility_matrix.primary_biss_development': loggedUser.emp_code
            },
            {
                'responsibility_matrix.primary_technical_services': loggedUser.emp_code
            },
            {
                'responsibility_matrix.primary_product_development': loggedUser.emp_code
            },
            {
                'responsibility_matrix.primary_door_opener': loggedUser.emp_code
            },
            {
                'responsibility_matrix.primary_salesOps': loggedUser.emp_code
            },
            {
                'responsibility_matrix.secondary_account_manager': loggedUser.emp_code
            },
            {
                'responsibility_matrix.secondary_field_coordinator': loggedUser.emp_code
            },
            {
                'responsibility_matrix.secondary_biss_development': loggedUser.emp_code
            },
            {
                'responsibility_matrix.secondary_technical_services': loggedUser.emp_code
            },
            {
                'responsibility_matrix.secondary_product_development': loggedUser.emp_code
            },
            {
                'responsibility_matrix.secondary_door_opener': loggedUser.emp_code
            },
            {
                'responsibility_matrix.secondary_salesOps': loggedUser.emp_code
            },
            {
                'responsibility_matrix.tertiary_account_manager': loggedUser.emp_code
            },
            {
                'responsibility_matrix.tertiary_field_coordinator': loggedUser.emp_code
            },
            {
                'responsibility_matrix.tertiary_biss_development': loggedUser.emp_code
            },
            {
                'responsibility_matrix.tertiary_technical_services': loggedUser.emp_code
            },
            {
                'responsibility_matrix.tertiary_product_development': loggedUser.emp_code
            },
            {
                'responsibility_matrix.tertiary_door_opener': loggedUser.emp_code
            },
            {
                'responsibility_matrix.tertiary_salesOps': loggedUser.emp_code
            },
        );
        // ];
    },

    listBC: () => DataAccess.findAll('business_category', {}),
    listBD: () => DataAccess.findAll('business_division', {}),
    listBG: () => DataAccess.findAll('business_group', {}),
    listCustomerCategory: () => {
        return DataAccess.aggregate('customer_category', {});
    },

    auditActions: () => {
        let AuditAction = {
            create: 'create',
            update: 'update',
            change_status: 'update_status',
            bd_update: 'bd_update',
            bd_flow_id_update:'bd_flow_id_update',
            Delete: 'delete',
            AddNotes: 'notes_add',
            link: 'link',
            userLink: 'user_link',
            unlink: 'unlink',
            approve: 'approve',
            reject: 'reject',
            elapse: 'elapse',
            sync: 'sync',
            login: 'login',
            logout: 'logout',
            forgot_password: 'forgot_password',
            checkIn: 'checkIn',
            reminder: 'reminder',
            punchIn: 'punch_in_out',
        };
        return AuditAction;
    },

    Modules: () => {
        let Module = {
            shceduler: 'scheduler',
            customer: 'customer',
            deals: 'deal',
            lead: 'lead',
            contact: 'contacts',
            supplier: 'supplier',
            user: 'users',
            dealer: 'dealer',
            endProduct: 'endProduct',
            cmr: 'customer_cmr_details',
            bd: 'BD',
            audit: 'audit',
            mobileApp: 'mobile_app',
            webApp: 'web_app',
            counters: 'counters',
            notification: 'notifications',
            notificationTemplates: 'notification_templates',
            customerCategory: 'customer_category',
            RespMatrixConfig: 'resp_matrix_config',
            punchInOut: 'punch_in_out',
        };
        return Module;
    },

    getNextSequenceNumber: async (id) => {
        let resp;
        try {
            const nextSeqId = await DataAccess.findOneAndUpdate(model.Modules().counters, { _id: id }, { $inc: { seq: 1 } });
            console.log('SEQ: ', nextSeqId.value.seq);
            if (id == 'cmr') {
                let CMRNo = `CMR-${nextSeqId.value.seq}`
                if (nextSeqId.value.seq != 10000) { // check only till 10000 number. 
                    const found = await DataAccess.findOne(model.Modules().cmr, { CRM_CMR_No: CMRNo });
                    if (found) {
                        console.log('FOUND !!!', CMRNo);
                        let d = await model.getNextSequenceNumber('cmr')
                        resp = d
                    } else {
                        resp = nextSeqId.value.seq
                    }
                } else {
                    resp = nextSeqId.value.seq
                }
            } else {
                resp = nextSeqId.value.seq
            }
            return resp;
        } catch (error) {
            console.log('SEQ NUMBER ERROR: ', error);
        }
    },

    getLocationName: async (lat, long) => {
        try {
            const resp = await geocoder.reverse({ lat: lat, lon: long })
            return resp;
        } catch (error) {
            throw new Error(error)
        }

    },
    sortByKey: (array, key) => {
        const descendingOrder = array.sort(function (a, b) {
            let x = new Date(a[key]);
            let y = new Date(b[key]);
            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        });
        // return descendingOrder.reverse();
        return descendingOrder;
    },


    formatDate: (dateKey) => {
        let query = [{
            $cond: {
                if: { $and: [{ $ne: [dateKey, ''] }, { $ne: [dateKey, null] }, { $ne: [dateKey, undefined] }] },
                then: {
                    $concat: [
                        {
                            $cond: [
                                {
                                    $lte: [{ $dayOfMonth: dateKey }, 9]
                                },
                                {
                                    $concat: ["0", { $toString: { $dayOfMonth: dateKey } }]
                                },
                                {
                                    $convert: {
                                        input: { $dayOfMonth: dateKey },
                                        to: 'string',
                                        onError: 0
                                    }
                                },
                            ]
                        },
                        '-',
                        {
                            $convert: {
                                input: {
                                    $let: {
                                        vars: {
                                            monthsInString: [, 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']
                                        },
                                        in: {
                                            $arrayElemAt: ['$$monthsInString', { $month: dateKey }]
                                        }
                                    }
                                },
                                to: 'string',
                                onError: 0
                            }
                        },
                        '-',
                        {
                            $convert: {
                                input: { $year: dateKey, },
                                to: 'string',
                                onError: 0
                            }
                        },
                        ', ',
                        {
                            $cond: {
                                if: {
                                    $gt: [{
                                        $hour: {
                                            date: dateKey,
                                            timezone: Config.timeZone
                                        },
                                    }, 12]
                                },
                                then: {
                                    $concat: [
                                        {
                                            $toString: {
                                                $subtract: [{
                                                    $hour: {
                                                        date: dateKey,
                                                        timezone: Config.timeZone
                                                    }
                                                }, 12]
                                            },
                                        },
                                        ':',
                                        {
                                            $toString: {
                                                $cond: [
                                                    {
                                                        $lte: [{
                                                            $minute: {
                                                                date: dateKey,
                                                                timezone: Config.timeZone
                                                            }
                                                        }, 9]
                                                    },
                                                    {
                                                        $concat: ["0", {
                                                            $toString: {
                                                                $minute: {
                                                                    date: dateKey,
                                                                    timezone: Config.timeZone
                                                                }
                                                            }
                                                        }]
                                                    },
                                                    {
                                                        $toString: {
                                                            $minute: {
                                                                date: dateKey,
                                                                timezone: Config.timeZone
                                                            }
                                                        }
                                                    }
                                                ]
                                            }
                                        }, ' PM'
                                    ]
                                },
                                else: {
                                    $concat: [
                                        {
                                            $toString: {
                                                $hour: {
                                                    date: dateKey,
                                                    timezone: Config.timeZone
                                                }
                                            },
                                        }, ':', {
                                            $toString: {
                                                $minute: {
                                                    date: dateKey,
                                                    timezone: Config.timeZone
                                                }
                                            }
                                        }, ' AM'
                                    ]
                                }
                            }
                        }

                    ]
                },
                else: null
            }
        },]
        return query;
    },


    cmrStatus: () => {
        return cmrStatusList;
    },
    getCMRStatusQuery: () => {
        const query = {
            $switch: {
                branches: [
                ],
                default: ""
            }
        };
        for (const status of cmrStatusList) {
            query.$switch.branches.push({ case: { $eq: ['$CMR_Status', status.value] }, then: status.label })
        }

        return query;
    }
};

module.exports = model;


async function getSearchResults(loggedUser, key, params, resp) {
    console.log("params", params);
    let enableContact = true;
    if (params && params.modules && params.modules.length > 0) {
        const item = params.modules.find(item => {return  item.id === 'co' });
        if (!item) {
            enableContact = false;
        }
    }

    let enableCustomer = true;
    if (params && params.modules && params.modules.length > 0) {
        const item = params.modules.find(item => {return  item.id === 'cu' });
        if (!item) {
            enableCustomer = false;
        }
    }
    let enableLead = true;
    if (params && params.modules && params.modules.length > 0) {
        const item = params.modules.find(item => {return  item.id === 'le' });
        if (!item) {
            enableLead = false;
        }
    }
    let enableSchedule = true;
    if (params && params.modules && params.modules.length > 0) {
        const item = params.modules.find(item => {return  item.id === 'sc' });
        if (!item) {
            enableSchedule = false;
        }
    }
    let enableOpportunity = true;
    if (params && params.modules && params.modules.length > 0) {
        const item = params.modules.find(item => {return  item.id === 'op' });
        if (!item) {
            enableOpportunity = false;
        }
    }
    let enableNotes = true;
    if (params && params.modules && params.modules.length > 0) {
        const item = params.modules.find(item => {return  item.id === 'not' });
        if (!item) {
            enableNotes = false;
        }
    }
    let enableStaff = true;
    if (params && params.modules && params.modules.length > 0) {
        const item = params.modules.find(item => {return  item.id === 'ct' });
        if (!item) {
            enableStaff = false;
        }
    }
    if (enableCustomer) {
        await customerResults(loggedUser, key,params, resp);
    }
    if (enableLead) {
        await leadResults(loggedUser, key,params, resp);
    }
    if (enableStaff) {
        await staffResults(loggedUser, key,params, resp);
    }
    if (enableContact) {
        await contactsResults(loggedUser, key,params, resp);
    }
    if (enableSchedule) {
        await schedulerResults(loggedUser, key,params, resp);
    }
    if (enableOpportunity) {
        await routePlanResults(key,params, resp);
    }
    if (enableNotes) {
        await notesResults(loggedUser, key,params, resp);
    }
}

async function notesResults(user, key,params={}, resp) {

    let matchQuery = { $text: { $search: key }, deleted: { $ne: 1 } }
    let filterQuery = {}

    await setFilterQuery(filterQuery, user)

    console.log('FIlter QUERY: ', filterQuery);

    const notes_crieteria = [
        { $match: matchQuery },
        { $match: filterQuery },
        { $lookup: { from: 'customer', localField: 'documentId', foreignField: '_id', as: 'customerDetails' } },
        { $lookup: { from: 'lead', localField: 'documentId', foreignField: '_id', as: 'leadDetails' } },
        { $lookup: { from: 'users', localField: 'documentId', foreignField: '_id', as: 'usersDetails' } },
        { $lookup: { from: 'contacts', localField: 'documentId', foreignField: '_id', as: 'contactsDetails' } },
        { $lookup: { from: 'scheduler', localField: 'documentId', foreignField: '_id', as: 'schedulerDetails' } },
        {
            $addFields: {
                documentName: '$module',
                module: 'notes',
                title: key,
                documentId: '$documentId',
                date: { $arrayElemAt: ['$notes.date', 0] },
                documentTempDetails: {
                    $cond: {
                        if: { $ne: ['$customerDetails', []] },
                        then: '$customerDetails',
                        else: {
                            $cond: {
                                if: { $ne: ['$leadDetails', []] },
                                then: '$leadDetails',
                                else: {
                                    $cond: {
                                        if: { $ne: ['$schedulerDetails', []] },
                                        then: '$schedulerDetails',
                                        else: {
                                            $cond: {
                                                if: { $ne: ['$contactsDetails', []] },
                                                then: '$contactsDetails',
                                                else: {
                                                    $cond: {
                                                        if: { $ne: ['$usersDetails', []] },
                                                        then: '$usersDetails',
                                                        else: []
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
            }
        },
        { $sort: { date: -1 } },
        {
            $project: {
                _id: 1,
                module: 1,
                title: 1,
                documentId: 1,
                documentName: 1,
                date: { $arrayElemAt: [model.formatDate('$date'), 0] },
                documentDetails: {
                    _id: { $arrayElemAt: ['$documentTempDetails._id', 0] },
                    name: {
                        $switch: {
                            branches: [
                                { case: { $eq: ['$documentName', model.Modules().shceduler] }, then: { $arrayElemAt: ['$documentTempDetails.subject', 0] } },
                                { case: { $eq: ['$documentName', model.Modules().customer] }, then: { $arrayElemAt: ['$documentTempDetails.customer_name', 0] } },
                                { case: { $eq: ['$documentName', model.Modules().lead] }, then: { $arrayElemAt: ['$documentTempDetails.lead_name', 0] } },
                                { case: { $eq: ['$documentName', model.Modules().contact] }, then: { $arrayElemAt: ['$documentTempDetails.contact_name', 0] } },
                                { case: { $eq: ['$documentName', model.Modules().user] }, then: { $arrayElemAt: ['$documentTempDetails.first_name', 0] } },
                            ],
                            default: ""
                        }
                    }
                }
            }
        },
    ];
    const notesData = await DataAccess.aggregate('notes', notes_crieteria);
    console.log('notes: ', notesData);
    resp.notes = notesData;
}

async function routePlanResults(key,params={}, resp) {
    const routePlan_crieteria = [
        { $match: { $text: { $search: key }, deleted: { $ne: 1 } } },
        { $addFields: { module: 'routePlan', title: '$subject', } },
        { $sort: { start_date: 1, meeting_date: 1, visit_date: 1, call_start_date: 1, due_date: 1 } },
        { $project: { module: 1, _id: 1, title: 1, start_date: 1, end_date: 1 , } }
    ];
    const routePlanData = await DataAccess.aggregate('routePlan', routePlan_crieteria);
    resp.routePlan = routePlanData;
}

async function schedulerResults(user, key,params={}, resp) {
    let isAdmin = false
    let matchQuery = { $text: { $search: key }, deleted: { $ne: 1 } }
    if (user.group.includes('admin') || user.group.includes('director') || user.group.includes('vp')) {
        isAdmin = true;
    }

    if (!isAdmin) {
        matchQuery['$or'] = [{ assigned_to: { $in: [ObjectId(user._id)] } }, { created_by: { $in: [ObjectId(user._id)] } }];
    }

    const sheduler_crieteria = [
        { $match: matchQuery },
        {
            $addFields: {
                module: 'scheduler',
                title: '$subject',
                dateTemp: {
                    $switch: {
                        branches: [
                            { case: { $and: [{ $eq: ['$type', ObjectId('5aab8d4a9eaf9bce829b5c3c')] }, { $eq: ['$category', ObjectId('5addcb184a3802c94e2fba64')] }] }, then: '$due_date' },
                            { case: { $and: [{ $eq: ['$type', ObjectId('5aab8d4a9eaf9bce829b5c3c')] }, { $eq: ['$category', ObjectId('5addcb0d4a3802c94e2fba63')] }] }, then: '$due_date' },
                            { case: { $and: [{ $eq: ['$type', ObjectId('5aab8d4a9eaf9bce829b5c3c')] }, { $eq: ['$category', ObjectId('5d496ca69f127a27fe299842')] }] }, then: '$due_date' },
                            { case: { $and: [{ $eq: ['$type', ObjectId('5aab8d4a9eaf9bce829b5c3c')] }, { $eq: ['$category', ObjectId('5addcb084a3802c94e2fba62')] }] }, then: '$call_start_date' },
                            { case: { $eq: ['$type', ObjectId('5afbd730fc9609813663b0c2')] }, then: '$meeting_date' },
                            { case: { $eq: ['$type', ObjectId('5a93a2c4152426c79f4bbdc5')] }, then: '$end_date' },
                        ],
                        default: ""
                    }
                }
            }
        },
        { $lookup: { from: 'task_types', localField: 'type', foreignField: '_id', as: 'scheduleTypes' } },
        { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'created_by_details' } },
        { $lookup: { from: 'scheduler_categories', localField: 'category', foreignField: '_id', as: 'scheduleCategories' } },
        { $sort: { start_date: 1, meeting_date: 1, visit_date: 1, call_start_date: 1, due_date: 1 } },
        {
            $project: {
                _id: 1,
                module: 1,
                title: 1,
                
                category:{ $arrayElemAt: ['$scheduleCategories.category', 0] },
                created_by: { $concat: [{ $arrayElemAt: ['$created_by_details.first_name', 0] }, ' ', { $arrayElemAt: ['$created_by_details.last_name', 0] }] },
                assigned_to:{ $arrayElemAt: ['$scheduleCreatedBy.assigned_to', 0] },
                type: { $concat: [{ $arrayElemAt: ['$scheduleTypes.type', 0] }, '-', { $arrayElemAt: ['$scheduleCategories.category', 0] }] },
                date: { $arrayElemAt: [model.formatDate('$dateTemp'), 0] }
            }
        }
    ];
    const schedulerData = await DataAccess.aggregate('scheduler', sheduler_crieteria);
    console.log('schedulerData: ', schedulerData);

    resp.scheduler = schedulerData;
}


async function contactsResults(loggedUser, key, resp) {
    let contact_query = await model.mapContactsQuery(loggedUser, {});
    contact_query['$text'] = { $search: key };
    const contact_crieteria = [
        { $match: contact_query },
        { $addFields: { module: 'contact', title: '$contact_name',email: '$contact_email' } },
        { $lookup: { from: 'area', localField: 'contact_area', foreignField: '_id', as: 'contact_area_details' } },
        { $sort: { modified_At: -1 } },
        { $project: { 
            module: 1,
             _id: 1, 
             title: 1, 
             contact_phone: 1,
             contact_email:1,
             contact_area: { $arrayElemAt: ['$contact_area_details.area', 0] },
             designation:1,
             created_at:1
             } }
    ];
    const contactData = await DataAccess.aggregate('contacts', contact_crieteria);
    resp.contact = contactData;
}

async function staffResults(loggedUser, key,params={}, resp) {
    let users_query = await model.mapUsersQuery(loggedUser, {});
    users_query['$text'] = { $search: key };
    const staff_crieteria = [
        { $match: users_query },
        { $addFields: { module: 'users', title: { $concat: ['$first_name', ' ', '$last_name'] }, } },
        { $sort: { modified_At: -1 } },
        { $project: { module: 1, _id: 1, title: 1, job_title: 1, emp_code: 1 , department:1 , email:1} }
    ];
    const staffData = await DataAccess.aggregate('users', staff_crieteria);
    resp.users = staffData;
}

async function leadResults(loggedUser, key,params={}, resp) {
    let lead_query = await model.mapLeadQuery(loggedUser, {});
    lead_query['$text'] = { $search: key };
    const lead_crieteria = [
        { $match: { $text: { $search: key }, deleted: { $ne: 1 }, isArchived: { $ne: 1 } } },
        { $addFields: { module: 'lead', title: '$lead_name', } },
        { $sort: { modified_At: -1 } },
        {
            $project: {
                module: 1,
                _id: 1,
                title: 1,
                customer_category: 1,
                lead_phone: 1
            }
        },
    ];
    const leadData = await DataAccess.aggregate('lead', lead_crieteria);
    resp.lead = leadData;
}

async function customerResults(loggedUser, key,params={}, resp) {
    let customer_query = await model.mapCustomerQuery(loggedUser, {});

    customer_query['$text'] = { $search: key };
  //  customer_query['customer_id'] = { $in: id };
    const customer_crieteria = [
        { $match: customer_query },
        { $addFields: { module: 'customer', title: '$customer_name', bdStage: '$bdStage' } },
        { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'createdBy_details' } },
        { $lookup: { from: 'area', localField: 'customer_area', foreignField: '_id', as: 'customer_area_details' } },
        { $sort: { modified_At: -1 } },
        {
            $project: {
                module: 1,
                _id: 1,
                title: 1,
                bdStage: 1,
                customer_category: 1,
                customer_phone: 1,
                created_at:1,
                customer_area_name: { $arrayElemAt: ['$customer_area_details.area', 0] },
                created_by: { $concat: [{ $arrayElemAt: ['$createdBy_details.first_name', 0] }, ' ', { $arrayElemAt: ['$createdBy_details.last_name', 0] }] },
            }
        },
    ];
    const customerData = await DataAccess.aggregate('customer', customer_crieteria);
    resp.customer = customerData;
}

const getCustomerIdsToListCMRs = async (loggedUser, query) => {
    let custCrieteria = ([
        {
            $match: {
                deleted: { $ne: 1 },
                $or: [
                    {
                        'linked_staff.staffId': ObjectId(loggedUser._id)
                    },
                    {
                        'area_manager': loggedUser.emp_code
                    },
                    {
                        'sales_executive': loggedUser.emp_code
                    },
                    {
                        'rbm': loggedUser.emp_code
                    },
                    {
                        'responsibility_matrix.primary_account_manager': loggedUser.emp_code
                    },
                    {
                        'responsibility_matrix.primary_field_coordinator': loggedUser.emp_code
                    },
                    {
                        'responsibility_matrix.primary_biss_development': loggedUser.emp_code
                    },
                    {
                        'responsibility_matrix.primary_technical_services': loggedUser.emp_code
                    },
                    {
                        'responsibility_matrix.primary_product_development': loggedUser.emp_code
                    },
                    {
                        'responsibility_matrix.primary_door_opener': loggedUser.emp_code
                    },
                    {
                        'responsibility_matrix.primary_salesOps': loggedUser.emp_code
                    },
                    {
                        'responsibility_matrix.secondary_account_manager': loggedUser.emp_code
                    },
                    {
                        'responsibility_matrix.secondary_field_coordinator': loggedUser.emp_code
                    },
                    {
                        'responsibility_matrix.secondary_biss_development': loggedUser.emp_code
                    },
                    {
                        'responsibility_matrix.secondary_technical_services': loggedUser.emp_code
                    },
                    {
                        'responsibility_matrix.secondary_product_development': loggedUser.emp_code
                    },
                    {
                        'responsibility_matrix.secondary_door_opener': loggedUser.emp_code
                    },
                    {
                        'responsibility_matrix.secondary_salesOps': loggedUser.emp_code
                    },
                    {
                        'responsibility_matrix.tertiary_account_manager': loggedUser.emp_code
                    },
                    {
                        'responsibility_matrix.tertiary_field_coordinator': loggedUser.emp_code
                    },
                    {
                        'responsibility_matrix.tertiary_biss_development': loggedUser.emp_code
                    },
                    {
                        'responsibility_matrix.tertiary_technical_services': loggedUser.emp_code
                    },
                    {
                        'responsibility_matrix.tertiary_product_development': loggedUser.emp_code
                    },
                    {
                        'responsibility_matrix.tertiary_door_opener': loggedUser.emp_code
                    },
                    {
                        'responsibility_matrix.tertiary_salesOps': loggedUser.emp_code
                    },
                ],
            }
        },
        {
            $group: {
                _id: null,
                id: { $push: '$_id' },
            }
        },
        { $project: { _id: 0, id: 1 } }
    ]);

    const customerId = await DataAccess.aggregate('customer', custCrieteria);
    if (customerId.length > 0) {
        query['customer_id'] = { $in: customerId[0].id };
        return customerId[0].id;
    } else {
        return [];
    }
};
const getRegionAreaCustomerIdsToListCMRs = async (loggedUser, module) => {
    const query = { deleted: { $ne: 1 } };
    let region = module + '_region';
    let area = module + '_area';
    let zone = module + '_zone';

    if (!query['$or']) {
        query['$or'] = []
    }
    if (!query['$or'][0]) {
        query['$or'][0] = { $and: [] };
    }

    if (!isEmpty(loggedUser.region)) {
        loggedUser.region.push(ObjectId('5c5a7e24932704b38ec31a96'));
        let loggedUserRegion = loggedUser.region;
        query['$or'][0]['$and'].push({ [region]: { '$in': loggedUserRegion } });
    }

    if (!isEmpty(loggedUser.area)) {
        loggedUser.area.push(ObjectId('5c5ac8c11086f2e73b5ddb66'));
        let loggedUserArea = loggedUser.area;
        query['$or'][0]['$and'].push({ [area]: { '$in': loggedUserArea } });
    }

    if (!isEmpty(loggedUser.zone)) {
        loggedUser.zone.push(ObjectId('5c5ac9021086f2e73b5ddb67'));
        let loggedUserZone = loggedUser.zone;
        query['$or'][0]['$and'].push({ [zone]: { '$in': loggedUserZone } });
    }
    let custCrieteria = ([
        {
            $match: query
        },
        {
            $group: {
                _id: null,
                id: { $push: '$_id' },
            }
        },
        { $project: { _id: 0, id: 1 } }
    ]);
    console.log("query regin", JSON.stringify(query))

    const customerId = await DataAccess.aggregate('customer', custCrieteria);
    if (customerId.length > 0) {
        return customerId[0].id;
    } else {
        return [];
    }
};

function declarePrimaryMatrixVariables(matrixConfigs, cust_category) {
    const primaryAM_Role = matrixConfigs[cust_category].primary.account_manager.role;
    const primaryAM_ACL = matrixConfigs[cust_category].primary.account_manager.access_level;
    const primaryFC_Role = matrixConfigs[cust_category].primary.field_coordinator.role;
    const primaryFC_ACL = matrixConfigs[cust_category].primary.field_coordinator.access_level;
    const primaryBD_Role = matrixConfigs[cust_category].primary.biss_development.role;
    const primaryBD_ACL = matrixConfigs[cust_category].primary.biss_development.access_level;
    const primaryTS_Role = matrixConfigs[cust_category].primary.technical_services.role;
    const primaryTS_ACL = matrixConfigs[cust_category].primary.technical_services.access_level;
    const primaryPD_Role = matrixConfigs[cust_category].primary.product_development.role;
    const primaryPD_ACL = matrixConfigs[cust_category].primary.product_development.access_level;
    const primaryDO_Role = matrixConfigs[cust_category].primary.door_opener.role;
    const primaryDO_ACL = matrixConfigs[cust_category].primary.door_opener.access_level;
    const primarySO_Role = matrixConfigs[cust_category].primary.salesOps.role;
    const primarySO_ACL = matrixConfigs[cust_category].primary.salesOps.access_level;
    let primaryAMuserData = [];
    let primaryFCuserData = [];
    let primaryBDuserData = [];
    let primaryTSuserData = [];
    let primaryPDuserData = [];
    let primaryDOuserData = [];
    let primarySOuserData = [];
    let primaryAMuserDataBuisnessunitFiltered = [];
    let primaryFCuserDataBuisnessunitFiltered = [];
    let primaryBDuserDataBuisnessunitFiltered = [];
    let primaryTSuserDataBuisnessunitFiltered = [];
    let primaryPDuserDataBuisnessunitFiltered = [];
    let primaryDOuserDataBuisnessunitFiltered = [];
    let primarySOuserDataBuisnessunitFiltered = [];
    return {
        primaryAM_Role, primaryAM_ACL,
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
        primarySOuserData,
        primaryAMuserDataBuisnessunitFiltered,
        primaryFCuserDataBuisnessunitFiltered,
        primaryBDuserDataBuisnessunitFiltered,
        primaryTSuserDataBuisnessunitFiltered,
        primaryPDuserDataBuisnessunitFiltered,
        primaryDOuserDataBuisnessunitFiltered,
        primarySOuserDataBuisnessunitFiltered
    };
}

function declareSecondaryMatrixVariables(matrixConfigs, cust_category) {
    const secondaryAM_Role = matrixConfigs[cust_category].secondary.account_manager.role;
    const secondaryAM_ACL = matrixConfigs[cust_category].secondary.account_manager.access_level;
    const secondaryFC_Role = matrixConfigs[cust_category].secondary.field_coordinator.role;
    const secondaryFC_ACL = matrixConfigs[cust_category].secondary.field_coordinator.access_level;
    const secondaryBD_Role = matrixConfigs[cust_category].secondary.biss_development.role;
    const secondaryBD_ACL = matrixConfigs[cust_category].secondary.biss_development.access_level;
    const secondaryTS_Role = matrixConfigs[cust_category].secondary.technical_services.role;
    const secondaryTS_ACL = matrixConfigs[cust_category].secondary.technical_services.access_level;
    const secondaryPD_Role = matrixConfigs[cust_category].secondary.product_development.role;
    const secondaryPD_ACL = matrixConfigs[cust_category].secondary.product_development.access_level;
    const secondaryDO_Role = matrixConfigs[cust_category].secondary.door_opener.role;
    const secondaryDO_ACL = matrixConfigs[cust_category].secondary.door_opener.access_level;
    const secondarySO_Role = matrixConfigs[cust_category].secondary.salesOps.role;
    const secondarySO_ACL = matrixConfigs[cust_category].secondary.salesOps.access_level;
    let secondaryAMuserData = [];
    let secondaryFCuserData = [];
    let secondaryBDuserData = [];
    let secondaryTSuserData = [];
    let secondaryPDuserData = [];
    let secondaryDOuserData = [];
    let secondarySOuserData = [];
    let secondaryAMuserDataBuisnessunitFiltered = [];
    let secondaryFCuserDataBuisnessunitFiltered = [];
    let secondaryBDuserDataBuisnessunitFiltered = [];
    let secondaryTSuserDataBuisnessunitFiltered = [];
    let secondaryPDuserDataBuisnessunitFiltered = [];
    let secondaryDOuserDataBuisnessunitFiltered = [];
    let secondarySOuserDataBuisnessunitFiltered = [];
    return {
        secondaryAM_Role, secondaryAM_ACL,
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
        secondarySOuserData,
        secondaryAMuserDataBuisnessunitFiltered,
        secondaryFCuserDataBuisnessunitFiltered,
        secondaryBDuserDataBuisnessunitFiltered,
        secondaryTSuserDataBuisnessunitFiltered,
        secondaryPDuserDataBuisnessunitFiltered,
        secondaryDOuserDataBuisnessunitFiltered,
        secondarySOuserDataBuisnessunitFiltered
    };
}

function declareTertiaryMatrixVariables(matrixConfigs, cust_category) {
    const tertiaryAM_Role = matrixConfigs[cust_category].tertiary.account_manager.role;
    const tertiaryAM_ACL = matrixConfigs[cust_category].tertiary.account_manager.access_level;
    const tertiaryFC_Role = matrixConfigs[cust_category].tertiary.field_coordinator.role;
    const tertiaryFC_ACL = matrixConfigs[cust_category].tertiary.field_coordinator.access_level;
    const tertiaryBD_Role = matrixConfigs[cust_category].tertiary.biss_development.role;
    const tertiaryBD_ACL = matrixConfigs[cust_category].tertiary.biss_development.access_level;
    const tertiaryTS_Role = matrixConfigs[cust_category].tertiary.technical_services.role;
    const tertiaryTS_ACL = matrixConfigs[cust_category].tertiary.technical_services.access_level;
    const tertiaryPD_Role = matrixConfigs[cust_category].tertiary.product_development.role;
    const tertiaryPD_ACL = matrixConfigs[cust_category].tertiary.product_development.access_level;
    const tertiaryDO_Role = matrixConfigs[cust_category].tertiary.door_opener.role;
    const tertiaryDO_ACL = matrixConfigs[cust_category].tertiary.door_opener.access_level;
    const tertiarySO_Role = matrixConfigs[cust_category].tertiary.salesOps.role;
    const tertiarySO_ACL = matrixConfigs[cust_category].tertiary.salesOps.access_level;
    let tertiaryAMuserData = [];
    let tertiaryFCuserData = [];
    let tertiaryBDuserData = [];
    let tertiaryTSuserData = [];
    let tertiaryPDuserData = [];
    let tertiaryDOuserData = [];
    let tertiarySOuserData = [];
    let tertiaryAMuserDataBuisnessunitFiltered = [];
    let tertiaryFCuserDataBuisnessunitFiltered = [];
    let tertiaryBDuserDataBuisnessunitFiltered = [];
    let tertiaryTSuserDataBuisnessunitFiltered = [];
    let tertiaryPDuserDataBuisnessunitFiltered = [];
    let tertiaryDOuserDataBuisnessunitFiltered = [];
    let tertiarySOuserDataBuisnessunitFiltered = [];
    return {
        tertiaryAM_Role, tertiaryAM_ACL,
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
        tertiarySOuserData,
        tertiaryAMuserDataBuisnessunitFiltered,
        tertiaryFCuserDataBuisnessunitFiltered,
        tertiaryBDuserDataBuisnessunitFiltered,
        tertiaryTSuserDataBuisnessunitFiltered,
        tertiaryPDuserDataBuisnessunitFiltered,
        tertiaryDOuserDataBuisnessunitFiltered,
        tertiarySOuserDataBuisnessunitFiltered
    };
}

async function setFilterQuery(query, user) {
    let filteredObjectIds = []
    let isAdmin = false
    if (user.group.includes('admin') || user.group.includes('director') || user.group.includes('vp')) {
        isAdmin = true;
    }

    if (!isAdmin) {
        filteredObjectIds.push(ObjectId(user._id))
        filteredObjectIds.push(ObjectId(user._id))
    }

    console.log('QUERY 1: ', query);

    let customer_query = await model.mapCustomerQuery(user, {});
    const customers = await DataAccess.findAll(model.Modules().customer, customer_query)
    let customerIds = []
    if (customers && customers.length > 0) {
        for (const i of customers) {
            customerIds.push(i._id)
        }
    }
    if (customerIds.length > 0) {
        filteredObjectIds = [...filteredObjectIds, ...customerIds]
    }

    let lead_query = await model.mapLeadQuery(user, {});
    const leads = await DataAccess.findAll(model.Modules().lead, lead_query)
    let leadsIds = []
    if (leads && leads.length > 0) {
        for (const i of leads) {
            customerIds.push(i._id)
        }
    }
    if (leadsIds.length > 0) {
        filteredObjectIds = [...filteredObjectIds, ...leadsIds]
    }

    let contacts_query = await model.mapContactsQuery(user, {});
    const contacts = await DataAccess.findAll(model.Modules().contact, contacts_query)
    let contactIds = []
    if (contacts && contacts.length > 0) {
        for (const i of contacts) {
            customerIds.push(i._id)
        }
    }
    if (contactIds.length > 0) {
        filteredObjectIds = [...filteredObjectIds, ...contactIds]
    }

    let staffs_query = await model.mapUsersQuery(user, {});
    const staffs = await DataAccess.findAll(model.Modules().user, staffs_query)
    let staffIds = []
    if (staffs && staffs.length > 0) {
        for (const i of staffs) {
            customerIds.push(i._id)
        }
    }
    if (staffIds.length > 0) {
        filteredObjectIds = [...filteredObjectIds, ...staffIds]
    }

    query['documentId'] = { $in: filteredObjectIds }
    // console.log('QUERY 2: ', query);


}
