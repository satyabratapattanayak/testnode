const ObjectId = require('mongodb').ObjectID;
const { isEmpty, first, isArray, isUndefined, isNil, isNull } = require('lodash');
const { customer_category_color } = require('../../config/dynamic_color_&_icon/customer');
const { getCustomerIdsToListCMR } = require('../shared/shared.controller');
const notesModel = require('../notes/notes.model.js');
const getCustomerModelDetails = require('../customers/customer.model.js');
const {
    mapCMRQuery,
    formatDate,
    mapCustomerQuery,
    mapLeadQuery,
    setCMRapprovalStatus,
    setApprovalStageQuery,
    mapResMatrix,
    mapBDandCMR_Query,
    mapBDQuery,
    mapResMatrixForBDandCMR,
    checkDatalListingPermission
} = require('../shared/shared.model');

const {
    getTodayStartTime,
    getTodayEndTime,
    getWeekFirstDay,
    getWeekLastDay,
    getMonthFirstDay,
    getMonthLastDay,
    getYearFirstDay,
    getYearLastDay,
    getMonthName
} = require('../../config/dateutil');
const DataAccess = require('../../helpers/DataAccess');
const acl = require('../../service/acl');
const database = require('../../service/database');
const RajeshPrabhuImportedData = ObjectId('5a858080e6e8f6724d6aa54f')
let mydb;
database.getDb().then(res => {
    mydb = res;
});

const countData = async (lead) => {
    let data = [];
    let jan = 0, feb = 0, mar = 0, april = 0, may = 0, jun = 0,
        july = 0, aug = 0, sept = 0, oct = 0, nov = 0, dec = 0;
    await lead.forEach(element => {
        let key = new Date(element.created_at).getMonth() + 1; // javascript month starts from 0
        switch (key) {
            case 1: jan++; break;
            case 2: feb++; break;
            case 3: mar++; break;
            case 4: april++; break;
            case 5: may++; break;
            case 6: jun++; break;
            case 7: july++; break;
            case 8: aug++; break;
            case 9: sept++; break;
            case 10: oct++; break;
            case 11: nov++; break;
            case 12: dec++; break;
            default: break;
        }
    });
    return data = [jan, feb, mar, april, may, jun, july, aug, sept, oct, nov, dec];
};

const formatLeadRegistrationResponse = async (data, customer_category) => {
    let response = {};
    const leadCounts = await countData(data);
    response = {
        label: customer_category,
        data: leadCounts,
        fill: false,
        lineTension: 0.2,
        borderWidth: 3,
        borderColor: customer_category_color(customer_category)
    };
    return response;
};


const setBDFlowQuery = (query, bdStage) => {
    switch (bdStage) {
        case 's1': query['bd_flow'] = { $eq: 'SUBMIT_S1_APPROVAL' };
            break;
        case 's2': query['bd_flow'] = { $eq: 'SUBMIT_S2_APPROVAL' };
            break;
        case 's3': query['bd_flow'] = { $eq: 'SUBMIT_S3_APPROVAL' };
            break;
        case 's4': query['bd_flow'] = { $eq: 'SUBMIT_S4_APPROVAL' };
            break;
        default:
            break;
    }
};


const getLeadsCount = async (loggedUser) => {
    try {
        let leadQuery = await mapLeadQuery(loggedUser, null);

        const LeadCrieteria = ([
            { $match: leadQuery },
            
            { $match: {customer_code : { $exists: true, "$eq": "" }} } ,
            
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 }
                }
            },
            {
                $addFields: {
                    percentage: ''
                }
            },
            {
                $project: {
                    _id: 0
                }
            }
        ]);
        let lead = await DataAccess.aggregate('lead', LeadCrieteria);

        if (isEmpty(lead)) {
            lead = [{ count: 0, percentage: '' }];
        }

        return lead[0];
    } catch (error) {
        throw new Error(error);
    }
};

const model = {
    cardsCount: async (loggedUser) => {
        try {
            let response = {};
            response.leads = await getLeadsCount(loggedUser);


            let query = await mapCustomerQuery(loggedUser, null);
            const crieteria = ([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 }
                    }
                },
                {
                    $addFields: {
                        percentage: ''
                    }
                },
                {
                    $project: {
                        _id: 0
                    }
                }
            ]);

            console.log('WIDGET :: customer all list: ', query);


            let customer = await DataAccess.aggregate('customer', crieteria);
            if (isEmpty(customer)) {
                customer = [{ count: 0, percentage: '' }];
            }
            response.customertotal = customer[0];

            query['customer_category'] = { $eq: 'GOLD' };
            let goldcustomer = await DataAccess.aggregate('customer', crieteria);
            if (isEmpty(goldcustomer)) {
                goldcustomer = [{ count: 0, percentage: '' }];
            }
            response.goldcustomer = goldcustomer[0];
            query['customer_category'] = { $eq: 'BLUE' };

            let bluecustomer = await DataAccess.aggregate('customer', crieteria);
            if (isEmpty(bluecustomer)) {
                bluecustomer = [{ count: 0, percentage: '' }];
            }
            response.bluecustomer = bluecustomer[0];

            query['customer_category'] = { $eq: 'PALLADIUM' };
            let palladiumcustomer = await DataAccess.aggregate('customer', crieteria);
            if (isEmpty(palladiumcustomer)) {
                palladiumcustomer = [{ count: 0, percentage: '' }];
            }
            response.palladiumcustomer = palladiumcustomer[0];

            query['customer_category'] = { $eq: 'PLATINUM' };
            let platinumcustomer = await DataAccess.aggregate('customer', crieteria);
            if (isEmpty(platinumcustomer)) {
                platinumcustomer = [{ count: 0, percentage: '' }];
            }
            response.platinumcustomer = platinumcustomer[0];


            query['customer_category'] = { $eq: 'SILVER' };
            let silvercustomer = await DataAccess.aggregate('customer', crieteria);
            if (isEmpty(silvercustomer)) {
                silvercustomer = [{ count: 0, percentage: '' }];
            }
            response.silvercustomer = silvercustomer[0];

            // let bdQuery = mapBDandCMR_Query(loggedUser, null);
            let bdQuery = await mapBDQuery(loggedUser, null)
            bdQuery['bdStage'] = { $exists: true };

            const bd_crieteria = [
                { $match: bdQuery },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 }
                    }
                },
                {
                    $addFields: {
                        percentage: ''
                    }
                },
                {
                    $project: {
                        _id: 0
                    }
                }
            ];

            let bdActivity = await DataAccess.aggregate('customer', bd_crieteria);
            if (isEmpty(bdActivity)) {
                bdActivity = [{ count: 0, percentage: '' }];
            }
            response.bdactivity = bdActivity[0];

            const schedule_criteria = [
                {
                    $match: {
                        deleted: { $ne: 1 },
                        assigned_to: { $in: [loggedUser._id] },
                        $or: [
                            {
                                $and: [
                                    { start_date: { $gte: getTodayStartTime() } },
                                    { start_date: { $lte: getTodayEndTime() } }
                                ]
                            },
                            {
                                $and: [
                                    { due_date: { $gte: getTodayStartTime() } },
                                    { due_date: { $lte: getTodayEndTime() } }
                                ]
                            },
                            {
                                $and: [
                                    { visit_date: { $gte: getTodayStartTime() } },
                                    { visit_date: { $lte: getTodayEndTime() } }
                                ]
                            },
                            {
                                $and: [
                                    { call_start_date: { $gte: getTodayStartTime() } },
                                    { call_start_date: { $lte: getTodayEndTime() } }
                                ]
                            },
                            {
                                $and: [
                                    { meeting_date: { $gte: getTodayStartTime() } },
                                    { meeting_date: { $lte: getTodayEndTime() } }
                                ]
                            }
                        ]
                    }
                },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 }
                    }
                },
                {
                    $addFields: {
                        percentage: ''
                    }
                },
                {
                    $project: {
                        _id: 0
                    }
                }
            ];
            // query['$or'].push({ start_date: { $eq: new Dateif (isEmpty(schedule)) { schedule = [{ count: 0, percentage: '' }]; }() } }, { visit_date: { $eq: new Date() } }, { due_date: { $eq: new Date() } });
            let schedule = await DataAccess.aggregate('scheduler', schedule_criteria);
            if (isEmpty(schedule)) {
                schedule = [{ count: 0, percentage: '' }];
            }
            response.schedule = schedule[0];
            return response;
        } catch (error) {
            throw new Error(error);
        }
    },

    bdActivity: async (params, loggedUser) => {
        try {
            let query = { deleted: { $ne: 1 } };

            let aclPermissions = acl.getAclQueryPermissions('customer_cmr_details', 'view', loggedUser);
            query['opportunityStage'] = { $exists: true };

            if (params && params.bd_stage) {
                query['opportunityStage'] = { $eq: params.bd_stage };
            }
            // query['$and'] = [
            //     { created_at: { $gte: getTodayStartTime() } },
            //     { created_at: { $lte: getTodayEndTime() } }
            // ];
            // mapResMatrixForBDandCMR(query, aclPermissions, loggedUser);
            // mapBDandCMR_Query(loggedUser, query);
            await mapBDQuery(loggedUser, query);
            // console.log('widget bd activity query: ', JSON.stringify(query));
            const crieteria = [
                { $sort: { modified_At: -1 } },
                { $match: query },
                { $limit: 10 },
                { $project: {customer_id: 1, customer_name: 1, bdStage: 1 } }];
            const data = await DataAccess.aggregate('customer_cmr_details', crieteria);

            return data;
        } catch (error) {
            throw new Error(error);
        }
    },
    bdBucket: async loggedUser => {
        try {
            let query = {
                deleted: { $ne: 1 },
                bdStage: { $exists: true },
                bd_activity: { $exists: true }
            };
            let aclPermissions = acl.getAclQueryPermissions('customer', 'view', loggedUser);
            await mapBDQuery(loggedUser, query)

            const s1Crieteria1 = [
                { $match: query },
                { $project: { customer_name: 1, bdStage: 1, bd_activity: 1 } }
            ];
            const s1Data = await DataAccess.aggregate('customer', s1Crieteria1);
            return s1Data;
        } catch (error) {
            console.log("error", error);
            throw new Error(error);
        }
    },

    bdWaitingForApproval: async (params, loggedUser) => {
        try {
            let query = { deleted: { $ne: 1 } };

            let aclPermissions = acl.getAclQueryPermissions('customer', 'view', loggedUser);

            if (params && params.bd_stage) {
                setBDFlowQuery(query, params.bd_stage);
            }

            query['$or'] = [
                { 'acl_meta.permissions': { $in: aclPermissions } },
                { 'acl_meta.users': { $in: [loggedUser._id.toString()] } }
            ];
            // console.log('widget bd activity query: ', JSON.stringify(query));
            const crieteria = [
                { $match: query },
                { $project: { customer_name: 1, bdStage: 1, bd_flow: 1 } }
            ];
            const data = await DataAccess.aggregate('customer', crieteria);

            return data;
        } catch (error) {
            throw new Error(error);
        }
    },

    CMR_WaitingForApproval: async (params, loggedUser) => {
        try {
            let customerIds = await getCustomerIdsToListCMR(loggedUser);

            // let query = { deleted: { $ne: true }, customer_id: { $in: customerIds }, };
            let query = { deleted: { $ne: true }, };

            let canlListAllCMR = checkDatalListingPermission(loggedUser.group).cmr;

            if (!canlListAllCMR) {
                let customerIds = await getCustomerIdsToListCMR(loggedUser, query);
                query['customer_id'] = { $in: customerIds }

            }
            setApprovalStageQuery(query, loggedUser, '$or');
            console.log('WIDGET::CMR awaiting approval : ', JSON.stringify(query));
            const crieteria = [
                { $sort: { modified_At: -1 } },
                {
                    $addFields: {
                        customer_id: {
                            $convert: {
                                input: '$customer_id',
                                to: 'objectId',
                                onError: 0
                            }
                        }
                    }
                },
                { $match: query },
                { $limit: 10 },

                {
                    '$lookup': {
                        from: 'users',
                        let: {
                            user: {
                                $cond: {
                                    if: { $ne: ['$Requested_By', ''] },
                                    then: '$Requested_By',
                                    else: undefined
                                }
                            },
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $eq: ['$emp_code', '$$user']
                                            },
                                        ],
                                    }
                                }
                            }
                        ],
                        as: 'Requested_By_Details'
                    }
                },

                {
                    $addFields: {
                        requestedByFname: { $arrayElemAt: ['$Requested_By_Details.first_name', 0] },
                        requestedByLname: { $arrayElemAt: ['$Requested_By_Details.last_name', 0] },
                    }
                },

                {
                    $project: {
                        customer_id: 1,
                        CRM_CMR_No: 1,
                        customer_name: 1,
                        Customer_Category: 1,
                        Product_Group: 1,
                        CMR_Status: 1,
                        Requested_By: { $concat: ['$requestedByFname', ' ', '$requestedByLname'] },
                        Approved_By: 1,
                        Application: 1,
                        Customer_Sample_sent_Date: 1,
                        CMR_receipt_Date: 1,
                        Requested_Date: 1,
                        customer_quantity_requirement: 1,
                        deleted: 1,
                        approvalStage: 1,
                        status: 1
                    }
                },
                { $sort: { customerName: 1 } },

            ];
            const data = await DataAccess.aggregate('customer_cmr_details', crieteria);
            // await setCMRapprovalStatus(data);
            return data;
        } catch (error) {
            throw new Error(error);
        }
    },



    CMR_SampleSentToCustomer: async (params, loggedUser) => {
        try {
            let query = { deleted: { $ne: true }, CMR_Status: 18 }
            query = await mapCMRQuery(loggedUser, query);
            console.log('WIDGET::CMR_SampleSentToCustomer : ', JSON.stringify(query));
            const crieteria = [
                { $sort: { modified_At: -1 } },
                { $match: query },
                { $limit: 10 },
                {
                    $project: {
                        CRM_CMR_No: 1,
                        customer_name: 1,
                        CMR_Status: 1,
                    }
                },
            ];
            const data = await DataAccess.aggregate('customer_cmr_details', crieteria);
            return data;
        } catch (error) {
            throw new Error(error);
        }
    },



   lead: async loggedUser => {
        try {

            let query = await mapLeadQuery(loggedUser, null);
            const customer_crieteria = [
                { $sort: { created_at: -1 } },
                { $match : { data_type : "lead"} },
                {
                    $addFields: {
                        lead_region: {
                            $convert: {
                                input: '$lead_region',
                                to: 'objectId',
                                onError: 0
                            }
                        },
                        lead_area: {
                            $convert: {
                                input: '$lead_area',
                                to: 'objectId',
                                onError: 0
                            }
                        },
                        lead_zone: {
                            $convert: {
                                input: '$lead_zone',
                                to: 'objectId',
                                onError: 0
                            }
                        },
                    }
                },
                { $match: query },
                { $limit: 10 },
                { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'creator_details' } },
                {
                    $unwind: {
                        path: '$creator_details',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $addFields: {
                        created_by: {
                            $concat: [
                                '$creator_details.first_name',
                                ' ',
                                '$creator_details.last_name'
                            ]
                        },
                    }
                },
                {
                    $project: {
                        customer_name: 1,
                        customer_city: 1,
                        crm_division: 1,
                        created_by: 1,
                        created_at: 1
                    }
                }
            ];
            const data = await DataAccess.aggregate('customer', customer_crieteria);

            return data;
        } catch (error) {
            throw new Error(error);
        }
    },
    upcomingSchedule: async loggedUser => {

        try {
            const customer_crieteria = [
                {
                    $match: {
                        deleted: { $ne: 1 },
                        assigned_to: { $in: [loggedUser._id] },
                        $or: [
                            {
                                $and: [
                                    { start_date: { $gte: getWeekFirstDay() } },
                                    { start_date: { $lte: getWeekLastDay() } }
                                ]
                            },
                            {
                                $and: [
                                    { due_date: { $gte: getWeekFirstDay() } },
                                    { due_date: { $lte: getWeekLastDay() } }
                                ]
                            },
                            {
                                $and: [
                                    { visit_date: { $gte: getWeekFirstDay() } },
                                    { visit_date: { $lte: getWeekLastDay() } }
                                ]
                            },
                            {
                                $and: [
                                    { call_start_date: { $gte: getWeekFirstDay() } },
                                    { call_start_date: { $lte: getWeekLastDay() } }
                                ]
                            },
                            {
                                $and: [
                                    { meeting_date: { $gte: getWeekFirstDay() } },
                                    { meeting_date: { $lte: getWeekLastDay() } }
                                ]
                            }
                        ]
                    },

                },
                { $lookup: { from: 'task_types', localField: 'type', foreignField: '_id', as: 'schedule_types' } },
                {
                    $project: {
                        subject: 1,
                        start_date: { $arrayElemAt: [formatDate('$start_date'), 0] },
                        due_date: { $arrayElemAt: [formatDate('$due_date'), 0] },
                        meeting_date: { $arrayElemAt: [formatDate('$meeting_date'), 0] },
                        type: 1,
                        type_name: {
                            $cond: {
                                if: { $ne: ['$schedule_types', []] },
                                then: { $arrayElemAt: ['$schedule_types.type', 0] },
                                else: null
                            }
                        },
                    }
                }
            ];
            const data = await DataAccess.aggregate('scheduler', customer_crieteria);

            return data;
        } catch (error) {
            throw new Error(error);
        }
    },

    schedule: async loggedUser => {

        try {
            const customer_crieteria = [
                {
                    $match: {
                        deleted: { $ne: 1 },
                        assigned_to: { $in: [loggedUser._id] },
                        $or: [
                            {
                                $and: [
                                    { start_date: { $gte: getTodayStartTime() } },
                                    { start_date: { $lte: getTodayEndTime() } }
                                ]
                            },
                            {
                                $and: [
                                    { due_date: { $gte: getTodayStartTime() } },
                                    { due_date: { $lte: getTodayEndTime() } }
                                ]
                            },
                            {
                                $and: [
                                    { visit_date: { $gte: getTodayStartTime() } },
                                    { visit_date: { $lte: getTodayEndTime() } }
                                ]
                            },
                            {
                                $and: [
                                    { call_start_date: { $gte: getTodayStartTime() } },
                                    { call_start_date: { $lte: getTodayEndTime() } }
                                ]
                            },
                            {
                                $and: [
                                    { meeting_date: { $gte: getTodayStartTime() } },
                                    { meeting_date: { $lte: getTodayEndTime() } }
                                ]
                            }
                        ]
                    },

                },
                { $lookup: { from: 'task_types', localField: 'type', foreignField: '_id', as: 'schedule_types' } },
                {
                    $project: {
                        subject: 1,
                        start_date: { $arrayElemAt: [formatDate('$start_date'), 0] },
                        due_date: { $arrayElemAt: [formatDate('$due_date'), 0] },
                        meeting_date: { $arrayElemAt: [formatDate('$meeting_date'), 0] },
                        type: 1,
                        type_name: {
                            $cond: {
                                if: { $ne: ['$schedule_types', []] },
                                then: { $arrayElemAt: ['$schedule_types.type', 0] },
                                else: null
                            }
                        },
                    }
                }
            ];
            const data = await DataAccess.aggregate('scheduler', customer_crieteria);

            return data;
        } catch (error) {
            throw new Error(error);
        }
    },

  todayStats: async loggedUser => {
        try {
            let response = {};
            let query = { deleted: { $ne: 1 } };

            let aclPermissions = acl.getAclQueryPermissions('customer', 'view', loggedUser);
            let aclPermissions1 = acl.getAclQueryPermissions('customer', 'view', loggedUser);
            let allPermissions = [...aclPermissions, ...aclPermissions1];
            query['$and'] = [
                { created_at: { $gte: getTodayStartTime() } },
                { created_at: { $lte: getTodayEndTime() } }
            ];
            query['$or'] = [
                { 'acl_meta.permissions': { $in: allPermissions } },
                { 'acl_meta.users': { $in: [loggedUser._id.toString()] } }
            ];

            const crieteria = [
                
                { $match: {customer_code : { $exists: true, "$ne": "" }} },
                

                { $match: query },

                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 }
                    }
                },
                {
                    $addFields: {
                        percentage: ''
                    }
                },
                {
                    $project: {
                        _id: 0
                    }
                }
            ];

            const leadCrieteria = [
              
                { $match: {customer_code : { $exists: true, "$eq": "" }} },

                { $match: query },

                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 }
                    }
                },
                {
                    $addFields: {
                        percentage: ''
                    }
                },
                {
                    $project: {
                        _id: 0
                    }
                }
            ];

            let lead = await DataAccess.aggregate('customer', leadCrieteria);
            if (isEmpty(lead)) {
                lead = [{ count: 0, percentage: '' }];
            }
            response.leads = lead[0];
            let customer = await DataAccess.aggregate('customer', crieteria);
            if (isEmpty(customer)) {
                customer = [{ count: 0, percentage: '' }];
            }
            response.customers = customer[0];

            await todayStats_cmr(loggedUser, response);

            return response;
        } catch (error) {
            throw new Error(error);
        }
    },
    weekStats: async loggedUser => {
        try {
            let response = {};
            let query = { deleted: { $ne: 1 } };

            let aclPermissionsCustomer = acl.getAclQueryPermissions('customer', 'view', loggedUser);
            let aclPermissionsLead = acl.getAclQueryPermissions('lead', 'view', loggedUser);
            let allPermissions = [...aclPermissionsCustomer, ...aclPermissionsLead];

            query['$and'] = [
                { created_at: { $gte: getWeekFirstDay() } },
                { created_at: { $lte: getWeekLastDay() } },
                
            ];
            query['$or'] = [
                { 'acl_meta.permissions': { $in: allPermissions } },
                { 'acl_meta.users': { $in: [loggedUser._id.toString()] } }
            ];

            const crieteria = [
                { $match: query },
                { $match: {customer_code : { $exists: true, "$ne": "" }} },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 }
                    }
                },
                {
                    $addFields: {
                        percentage: ''
                    }
                },
                {
                    $project: {
                        _id: 0
                    }
                }
            ];

            const leadCrieteria = [
                { $match: query },

                { $match: {customer_code : { $exists: true, "$eq": "" }} },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 }
                    }
                },
                {
                    $addFields: {
                        percentage: ''
                    }
                },
                {
                    $project: {
                        _id: 0
                    }
                }
            ];

            let lead = await DataAccess.aggregate('customer', leadCrieteria);
            if (isEmpty(lead)) {
                lead = [{ count: 0, percentage: '' }];
            }
            response.leads = lead[0];

            let customer = await DataAccess.aggregate('customer', crieteria);
            if (isEmpty(customer)) {
                customer = [{ count: 0, percentage: '' }];
            }
            response.customers = customer[0];

            await weeklyStats_cmr(loggedUser, response);

            return response;
        } catch (error) {
            throw new Error(error);
        }
    },
    monthStats: async loggedUser => {
        try {
            let response = {};
            let query = { deleted: { $ne: 1 } };

            let aclPermissionsCustomer = acl.getAclQueryPermissions('customer', 'view', loggedUser);
            let aclPermissionsLead = acl.getAclQueryPermissions('lead', 'view', loggedUser);
            let allPermissions = [...aclPermissionsCustomer, ...aclPermissionsLead];

            query['$and'] = [
                { created_at: { $gte: getMonthFirstDay() } },
                { created_at: { $lte: getMonthLastDay() } }
            ];
            query['$or'] = [
                { 'acl_meta.permissions': { $in: allPermissions } },
                { 'acl_meta.users': { $in: [loggedUser._id.toString()] } }
            ];

            const crieteria = [
                { $match: query },

               { $match: {customer_code : { $exists: true, "$ne": "" }} },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 }
                    }
                },
                {
                    $addFields: {
                        percentage: ''
                    }
                },
                {
                    $project: {
                        _id: 0
                    }
                }
            ];
            const leadCrieteria = [
                { $match: query },

                { $match: {customer_code : { $exists: true, "$eq": "" }} },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 }
                    }
                },
                {
                    $addFields: {
                        percentage: ''
                    }
                },
                {
                    $project: {
                        _id: 0
                    }
                }
            ];

            // console.log('todays Stats:: lead query : ', JSON.stringify(query));

            let lead = await DataAccess.aggregate('cutsomer', leadCrieteria);
            if (isEmpty(lead)) {
                lead = [{ count: 0, percentage: '' }];
            }
            response.leads = lead[0];

            // console.log('todays Stats:: customer query: ', JSON.stringify(query));
            let customer = await DataAccess.aggregate('customer', crieteria);
            if (isEmpty(customer)) {
                customer = [{ count: 0, percentage: '' }];
            }
            response.customers = customer[0];
            await monthlyStats_cmr(loggedUser, response);

            return response;
        } catch (error) {
            throw new Error(error);
        }
    },
    quarterlyStats: async loggedUser => {
        try {
            let response = {};
            let query = { deleted: { $ne: 1 } };

            let aclPermissionsCustomer = acl.getAclQueryPermissions('customer', 'view', loggedUser);
            let aclPermissionsLead = acl.getAclQueryPermissions('lead', 'view', loggedUser);
            let allPermissions = [...aclPermissionsCustomer, ...aclPermissionsLead];

            query['$and'] = [
                { created_at: { $gte: getWeekFirstDay() } },
                { created_at: { $lte: getWeekLastDay() } }
            ];
            query['$or'] = [
                { 'acl_meta.permissions': { $in: allPermissions } },
                { 'acl_meta.users': { $in: [loggedUser._id.toString()] } }
            ];

            const crieteria = [
                { $match: query },
                { $match: {customer_code : { $exists: true, "$ne": "" }} },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 }
                    }
                },
                {
                    $addFields: {
                        percentage: ''
                    }
                },
                {
                    $project: {
                        _id: 0
                    }
                }
            ];
            const leadCrieteria = [
                { $match: query },
                { $match: {customer_code : { $exists: true, "$eq": "" }} },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 }
                    }
                },
                {
                    $addFields: {
                        percentage: ''
                    }
                },
                {
                    $project: {
                        _id: 0
                    }
                }
            ];

            // console.log('todays Stats:: lead query : ', JSON.stringify(query));
            let lead = await DataAccess.aggregate('customer', leadCrieteria);
            if (isEmpty(lead)) {
                lead = [{ count: 0, percentage: '' }];
            }
            response.leads = lead[0];

            // console.log('todays Stats:: customer query: ', JSON.stringify(query));
            let customer = await DataAccess.aggregate('customer', crieteria);
            if (isEmpty(customer)) {
                customer = [{ count: 0, percentage: '' }];
            }
            response.customers = customer[0];
            await quaterlyStats_cmr(loggedUser, response);

            return response;
        } catch (error) {
            throw new Error(error);
        }
    },
    YearlyStats: async loggedUser => {
        try {
            let response = {};
            let query = { deleted: { $ne: 1 } };

            let aclPermissionsCustomer = acl.getAclQueryPermissions('customer', 'view', loggedUser);
            let aclPermissionsLead = acl.getAclQueryPermissions('lead', 'view', loggedUser);
            let allPermissions = [...aclPermissionsCustomer, ...aclPermissionsLead];

            query['$and'] = [
                { created_at: { $gte: getYearFirstDay() } },
                { created_at: { $lte: getYearLastDay() } }
            ];
            query['$or'] = [
                { 'acl_meta.permissions': { $in: allPermissions } },
                { 'acl_meta.users': { $in: [loggedUser._id.toString()] } }
            ];

            const crieteria = [
                { $match: query },

                { $match: {customer_code : { $exists: true, "$ne": "" }} },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 }
                    }
                },
                {
                    $addFields: {
                        percentage: ''
                    }
                },
                {
                    $project: {
                        _id: 0
                    }
                }
            ];

            const leadCrieteria = [
                { $match: query },

                { $match: {customer_code : { $exists: true, "$eq": "" }} },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 }
                    }
                },
                {
                    $addFields: {
                        percentage: ''
                    }
                },
                {
                    $project: {
                        _id: 0
                    }
                }
            ];

            // console.log('todays Stats:: lead query : ', JSON.stringify(query));
            let lead = await DataAccess.aggregate('customer', leadCrieteria);
            if (isEmpty(lead)) {
                lead = [{ count: 0, percentage: '' }];
            }
            response.leads = lead[0];

            // console.log('todays Stats:: customer query: ', JSON.stringify(query));
            let customer = await DataAccess.aggregate('customer', crieteria);
            if (isEmpty(customer)) {
                customer = [{ count: 0, percentage: '' }];
            }
            response.customers = customer[0];
            await yearlyStats_cmr(loggedUser, response);

            return response;
        } catch (error) {
            throw new Error(error);
        }
    },

    leadRegistrationHistory: async loggedUser => {
        try {

            let response = [];
            let query = { deleted: { $ne: 1 } };
            if (loggedUser.group.includes('admin') || loggedUser.group.includes('director') || loggedUser.group.includes('vp')) {
            } else {
                let aclPermissionsLead = acl.getAclQueryPermissions('lead', 'view', loggedUser);
                query['$or'] = [
                    { 'acl_meta.permissions': { $in: aclPermissionsLead } },
                    { 'acl_meta.users': { $in: [loggedUser._id.toString(), loggedUser._id] } }
                ];
            }
            const crieteria = [
                { $match: query },
                { $project: { customer_category: 1, created_at: 1, } }
            ];

            query['customer_category'] = { $eq: 'BLUE' };
            const leadBlue = await DataAccess.aggregate('customer', crieteria);
            let dataBLUE = await formatLeadRegistrationResponse(leadBlue, 'BLUE');
            response.push(dataBLUE);

            query['customer_category'] = { $eq: 'SILVER' };
            const leadSilver = await DataAccess.aggregate('customer', crieteria);
            let dataSILVER = await formatLeadRegistrationResponse(leadSilver, 'SILVER');
            response.push(dataSILVER);

            query['customer_category'] = { $eq: 'GOLD' };
            const leadGold = await DataAccess.aggregate('customer', crieteria);
            let dataGOLD = await formatLeadRegistrationResponse(leadGold, 'GOLD');
            response.push(dataGOLD);

            query['customer_category'] = { $eq: 'PLATINUM' };
            const leadPlatinum = await DataAccess.aggregate('customer', crieteria);
            let dataPlatinum = await formatLeadRegistrationResponse(leadPlatinum, 'PLATINUM');
            response.push(dataPlatinum);

            query['customer_category'] = { $eq: 'PALLADIUM' };
            const leadPalladium = await DataAccess.aggregate('customer', crieteria);
            let dataPalladium = await formatLeadRegistrationResponse(leadPalladium, 'PALLADIUM');
            response.push(dataPalladium);

            return response;
        } catch (error) {
            throw new Error(error);
        }
    },
    customerRegistrationHistory: async loggedUser => {
        try {
            let response = [];
            let query = { deleted: { $ne: 1 }, created_by: { $ne: RajeshPrabhuImportedData } };

            if (loggedUser.group.includes('admin') || loggedUser.group.includes('director') || loggedUser.group.includes('vp')) {
            } else {
                let aclPermissionsLead = acl.getAclQueryPermissions('customer', 'view', loggedUser);
                query['$or'] = [
                    { 'acl_meta.permissions': { $in: aclPermissionsLead } },
                    { 'acl_meta.users': { $in: [loggedUser._id.toString(), loggedUser._id] } }
                ];
            }
            const crieteria = [
                { $match: query },
                { $project: { customer_category: 1, created_at: 1, } }
            ];

            query['customer_category'] = { $eq: 'BLUE' };
            const leadBlue = await DataAccess.aggregate('customer', crieteria);
            let dataBLUE = await formatLeadRegistrationResponse(leadBlue, 'BLUE');
            response.push(dataBLUE);

            query['customer_category'] = { $eq: 'SILVER' };
            const leadSilver = await DataAccess.aggregate('customer', crieteria);
            let dataSILVER = await formatLeadRegistrationResponse(leadSilver, 'SILVER');
            response.push(dataSILVER);

            query['customer_category'] = { $eq: 'GOLD' };
            const leadGold = await DataAccess.aggregate('customer', crieteria);
            let dataGOLD = await formatLeadRegistrationResponse(leadGold, 'GOLD');
            response.push(dataGOLD);

            query['customer_category'] = { $eq: 'PLATINUM' };
            const leadPlatinum = await DataAccess.aggregate('customer', crieteria);
            let dataPlatinum = await formatLeadRegistrationResponse(leadPlatinum, 'PLATINUM');
            response.push(dataPlatinum);

            query['customer_category'] = { $eq: 'PALLADIUM' };
            const leadPalladium = await DataAccess.aggregate('customer', crieteria);
            let dataPalladium = await formatLeadRegistrationResponse(leadPalladium, 'PALLADIUM');
            response.push(dataPalladium);

            return response;
        } catch (error) {
            throw new Error(error);
        }
    },

    getMobileDashboardDetails: async (loggedUser) => {
        try {
            let response = {};
            const schedule_criteria = [
                {
                    $match: {
                        deleted: { $ne: 1 },
                        assigned_to: { $in: [loggedUser._id] },
                        $or: [
                            {
                                $and: [
                                    { start_date: { $gte: getTodayStartTime() } },
                                    { start_date: { $lte: getTodayEndTime() } }
                                ]
                            },
                            {
                                $and: [
                                    { due_date: { $gte: getTodayStartTime() } },
                                    { due_date: { $lte: getTodayEndTime() } }
                                ]
                            },
                            {
                                $and: [
                                    { visit_date: { $gte: getTodayStartTime() } },
                                    { visit_date: { $lte: getTodayEndTime() } }
                                ]
                            },
                            {
                                $and: [
                                    { call_start_date: { $gte: getTodayStartTime() } },
                                    { call_start_date: { $lte: getTodayEndTime() } }
                                ]
                            },
                            {
                                $and: [
                                    { meeting_date: { $gte: getTodayStartTime() } },
                                    { meeting_date: { $lte: getTodayEndTime() } }
                                ]
                            }
                        ]
                    }
                },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 }
                    }
                },
                {
                    $addFields: {
                        percentage: ''
                    }
                },
                {
                    $project: {
                        _id: 0
                    }
                }
            ];
            let schedule = await DataAccess.aggregate('scheduler', schedule_criteria);
            if (isEmpty(schedule)) {
                schedule = [{ count: 0, percentage: '' }];
            }
            response.schedule = schedule[0];
            response.leads = { count: await getCustomerModelDetails.getCustomersCount(loggedUser), percentage: '' };
            const notesArray = await notesModel.all(loggedUser);
            const notesCount = notesArray.length;
            response.notes = { count: notesCount, percentage: '' }; 
            return response;
        } catch (error) {
            throw new Error(error);
        }
    },
};

module.exports = model;

async function todayStats_cmr(loggedUser, response) {
    let cmrQuery = { deleted: { $ne: true } };


    let canlListAllCMR = checkDatalListingPermission(loggedUser.group).cmr;
    console.log('canlListAllCMR: ', canlListAllCMR);

    if (!canlListAllCMR) {
        let customerIds = await getCustomerIdsToListCMR(loggedUser);
        cmrQuery['customer_id'] = { $in: customerIds };
    }


    cmrQuery['$and'] = [
        { created_at: { $gte: getTodayStartTime() } },
        { created_at: { $lte: getTodayEndTime() } }
    ];
    const cmrCrieteria = [
        {
            $addFields: {
                customer_id: {
                    $convert: {
                        input: '$customer_id',
                        to: 'objectId',
                        onError: 0
                    }
                }
            }
        },
        { $match: cmrQuery },
        {
            $group: {
                _id: null,
                count: { $sum: 1 }
            }
        },
        {
            $addFields: {
                percentage: ''
            }
        },
        {
            $project: {
                _id: 0
            }
        }
    ];
    let cmr = await DataAccess.aggregate('customer_cmr_details', cmrCrieteria);
    if (isEmpty(cmr)) {
        cmr = [{ count: 0, percentage: '' }];
    }
    response.cmr = cmr[0];
}


async function weeklyStats_cmr(loggedUser, response) {
    let cmrQuery = { deleted: { $ne: true } };



    let canlListAllCMR = checkDatalListingPermission(loggedUser.group).cmr;

    if (!canlListAllCMR) {
        let customerIds = await getCustomerIdsToListCMR(loggedUser);
        cmrQuery['customer_id'] = { $in: customerIds };
    }

    cmrQuery['$and'] = [
        { created_at: { $gte: getWeekFirstDay() } },
        { created_at: { $lte: getWeekLastDay() } }
    ];
    const cmrCrieteria = [
        {
            $addFields: {
                customer_id: {
                    $convert: {
                        input: '$customer_id',
                        to: 'objectId',
                        onError: 0
                    }
                }
            }
        },
        { $match: cmrQuery },
        {
            $group: {
                _id: null,
                count: { $sum: 1 }
            }
        },
        {
            $addFields: {
                percentage: ''
            }
        },
        {
            $project: {
                _id: 0
            }
        }
    ];
    let cmr = await DataAccess.aggregate('customer_cmr_details', cmrCrieteria);
    if (isEmpty(cmr)) {
        cmr = [{ count: 0, percentage: '' }];
    }
    response.cmr = cmr[0];
}

async function quaterlyStats_cmr(loggedUser, response) {
    let cmrQuery = { deleted: { $ne: true } };



    let canlListAllCMR = checkDatalListingPermission(loggedUser.group).cmr;
    console.log('canlListAllCMR: ', canlListAllCMR);

    if (!canlListAllCMR) {
        let customerIds = await getCustomerIdsToListCMR(loggedUser);
        cmrQuery['customer_id'] = { $in: customerIds };
    }


    cmrQuery['$and'] = [
        { created_at: { $gte: getWeekFirstDay() } },
        { created_at: { $lte: getWeekLastDay() } }
    ];
    const cmrCrieteria = [
        {
            $addFields: {
                customer_id: {
                    $convert: {
                        input: '$customer_id',
                        to: 'objectId',
                        onError: 0
                    }
                }
            }
        },
        { $match: cmrQuery },
        {
            $group: {
                _id: null,
                count: { $sum: 1 }
            }
        },
        {
            $addFields: {
                percentage: ''
            }
        },
        {
            $project: {
                _id: 0
            }
        }
    ];
    let cmr = await DataAccess.aggregate('customer_cmr_details', cmrCrieteria);
    if (isEmpty(cmr)) {
        cmr = [{ count: 0, percentage: '' }];
    }
    response.cmr = cmr[0];
}
async function monthlyStats_cmr(loggedUser, response) {
    let cmrQuery = { deleted: { $ne: true } };



    let canlListAllCMR = checkDatalListingPermission(loggedUser.group).cmr;
    console.log('canlListAllCMR: ', canlListAllCMR);

    if (!canlListAllCMR) {
        let customerIds = await getCustomerIdsToListCMR(loggedUser);
        cmrQuery['customer_id'] = { $in: customerIds };
    }


    cmrQuery['$and'] = [
        { created_at: { $gte: getMonthFirstDay() } },
        { created_at: { $lte: getMonthLastDay() } }
    ];
    const cmrCrieteria = [
        {
            $addFields: {
                customer_id: {
                    $convert: {
                        input: '$customer_id',
                        to: 'objectId',
                        onError: 0
                    }
                }
            }
        },
        { $match: cmrQuery },
        {
            $group: {
                _id: null,
                count: { $sum: 1 }
            }
        },
        {
            $addFields: {
                percentage: ''
            }
        },
        {
            $project: {
                _id: 0
            }
        }
    ];
    let cmr = await DataAccess.aggregate('customer_cmr_details', cmrCrieteria);
    if (isEmpty(cmr)) {
        cmr = [{ count: 0, percentage: '' }];
    }
    response.cmr = cmr[0];
}
async function yearlyStats_cmr(loggedUser, response) {
    let cmrQuery = { deleted: { $ne: true } };



    let canlListAllCMR = checkDatalListingPermission(loggedUser.group).cmr;
    console.log('canlListAllCMR: ', canlListAllCMR);

    if (!canlListAllCMR) {
        let customerIds = await getCustomerIdsToListCMR(loggedUser);
        cmrQuery['customer_id'] = { $in: customerIds };
    }


    cmrQuery['$and'] = [
        { created_at: { $gte: getYearFirstDay() } },
        { created_at: { $lte: getYearLastDay() } }
    ];
    const cmrCrieteria = [
        {
            $addFields: {
                customer_id: {
                    $convert: {
                        input: '$customer_id',
                        to: 'objectId',
                        onError: 0
                    }
                }
            }
        },
        { $match: cmrQuery },
        {
            $group: {
                _id: null,
                count: { $sum: 1 }
            }
        },
        {
            $addFields: {
                percentage: ''
            }
        },
        {
            $project: {
                _id: 0
            }
        }
    ];
    let cmr = await DataAccess.aggregate('customer_cmr_details', cmrCrieteria);
    if (isEmpty(cmr)) {
        cmr = [{ count: 0, percentage: '' }];
    }
    response.cmr = cmr[0];
}
