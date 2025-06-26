// @ts-check
const ObjectId = require('mongodb').ObjectID;
const { isEmpty, first, isArray, isUndefined } = require('lodash');

const { deleteNotes, getCustomerIdsToListCMR } = require('../shared/shared.controller');

const { mapCustomerQuery,
    mapCMRQuery,
    setApprovalStageQuery,
    checkDatalListingPermission,
    auditActions,
    Modules,
    mapBDQuery,
    formatDate,
    CreateRespMatrix,
    getCMRStatusQuery
} = require('../shared/shared.model');
const DataAccess = require('../../helpers/DataAccess');
const Audit = require('../audit/audit.model.js');
const Notes = require('../notes/notes.model');
const acl = require('../../service/acl');
const Dealer = require('../dealer/dealer.model');
const User = require('../users/users.model.js');


let mydb;
const database = require('../../service/database');
database.getDb().then(res => { mydb = res; ensureIndex(); });
const collection_name = 'customer';

const collection = (collectionName) => { return mydb.collection(collectionName); };

const ensureIndex = () => {
    let locCollection = collection(collection_name);
    locCollection.ensureIndex("customer_name", (err, name) => {
        console.log("ensureIndex customer_name ", err, name);
    });
    locCollection.ensureIndex("customer_code", (err, name) => {
        console.log("ensureIndex customer_code ", err, name);
    });
    locCollection.ensureIndex("customer_city", (err, name) => {
        console.log("ensureIndex customer_city ", err, name);
    });
    locCollection.ensureIndex("customer_phone", (err, name) => {
        console.log("ensureIndex customer_phone ", err, name);
    });
    locCollection.ensureIndex("customer_email", (err, name) => {
        console.log("ensureIndex customer_email ", err, name);
    });
    locCollection.ensureIndex("created_at", (err, name) => {
        console.log("ensureIndex created_at ", err, name);
    });

}

const bdModule = 'BD-Activity';

let saveCustomerActivity = (body) => {
    body.module = body && body.module ? body.module : Modules().customer;
    body.date = new Date();
    Audit.addLog(body);
};

const getPermissionOfLeadCreator = async (_leadId) => {
    try {
        let crieteria = ([
            { $match: { _id: ObjectId(_leadId) } },
            { $project: { acl_meta: 1, created_by: 1, created_at: 1, number_series: 1 } }
        ]);
        const resp = await DataAccess.aggregate('lead', crieteria);
        return resp[0];
    } catch (error) {
        throw new Error(error);
    }
};

const setCustomerPermission = (leadPermissions, customerId, doc) => {
    let loggedUser = {
        _id: leadPermissions.acl_meta.users
    };
    acl.allowUser('customer', loggedUser, doc);
    doc.created_by = leadPermissions.created_by;
    doc.created_at = leadPermissions.created_at;
    doc.number_series = leadPermissions.number_series;
    DataAccess.UpdateOne('customer', { _id: ObjectId(customerId) }, { $set: doc });
};


const matchCountryAndBusinessUnit = (doc, country, businessunit, number) => {
    if (doc.customer_country == 'IN' && doc.businessunit == businessunit) {
        doc.number_series = number;
    } else if (doc.customer_country != 'IN' && doc.businessunit == businessunit) {
        doc.number_series = 2;
    }
};


const setNumberSeries = (doc) => {
    switch (doc.businessunit) {
        case 'masterbatch':
            matchCountryAndBusinessUnit(doc, doc.customer_country, doc.businessunit, 1);
            break;
        case 'ssg':
            matchCountryAndBusinessUnit(doc, doc.customer_country, doc.businessunit, 3);
            break;
        case 'nfc_wpc_profiles':
            matchCountryAndBusinessUnit(doc, doc.customer_country, doc.businessunit, 4);
            break;
        case 'n2n_bio_deg_&_comp':
            matchCountryAndBusinessUnit(doc, doc.customer_country, doc.businessunit, 5);
            break;
        case 'performance_material':
            matchCountryAndBusinessUnit(doc, doc.customer_country, doc.businessunit, 1);
            break;
        case 'innovative_materials_group':
            matchCountryAndBusinessUnit(doc, doc.customer_country, doc.businessunit, 5);
            break;
        case 'common':
            matchCountryAndBusinessUnit(doc, doc.customer_country, doc.businessunit, 1);
            break;
        default:
            break;
    }
};

const model = {
    findById: async (loggedUser, id) => {
        const crieteria = ([
            { $match: { _id: ObjectId(id) } },
            {
                '$lookup': {
                    from: 'state',
                    let: { customer_state: '$customer_state', },
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

            { $lookup: { from: 'region', localField: 'customer_region', foreignField: '_id', as: 'region_details' } },
            { $lookup: { from: 'area', localField: 'customer_area', foreignField: '_id', as: 'area_details' } },
            { $lookup: { from: 'zone', localField: 'customer_zone', foreignField: '_id', as: 'zone_details' } },
            { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'createdBy_details' } },
            { $lookup: { from: 'contacts', localField: 'linked_contacts.contactId', foreignField: '_id', as: 'linked_contact_details' } },
            { $lookup: { from: 'marketinfo', localField: 'linked_marketInfo.marketId', foreignField: '_id', as: 'linked_market_info_details' } },
            { $lookup: { from: 'users', localField: 'linked_staff.staffId', foreignField: '_id', as: 'linked_staff_Temp_details' } },

            {
                '$lookup': {
                    from: 'users',
                    let: {
                        // primary_account_manager: { $ne: ['$responsibility_matrix.primary_account_manager', ''] },
                        primary_account_manager: {
                            $cond: {
                                if: { $ne: ['$responsibility_matrix.primary_account_manager', ''] },
                                then: '$responsibility_matrix.primary_account_manager',
                                else: undefined
                            }
                        },
                        // primary_field_coordinator: { $ne: ['$responsibility_matrix.primary_field_coordinator', ''] },
                        primary_field_coordinator: { $cond: { if: { $ne: ['$responsibility_matrix.primary_field_coordinator', ''] }, then: '$responsibility_matrix.primary_field_coordinator', else: undefined } },
                        // primary_biss_development: { $ne: ['$responsibility_matrix.primary_biss_development', ''] },
                        primary_biss_development: {
                            $cond: {
                                if: { $ne: ['$responsibility_matrix.primary_biss_development', ''] },
                                then: '$responsibility_matrix.primary_biss_development',
                                else: undefined
                            }
                        },
                        // primary_technical_services: { $ne: ['$responsibility_matrix.primary_technical_services', ''] },
                        primary_technical_services: {
                            $cond: {
                                if: { $ne: ['$responsibility_matrix.primary_technical_services', ''] },
                                then: '$responsibility_matrix.primary_technical_services',
                                else: undefined
                            }
                        },
                        // primary_product_development: { $ne: ['$responsibility_matrix.primary_product_development', ''] },
                        primary_product_development: {
                            $cond: {
                                if: { $ne: ['$responsibility_matrix.primary_product_development', ''] },
                                then: '$responsibility_matrix.primary_product_development',
                                else: undefined
                            }
                        },
                        // primary_door_opener: { $ne: ['$responsibility_matrix.primary_door_opener', ''] },
                        primary_door_opener: {
                            $cond: {
                                if: { $ne: ['$responsibility_matrix.primary_door_opener', ''] },
                                then: '$responsibility_matrix.primary_door_opener',
                                else: undefined
                            }
                        },
                        // primary_salesOps: { $ne: ['$responsibility_matrix.primary_salesOps', ''] },
                        primary_salesOps: {
                            $cond: {
                                if: { $ne: ['$responsibility_matrix.primary_salesOps', ''] },
                                then: '$responsibility_matrix.primary_salesOps',
                                else: undefined
                            }
                        },
                        // secondary_account_manager: { $ne: ['$responsibility_matrix.secondary_account_manager', ''] },
                        secondary_account_manager: {
                            $cond: {
                                if: { $ne: ['$responsibility_matrix.secondary_account_manager', ''] },
                                then: '$responsibility_matrix.secondary_account_manager',
                                else: undefined
                            }
                        },
                        // secondary_field_coordinator: { $ne: ['$responsibility_matrix.secondary_field_coordinator', ''] },
                        secondary_field_coordinator: {
                            $cond: {
                                if: { $ne: ['$responsibility_matrix.secondary_field_coordinator', ''] },
                                then: '$responsibility_matrix.secondary_field_coordinator',
                                else: undefined
                            }
                        },
                        // secondary_biss_development: { $ne: ['$responsibility_matrix.secondary_biss_development', ''] },
                        secondary_biss_development: {
                            $cond: {
                                if: { $ne: ['$responsibility_matrix.secondary_biss_development', ''] },
                                then: '$responsibility_matrix.secondary_biss_development',
                                else: undefined
                            }
                        },
                        // secondary_technical_services: { $ne: ['$responsibility_matrix.secondary_technical_services', ''] },
                        secondary_technical_services: {
                            $cond: {
                                if: { $ne: ['$responsibility_matrix.secondary_technical_services', ''] },
                                then: '$responsibility_matrix.secondary_technical_services',
                                else: undefined
                            }
                        },
                        // secondary_product_development: { $ne: ['$responsibility_matrix.secondary_product_development', ''] },
                        secondary_product_development: {
                            $cond: {
                                if: { $ne: ['$responsibility_matrix.secondary_product_development', ''] },
                                then: '$responsibility_matrix.secondary_product_development',
                                else: undefined
                            }
                        },
                        // secondary_door_opener: { $ne: ['$responsibility_matrix.secondary_door_opener', ''] },
                        secondary_door_opener: {
                            $cond: {
                                if: { $ne: ['$responsibility_matrix.secondary_door_opener', ''] },
                                then: '$responsibility_matrix.secondary_door_opener',
                                else: undefined
                            }
                        },
                        // secondary_salesOps: { $ne: ['$responsibility_matrix.secondary_salesOps', ''] },
                        secondary_salesOps: {
                            $cond: {
                                if: { $ne: ['$responsibility_matrix.secondary_salesOps', ''] },
                                then: '$responsibility_matrix.secondary_salesOps',
                                else: undefined
                            }
                        },
                        // tertiary_account_manager: { $ne: ['$responsibility_matrix.tertiary_account_manager', ''] },
                        tertiary_account_manager: {
                            $cond: {
                                if: { $ne: ['$responsibility_matrix.tertiary_account_manager', ''] },
                                then: '$responsibility_matrix.tertiary_account_manager',
                                else: undefined
                            }
                        },
                        // tertiary_field_coordinator: { $ne: ['$responsibility_matrix.tertiary_field_coordinator', ''] },
                        tertiary_field_coordinator: {
                            $cond: {
                                if: { $ne: ['$responsibility_matrix.tertiary_field_coordinator', ''] },
                                then: '$responsibility_matrix.tertiary_field_coordinator',
                                else: undefined
                            }
                        },
                        // tertiary_biss_development: { $ne: ['$responsibility_matrix.tertiary_biss_development', ''] },
                        tertiary_biss_development: {
                            $cond: {
                                if: { $ne: ['$responsibility_matrix.tertiary_biss_development', ''] },
                                then: '$responsibility_matrix.tertiary_biss_development',
                                else: undefined
                            }
                        },
                        // tertiary_technical_services: { $ne: ['$responsibility_matrix.tertiary_technical_services', ''] },
                        tertiary_technical_services: {
                            $cond: {
                                if: { $ne: ['$responsibility_matrix.tertiary_technical_services', ''] },
                                then: '$responsibility_matrix.tertiary_technical_services',
                                else: undefined
                            }
                        },
                        // tertiary_product_development: { $ne: ['$responsibility_matrix.tertiary_product_development', ''] },
                        tertiary_product_development: {
                            $cond: {
                                if: { $ne: ['$responsibility_matrix.tertiary_product_development', ''] },
                                then: '$responsibility_matrix.tertiary_product_development',
                                else: undefined
                            }
                        },
                        // tertiary_door_opener: { $ne: ['$responsibility_matrix.tertiary_door_opener', ''] },
                        tertiary_door_opener: {
                            $cond: {
                                if: { $ne: ['$responsibility_matrix.tertiary_door_opener', ''] },
                                then: '$responsibility_matrix.tertiary_door_opener',
                                else: undefined
                            }
                        },
                        // tertiary_salesOps: { $ne: ['$responsibility_matrix.tertiary_salesOps', ''] },
                        tertiary_salesOps: {
                            $cond: {
                                if: { $ne: ['$responsibility_matrix.tertiary_salesOps', ''] },
                                then: '$responsibility_matrix.tertiary_salesOps',
                                else: undefined
                            }
                        },

                        area_manager: {
                            $cond: {
                                if: { $ne: ['$area_manager', ''] },
                                then: '$area_manager',
                                else: undefined
                            }
                        },
                        sales_executive: {
                            $cond: {
                                if: { $ne: ['$sales_executive', ''] },
                                then: '$sales_executive',
                                else: undefined
                            }
                        },
                        rbm: {
                            $cond: {
                                if: { $ne: ['$rbm', ''] },
                                then: '$rbm',
                                else: undefined
                            }
                        },
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        {
                                            $eq: ['$emp_code', '$$primary_account_manager']
                                        },
                                        {
                                            $eq: ['$emp_code', '$$primary_field_coordinator']
                                        },
                                        {
                                            $eq: ['$emp_code', '$$primary_biss_development']
                                        },
                                        {
                                            $eq: ['$emp_code', '$$primary_technical_services']
                                        },
                                        {
                                            $eq: ['$emp_code', '$$primary_product_development']
                                        },
                                        {
                                            $eq: ['$emp_code', '$$primary_door_opener']
                                        },
                                        {
                                            $eq: ['$emp_code', '$$primary_salesOps']
                                        },
                                        {
                                            $eq: ['$emp_code', '$$secondary_account_manager']
                                        },
                                        {
                                            $eq: ['$emp_code', '$$secondary_field_coordinator']
                                        },
                                        {
                                            $eq: ['$emp_code', '$$secondary_biss_development']
                                        },
                                        {
                                            $eq: ['$emp_code', '$$secondary_technical_services']
                                        },
                                        {
                                            $eq: ['$emp_code', '$$secondary_product_development']
                                        },
                                        {
                                            $eq: ['$emp_code', '$$secondary_door_opener']
                                        },
                                        {
                                            $eq: ['$emp_code', '$$secondary_salesOps']
                                        },
                                        {
                                            $eq: ['$emp_code', '$$tertiary_account_manager']
                                        },
                                        {
                                            $eq: ['$emp_code', '$$tertiary_field_coordinator']
                                        },
                                        {
                                            $eq: ['$emp_code', '$$tertiary_biss_development']
                                        },
                                        {
                                            $eq: ['$emp_code', '$$tertiary_technical_services']
                                        },
                                        {
                                            $eq: ['$emp_code', '$$tertiary_product_development']
                                        },
                                        {
                                            $eq: ['$emp_code', '$$tertiary_door_opener']
                                        },
                                        {
                                            $eq: ['$emp_code', '$$tertiary_salesOps']
                                        },
                                        {
                                            $eq: ['$emp_code', '$$area_manager']
                                        },
                                        {
                                            $eq: ['$emp_code', '$$rbm']
                                        },
                                        {
                                            $eq: ['$emp_code', '$$sales_executive']
                                        },
                                    ],
                                }
                            }
                        }
                    ],
                    as: 'linked_respMatrix_details'
                }
            },

            { $lookup: { from: 'quotes', localField: '_id', foreignField: 'documentId', as: 'quotes' } },
            { $lookup: { from: 'files_storage', localField: 'quotes.files', foreignField: '_id', as: 'quotes_file_details' } },
            { $lookup: { from: 'bdstage', localField: 'bd_stage', foreignField: '_id', as: 'bd_stage_details' } },

            { $lookup: { from: 'business_category', localField: 'crm_division', foreignField: 'key', as: 'crmDivision_details' } },
            { $lookup: { from: 'business_group', localField: 'businesscode', foreignField: 'key', as: 'businesscode_details' } },
            { $lookup: { from: 'business_division', localField: 'businessunit', foreignField: 'key', as: 'businessunit_details' } },

            {
                $addFields: {
                    linked_staff_details: { $concatArrays: ['$linked_respMatrix_details', '$linked_staff_Temp_details'] },
                    bd_stage: { $arrayElemAt: ['$bd_stage_details', 0] },
                    customer_region: '$region_details',
                    customer_area: '$area_details',
                    customer_zone: '$zone_details',
                    customer_state_name: { $arrayElemAt: ['$state_details.state', 0] },
                    crm_division: { $arrayElemAt: ['$crmDivision_details', 0] },
                    businesscode: { $arrayElemAt: ['$businesscode_details', 0] },
                    businessunit: { $arrayElemAt: ['$businessunit_details', 0] },

                }
            },
            {
                $project: {
                    bd_stage_details: 0,
                    'customer_region.region_code': 0,
                    'customer_region.created_at': 0,
                    'customer_area.region': 0,
                    'customer_area.created_at': 0,
                    'customer_zone.area': 0,
                    'customer_zone.created_at': 0,
                    crmDivision_details: 0,
                    businesscode_details: 0,
                    businessunit_details: 0,
                    state_details: 0,
                    linked_market_info_details: 0,
                    acl_meta: 0,
                }
            },
        ]);
        const resp = await DataAccess.aggregate(collection_name, crieteria);
        for (const i of resp) {
            if (i.responsibility_matrix) {
                if (loggedUser.group.includes('rbm') || loggedUser.group.includes('cmr_approver') ||
                    loggedUser.group.includes('technical_service') || loggedUser.group.includes('vp') ||
                    loggedUser.group.includes('director') || loggedUser.group.includes('admin')) {
                    i.resp_matrix_enabled = true;
                } else {
                    i.resp_matrix_enabled = false;
                }
            }
        }
        return resp;
    },

    getBDandCustomerDetails: async (loggedUser, id, opportunityId) => {

        // const deal = await getDealDetails(id)
        // console.log('deal details: ', deal);
        const getCMRMatch = () => {
            if (opportunityId) {
                return {
                    "$match": {
                        _id: ObjectId(opportunityId),
                        "deleted": {
                            $nin: [true]
                        }
                    }
                }
            }
            return {
                "$match": {
                    "deleted": {
                        $nin: [true]
                    }
                }
            }
        }

        const crieteria = ([
            // { $match: { _id: ObjectId(deal.customer_id) } },
            { $match: { _id: ObjectId(id) } },
            {
                '$lookup': {
                    from: 'state',
                    let: { customer_state: '$customer_state', },
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
                $addFields: {
                    customer_state_name: { $arrayElemAt: ['$state_details.state', 0] },
                }
            },

            { $lookup: { from: 'region', localField: 'customer_region', foreignField: '_id', as: 'region_details' } },
            { $lookup: { from: 'area', localField: 'customer_area', foreignField: '_id', as: 'area_details' } },
            {
                $addFields: {
                    'customer_area_name': { $arrayElemAt: ['$area_details.area_code', 0] }
                } 
            },
            { $lookup: { from: 'zone', localField: 'customer_zone', foreignField: '_id', as: 'zone_details' } },
            {
                $addFields: {
                    'customer_zone_name': { $arrayElemAt: ['$zone_details.zone_code', 0] }
                } 
            },
            { $lookup: { from: 'country', localField: 'customer_country', foreignField: 'countryCode', as: 'country_details' } },
            {
                $addFields: {
                    'customer_country_name': { $arrayElemAt: ['$country_details.country', 0] }
                } 
            },
            { $lookup: { from: 'users', localField: 'customer_assigned_to', foreignField: 'emp_code', as: 'customerAssignedToDetails' } },
            {
                $addFields: {
                    'customer_assigned_to_name': {
                      $concat: [
                        { $arrayElemAt: ['$customerAssignedToDetails.first_name', 0] },
                        ' ',
                        { $arrayElemAt: ['$customerAssignedToDetails.last_name', 0] }
                      ]
                    }
                }
            },
            { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'createdBy_details' } },
            { $lookup: { from: 'contacts', localField: 'linked_contacts.contactId', foreignField: '_id', as: 'linked_contact_details' } },
            { $lookup: { from: 'users', localField: 'linked_staff.staffId', foreignField: '_id', as: 'linked_staff_details' } },
            { $lookup: { from: 'role', localField: 'linked_staff_details.role_access_reports_mapping.role', foreignField: '_id', as: 'linked_staff_role_details' } },
            { $lookup: { from: 'access_level', localField: 'linked_staff_details.role_access_reports_mapping.access_level', foreignField: '_id', as: 'linked_staff_acl_details' } },
            { $lookup: { from: 'zone', localField: 'linked_staff_details.zone', foreignField: '_id', as: 'linked_staff_zone_details' } },
            { $lookup: { from: 'business_category', localField: 'customer_business_category', foreignField: '_id', as: 'business_category_details' } },
            { $lookup: { from: 'business_group', localField: 'customer_business_group', foreignField: '_id', as: 'business_group_details' } },
            { $lookup: { from: 'business_division', localField: 'customer_business_division', foreignField: '_id', as: 'business_division_details' } },
            { $lookup: { from: 'quotes', localField: '_id', foreignField: 'documentId', as: 'quotes' } },
            { $lookup: { from: 'files_storage', localField: 'quotes.files', foreignField: '_id', as: 'quotes_file_details' } },
            { $lookup: { from: 'marketinfo', localField: 'linked_marketInfo.marketId', foreignField: '_id', as: 'linked_market_info_details' } },
            { $lookup: { from: 'customer_quantity_requirements', localField: 'linked_customer_quantity_requirements.qty_requirementId', foreignField: '_id', as: 'linked_customer_quantity_requirements_details' } },
            { $lookup: { from: 'customer_material_details', localField: 'linked_customer_materials.materialId', foreignField: '_id', as: 'linked_customer_materials_details' } },
            { $lookup: { from: 'customer_sample_order', localField: 'linked_customer_sample_order.sample_order_Id', foreignField: '_id', as: 'linked_customer_sample_order_details' } },
            { $lookup: { from: 'customer_machinery_details', localField: 'linked_customer_machinery_details.machinery_detailsId', foreignField: '_id', as: 'linked_customer_machinery_details_data' } },
            {
                $addFields: {
                    customerId: { $toString: "$_id" },
                    customer_region_name: { $arrayElemAt: ['$region_details.region', 0] },
                },
            },
            {
                $lookup: {
                    from: 'customer_cmr_details',
                    "let": { "customer_id": "$customerId" },
                    "pipeline": [
                        { "$match": { "$expr": { "$eq": ["$customer_id", "$$customer_id"] } } },
                        getCMRMatch(),
                        {
                            $addFields: {
                                cmr_detailsId: "$_id",
                            },
                        },
                        { $sort: { created_at: -1 } }
                    ],
                    as: 'linked_cmr_details_data'
                }
            },
            { $lookup: { from: 'bdstage', localField: 'bdStage', foreignField: '_id', as: 'bd_stage_details' } },
            {
                $addFields: {
                    bd_stage: { $arrayElemAt: ['$bd_stage_details', 0] },
                    // cmr_detailsId: { $arrayElemAt: ['$linked_cmr_details_data._id', 0] },
                    linked_cmr_details: '$linked_cmr_details_data',
                    // bdStage: deal.bdStage,
                }
            },
            {
                $project: {
                    customer_code: 1,
                    bdStage: 1,
                    customer_name: 1,
                    customer_phone: 1,
                    customer_email: 1,
                    customer_address1: 1,
                    customer_business_category: 1,
                    customer_business_group: 1,
                    customer_business_division: 1,
                    crm_division: 1,
                    businesscode: 1,
                    businessunit: 1,
                    customer_category: 1,
                    customer_address2: 1,
                    customer_landmark: 1,
                    customer_status: 1,
                    customer_remarks: 1,
                    isDealer: 1,
                    customer_postCode: 1,
                    customer_city: 1,
                    customer_state: 1,
                    customer_country: 1,
                    customer_country_name: 1,
                    customer_continent: 1,
                    customer_region: 1,
                    customer_area: 1,
                    customer_area_name: 1,
                    customer_zone: 1,
                    customer_zone_name: 1,
                    customer_assigned_to: 1,
                    customer_assigned_to_name: 1,
                    customer_referred_by: 1,
                    linked_staff: 1,
                    linked_contacts: 1,
                    targets: 1,
                    created_by: 1,
                    created_at: 1,
                    modified_At: 1,
                    number_series: 1,
                    bd_activity: 1,
                    bd_activated: 1,
                    deleted: 1,
                    linked_cmr_details: 1,
                    bd_flow_id: 1,
                    currentStage: 1,
                    customer_sub_continent: 1,
                    fromBD: 1,
                    group_company: 1,
                    last_credit_rating_review_date: 1,
                    nav_contact_no: 1,
                    pot_customer_category: 1,
                    sales_turnover: 1,
                    structure_organisation: 1,
                    bd_flow: 1,
                    bdStateChanged: 1,
                    account_manager: 1,
                    bank_guarantee: 1,
                    biss_development: 1,
                    cin_number: 1,
                    credit_days: 1,
                    credit_limit: 1,
                    credit_rating: 1,
                    credit_rating_copy: 1,
                    crm_brand_region: 1,
                    currecny_code: 1,
                    customer_contact_point_techservices: 1,
                    customer_contact_point_techservices_designation: 1,
                    customer_type: 1,
                    dealer_name: 1,
                    dealer_type: 1,
                    door_opener: 1,
                    exchange_rate: 1,
                    field_coordinator: 1,
                    gst_registration_num: 1,
                    gst_registration_type: 1,
                    gst_scan_copy: 1,
                    industrial_area: 1,
                    is_brand_supplier: 1,
                    msme_copy: 1,
                    name_onpan: 1,
                    area_manager: 1,
                    sales_executive: 1,
                    rbm: 1,
                    pan_num: 1,
                    pan_status: 1,
                    product_development: 1,
                    scan_pan: 1,
                    technical_services: 1,
                    responsibility_matrix: 1,
                    crm_sync: 1,
                    customer_state_name: 1,
                    quotes: 1,
                    customer_region_name: 1,
                    linked_staff_role_details: 1,
                    linked_contact_details: 1,
                    linked_staff_details: 1,
                    linked_staff_acl_details: 1,
                    linked_staff_zone_details: 1,
                    linked_market_info_details: 1,
                    linked_customer_quantity_requirements_details: 1,
                    input_material: 1,
                    procurement_cycle: 1,
                    machinery_details: 1,
                    linked_customer_sample_order_details: 1,
                    linked_customer_machinery_details_data: 1,
                    resp_matrix_enabled: {
                        $cond: {
                            if: {
                                $or: [
                                    { $eq: [loggedUser.group.includes('rbm'), true] },
                                    { $eq: [loggedUser.group.includes('cmr_approver'), true] },
                                    { $eq: [loggedUser.group.includes('admin'), true] },
                                    { $eq: [loggedUser.group.includes('technical_service'), true] },
                                    { $eq: [loggedUser.group.includes('director'), true] },
                                    { $eq: [loggedUser.group.includes('vp'), true] },
                                ]
                            },
                            then: true, else: true
                        }
                    },
                }
            },
        ]);
        const resp = await DataAccess.aggregate(collection_name, crieteria);
        return resp;
    },

    viewSingleCMR: (id) => {
        const crieteria = ([
            { $match: { _id: ObjectId(id) } },
            { $lookup: { from: 'customer_quantity_requirements', localField: 'CRM_CMR_No', foreignField: 'cmr_no', as: 'customer_quantity_requirement' } },
        ]);
        return DataAccess.aggregate('customer_cmr_details', crieteria);
    },

    filter: (loggedUser, DataToFilter, isCustomer) => {
        let params = DataToFilter.options;
        console.log('MODEL: ', DataToFilter);

        let matchQuery = {};

        let regions = [];
        let areas = [];
        let zones = [];
        let listOfAssignedUsers = [];
        if (DataToFilter && !isEmpty(DataToFilter.start_date) && !isEmpty(DataToFilter.end_date)) {
            matchQuery['created_at'] = { $gte: new Date(DataToFilter.start_date), $lte: new Date(DataToFilter.end_date) };
        }

        if (DataToFilter && !isEmpty(DataToFilter.region)) {
            // matchQuery['customer_region'] = { $in: DataToFilter.region }
            DataToFilter.region.forEach(element => {
                regions.push(ObjectId(element));
            });
            matchQuery['customer_region'] = { $in: regions };
        }

        if (DataToFilter && !isEmpty(DataToFilter.area)) {
            DataToFilter.area.forEach(element => {
                areas.push(ObjectId(element));
            });
            matchQuery['customer_area'] = { $in: areas };
        }

        if (DataToFilter && !isEmpty(DataToFilter.zone)) {
            DataToFilter.zone.forEach(element => {
                zones.push(ObjectId(element));
            });
            matchQuery['customer_zone'] = { $in: zones };
        }

        if (DataToFilter && !isEmpty(DataToFilter.businessunit)) {
            matchQuery['businessunit'] = { $in: DataToFilter.businessunit };
        }

        if (DataToFilter && !isEmpty(DataToFilter.businesscode)) {
            matchQuery['businesscode'] = { $in: DataToFilter.businesscode };
        }

        if (DataToFilter && !isEmpty(DataToFilter.businessdivision)) {
            matchQuery['crm_division'] = { $in: DataToFilter.businessdivision };
        }

        if (DataToFilter && !isEmpty(DataToFilter.customer_category)) {
            matchQuery['customer_category'] = { $in: DataToFilter.customer_category };
        }

        if (DataToFilter && !isEmpty(DataToFilter.assigned_to)) {
            DataToFilter.assigned_to.forEach(element => {
                listOfAssignedUsers.push(ObjectId(element));
            });
            matchQuery['linked_staff.staffId'] = { $in: listOfAssignedUsers };
        }

        if (isEmpty(DataToFilter.region) && isEmpty(DataToFilter.area) && isEmpty(DataToFilter.zone) && isEmpty(DataToFilter.businessunit) &&
            isEmpty(DataToFilter.businesscode) && isEmpty(DataToFilter.businessdivision) && isEmpty(DataToFilter.customer_category) && isEmpty(DataToFilter.assigned_to)
        ) {
            // if (Config.RegionAreaZone_Enabled) {
            //     setQueryLoggedUserRegionAreaZone(loggedUser, matchQuery);
            // }

            // if (Config.businessTypes_Enabled) {
            //     setQueryLoggedUserBusinessTypes(loggedUser, matchQuery);
            // }
        }

        let matchQuery1 = mapCustomerQuery(loggedUser, matchQuery);


        console.log('CUSTOMER FILTER QUERY: ', matchQuery1);
        return model.all(loggedUser, matchQuery, params, isCustomer);
        //return DataAccess.aggregate(collection_name, crieteria);
    },

    all: async (loggedUser, query, params, isCustomer) => {
        try {
            let customer_query = await mapCustomerQuery(loggedUser, query);
            if (isCustomer) {
                customer_query["customer_code"] = { $exists: true, "$ne": "" };
            } else {
                customer_query["customer_code"] = { "$eq": "" };
            }
            if (params && params.bd_flow_id) {
                customer_query["bd_flow_id"] = { "$eq": params.bd_flow_id };
            }
            console.log('customer list QUERY: ', JSON.stringify(customer_query));
            const crieteria = ([
                {
                    "$facet": {
                        "data": [

                            { $match: customer_query },
                            {
                                $addFields: {
                                    _id: {
                                        $convert: {
                                            input: '$_id',
                                            to: 'string',
                                            onError: 0
                                        }
                                    },
                                }
                            },
                            ...common_query.customerList.data,
                        ],
                        "totalCount": [
                            { $match: customer_query },
                            {
                                $addFields: {
                                    _id: {
                                        $convert: {
                                            input: '$_id',
                                            to: 'string',
                                            onError: 0
                                        }
                                    },
                                }
                            },
                            ...common_query.customerList.totalCount,
                        ]
                    }
                }]
            );
            if (params && !isEmpty(params)) {

                if (params.filters && Object.keys(params.filters).length > 0) {
                    let filterKeys = Object.keys(params.filters)
                    let filter = {

                    };
                    for (let i = 0; i < filterKeys.length; i++) {
                        if (filterKeys[i] == 'customer_region_name') {
                            const ids = await getIds('region', 'region', params.filters[filterKeys[i]].value)
                            filterKeys[i] = 'customer_region'
                            console.log('ids: ', ids);
                            filter[filterKeys[i]] = { $in: ids }
                        } else if (filterKeys[i] == 'customer_area_name') {
                            const ids = await getIds('area', 'area', params.filters[filterKeys[i]].value)
                            filterKeys[i] = 'customer_area'
                            console.log('ids: ', ids);
                            filter[filterKeys[i]] = { $in: ids }
                        } else if (filterKeys[i] == 'customer_zone_name') {
                            const ids = await getIds('zone', 'zone', params.filters[filterKeys[i]].value)
                            filterKeys[i] = 'customer_zone'
                            console.log('ids: ', ids);
                            filter[filterKeys[i]] = { $in: ids }
                        } else if (filterKeys[i] == 'customer_state_name') {
                            const ids = await getStateIds('state', 'state', params.filters[filterKeys[i]].value)
                            filterKeys[i] = 'customer_state'
                            console.log('ids: ', ids);
                            filter[filterKeys[i]] = { $in: ids }
                        } else if (filterKeys[i] == 'staff_code') {
                            const searchValue = params.filters[filterKeys[i]].value;
                            const empDetails = await User.findByEmpCode(searchValue);
                            const empId = empDetails._id;
                            filter["$or"] = [
                                { "responsibility_matrix.primary_account_manager": searchValue },
                                { "responsibility_matrix.primary_field_coordinator": searchValue },
                                { "responsibility_matrix.primary_biss_development": searchValue },
                                { "responsibility_matrix.primary_technical_services": searchValue },
                                { "responsibility_matrix.primary_product_development": searchValue },
                                { "responsibility_matrix.primary_door_opener": searchValue },
                                { "responsibility_matrix.primary_salesOps": searchValue },
                                { "responsibility_matrix.secondary_account_manager": searchValue },
                                { "responsibility_matrix.secondary_field_coordinator": searchValue },
                                { "responsibility_matrix.secondary_biss_development": searchValue },
                                { "responsibility_matrix.secondary_technical_services": searchValue },
                                { "responsibility_matrix.secondary_product_development": searchValue },
                                { "responsibility_matrix.secondary_door_opener": searchValue },
                                { "responsibility_matrix.secondary_salesOps": searchValue },
                                { "responsibility_matrix.tertiary_account_manager": searchValue },
                                { "responsibility_matrix.tertiary_field_coordinator": searchValue },
                                { "responsibility_matrix.tertiary_biss_development": searchValue },
                                { "responsibility_matrix.tertiary_technical_services": searchValue },
                                { "responsibility_matrix.tertiary_product_development": searchValue },
                                { "responsibility_matrix.tertiary_door_opener": searchValue },
                                { "responsibility_matrix.tertiary_salesOps": searchValue },
                                { "sales_executive": searchValue },
                                { "rbm": searchValue },
                                { "area_manager": searchValue },
                                { "linked_staff.staffId": ObjectId(empId) }
                            ];
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
                if (params.rows) {
                    crieteria[0]["$facet"]["data"].push({ "$limit": params.first + params.rows });
                    crieteria[0]["$facet"]["data"].push({ "$skip": params.first })
                }

            }

            crieteria[0]["$facet"]["totalCount"].push({ "$count": "count" });
            const result = await DataAccess.aggregate(collection_name, crieteria, { allowDiskUse: true });
            return result;
        } catch (error) {
            throw new Error(error);
        }
    },

    getCustomersCount: async (loggedUser) => {
        try {
            let customerQuery = await mapCustomerQuery(loggedUser, {});
            customerQuery.customer_code = { "$eq": "" };
            const pipeline = [
                { $match: customerQuery },
                {
                    $addFields: {
                        _id: { $toString: '$_id' } 
                    }
                },
                ...common_query.customerList.totalCount,
                { $count: "count" }
            ];
            const result = await DataAccess.aggregate(collection_name, pipeline);
            const count = (result[0] && result[0].count) || 0;
            return count;
        } catch (error) {
            console.error('Error in getCustomersCount:', error);
            throw new Error('Failed to get customer count');
        }
    },
    
    allOpportunities: async (loggedUser, query, params) => {
        try {

            let query = { deleted: { $ne: true } }
            query = await mapCMRQuery(loggedUser, query);

            if (params && !isEmpty(params.start_date) && !isEmpty(params.end_date)) {

                query['created_at'] = { $gte: new Date(params.start_date), $lte: new Date(params.end_date) };

            }

            if (params && params.assigned_to) {

                let listOfStaff;

                listOfStaff = [params.assigned_to];
                const createdBy = listOfStaff.map((userId) => ObjectId(userId))
                query['created_by'] = { $in: createdBy };
            }

            console.log('list allOpportunities query: ', query, params);
            let filterTypeQuery = {};
            if (params.type == 'customer') {
                filterTypeQuery["customer.customer_code"] = { $exists: true, "$ne": "" };
            } else if (params.type == 'lead') {
                filterTypeQuery["customer.customer_code"] = { "$eq": "" };
            }
            const crieteria = [
                {
                    "$facet": {
                        "data": [
                            {
                                "$sort": {
                                    "modified_At": -1
                                }
                            },
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
                            { $limit: 1000 },
                            ...common_query.cmrList.data,
                            {
                                $group:
                                {
                                    _id: "$customer_id", opportunities: { $push: "$$ROOT" }
                                }
                            },
                            { $lookup: { from: 'customer', localField: '_id', foreignField: '_id', as: 'customer' } },
                            { $unwind: '$customer' },
                            { $match: filterTypeQuery }


                        ],
                        "totalCount": [
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
                            { $limit: 1000 },
                            ...common_query.cmrList.totalCount,
                            {
                                $group:
                                {
                                    _id: "$customer_id", opportunities: { $push: "$$ROOT" }
                                }
                            },
                            { $lookup: { from: 'customer', localField: '_id', foreignField: '_id', as: 'customer' } },
                            { $unwind: '$customer' },
                            { $match: filterTypeQuery },
                        ]
                    }
                }];
            if (params && !isEmpty(params)) {
                if (params.filters && Object.keys(params.filters).length > 0) {
                    let filterKeys = Object.keys(params.filters)
                    let filter = { 'deleted': { $ne: true } };
                    for (let key of filterKeys) {
                        if (key == 'customer_region_name') {
                            const ids = await getStringIds('region', 'region', params.filters[key].value)
                            key = 'RBU'
                            console.log('ids: ', ids);
                            filter[key] = { $in: ids }
                        } else if (key == 'opportunityStage') {
                            const ids = params.filters[key].value
                            key = 'opportunityStage'
                            console.log('ids: ', ids);
                            filter[key] = { $in: ids }
                        } else {
                            filter[key] = { "$regex": params.filters[key].value, "$options": "i" }
                        }
                    }

                    crieteria[0]["$facet"]["data"].splice(2, 0, { "$match": filter });
                    crieteria[0]["$facet"]["totalCount"].splice(2, 0, { "$match": filter });
                }

                if (params.sortField) {
                    let sort = {};
                    sort[params.sortField] = params.sortOrder
                    crieteria[0]["$facet"]["data"].unshift({ "$sort": sort });
                }

                crieteria[0]["$facet"]["data"].push({ "$limit": params.first + params.rows });
                crieteria[0]["$facet"]["data"].push({ "$skip": params.first })
            }

            crieteria[0]["$facet"]["totalCount"].push({ "$count": "count" });

            const resp = await DataAccess.aggregate('customer_cmr_details', crieteria);
            // setCMRapprovalStatus(resp[0].data);

            return resp;
        } catch (error) {
            throw new Error(error);
        }
    },
    allBDactivity: async (loggedUser, bdstage, params) => {
        let query = { deleted: { $ne: 1 } };

        if (bdstage && !isEmpty(bdstage) && bdstage != 'awaitingApproval') {
            query['bdStage'] = { $eq: bdstage };
        } else if (bdstage && bdstage == 'awaitingApproval') {
            query['bd_flow'] = { $in: ['SUBMIT_S1_APPROVAL', 'SUBMIT_S2_APPROVAL', 'SUBMIT_S3_APPROVAL', 'SUBMIT_S4_APPROVAL'] };
        } else {
            query['bdStage'] = { $exists: true };
        }

        let bd_query = await mapBDQuery(loggedUser, query);
        console.log('BD list query: ', query);
        const crieteria = [
            {
                "$facet": {
                    "data": [
                        { $match: bd_query },
                        ...common_query.bdList.data
                    ], "totalCount": [
                        { $match: bd_query },
                        ...common_query.bdList.totalCount
                    ]
                }
            }
        ];

        if (params && !isEmpty(params)) {
            if (params.filters && Object.keys(params.filters).length > 0) {
                let filterKeys = Object.keys(params.filters)
                let filter = {};
                let totalMatch = crieteria[0]["$facet"]["totalCount"][0]["$match"];
                for (let i = 0; i < filterKeys.length; i++) {
                    filter[filterKeys[i]] = { "$regex": params.filters[filterKeys[i]].value, "$options": "i" }
                    // totalMatch[filterKeys[i]] = { "$regex": params.filters[filterKeys[i]].value, "$options": "i" }
                }
                crieteria[0]["$facet"]["data"].push({ "$match": filter });
            }
            if (params.sortField) {
                let sort = {};
                sort[params.sortField] = params.sortOrder
                crieteria[0]["$facet"]["data"].push({ "$sort": sort });
            }
            crieteria[0]["$facet"]["data"].push({ "$limit": params.first + params.rows });
            crieteria[0]["$facet"]["data"].push({ "$skip": params.first })
        }
        crieteria[0]["$facet"]["totalCount"].push({ "$count": "count" });
        return DataAccess.aggregate(collection_name, crieteria);
        // const resp = await DataAccess.aggregate(Modules().deals, crieteria);
    },


    listCMR: async (loggedUser, params) => {
        try {
            let match = params.match || {};
            let query = { deleted: { $ne: true }, ...match }
            if (params.resultFromMonth) {
                // Calculate the date as per the filter
                const givenMonthsAgoDate = new Date();
                givenMonthsAgoDate.setMonth(givenMonthsAgoDate.getMonth() - params.resultFromMonth);
                query['created_at'] = { $gte: givenMonthsAgoDate };
            }
            if (params.range) {
                if (params.range.created) {
                    query['created_at'] = { $gte: new Date(params.range.created.start_date), $lte: new Date(params.range.created.end_date) };
                }
                if (params.range.modified) {
                    query['modified_At'] = { $gte: new Date(params.range.modified.start_date), $lte: new Date(params.range.modified.end_date) };
                }
            }
            query = await mapCMRQuery(loggedUser, query);

            console.log('cmr list query: ', query);

            const crieteria = [
                {
                    "$facet": {
                        "data": [
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
                            ...common_query.cmrList.data
                        ],
                        "totalCount": [
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
                            //  Commenting the below line as it is taking more time to execute
                            // ...common_query.cmrList.totalCount
                        ]
                    }
                }];
            if (params && !isEmpty(params)) {
                if (params.filters && Object.keys(params.filters).length > 0) {
                    let filter = { deleted: { $ne: true } };
                    if (params.filters.match) {
                        filter = params.filters.match;
                        filter.deleted = { $ne: true }
                        delete params.filters.match;
                    }
                    let filterKeys = Object.keys(params.filters)


                    for (let key of filterKeys) {
                        if (key == 'customer_region_name') {
                            const ids = await getStringIds('region', 'region', params.filters[key].value)
                            key = 'RBU'
                            console.log('ids: ', ids);
                            filter[key] = { $in: ids }
                        } else {
                            filter[key] = { "$regex": params.filters[key].value, "$options": "i" }
                        }
                    }


                    crieteria[0]["$facet"]["data"].push({ "$match": filter });
                    crieteria[0]["$facet"]["totalCount"].push({ "$match": filter });
                }

                if (params.sortField) {
                    let sort = {};
                    sort[params.sortField] = params.sortOrder
                    crieteria[0]["$facet"]["data"].unshift({ "$sort": sort });
                } else {
                    crieteria[0]["$facet"]["data"].unshift({ "$sort": { "modified_At": -1 } });
                }
                if ((params.first || params.first == 0) && params.rows) {
                    crieteria[0]["$facet"]["data"].push({ "$limit": params.first + params.rows });
                    crieteria[0]["$facet"]["data"].push({ "$skip": params.first })
                }

            }

            crieteria[0]["$facet"]["totalCount"].push({ "$count": "count" });
            console.log('cmr list aggregate: ', JSON.stringify(crieteria[0]["$facet"]["data"]));
            const resp = await DataAccess.aggregate('customer_cmr_details', crieteria);
            // setCMRapprovalStatus(resp[0].data);

            return resp;
        } catch (error) {
            throw new Error(error);
        }
    },
    CMRlist: async (loggedUser, params) => {
        try {

            let query = { deleted: { $ne: true } }
            query = await mapCMRQuery(loggedUser, query);

            console.log('cmr list query: ', query);

            // db.getCollection('customer_cmr_details').find({"sample_orders.order_id" : { $exists: true, $gt: "0" }   }) 

            const crieteria = [
                {
                    "$facet": {
                        "data": [
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
                            { $match: { "sample_orders.order_id": { $exists: true, $gt: "0" } } },
                            ...common_query.cmrList.data
                        ],
                        "totalCount": [
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
                            { $match: { "sample_orders.order_id": { $exists: true, $gt: "0" } } },
                            ...common_query.cmrList.totalCount
                        ]
                    }
                }];
            if (params && !isEmpty(params)) {
                if (params.filters && Object.keys(params.filters).length > 0) {
                    let filterKeys = Object.keys(params.filters)
                    let filter = { deleted: { $ne: true } };
                    for (let key of filterKeys) {
                        if (key == 'customer_region_name') {
                            const ids = await getStringIds('region', 'region', params.filters[key].value)
                            key = 'RBU'
                            console.log('ids: ', ids);
                            filter[key] = { $in: ids }
                        } else {
                            filter[key] = { "$regex": params.filters[key].value, "$options": "i" }
                        }
                    }

                    crieteria[0]["$facet"]["data"].push({ "$match": filter });
                    crieteria[0]["$facet"]["totalCount"].push({ "$match": filter });
                }

                if (params.sortField) {
                    let sort = {};
                    sort[params.sortField] = params.sortOrder
                    crieteria[0]["$facet"]["data"].unshift({ "$sort": sort });
                }

                crieteria[0]["$facet"]["data"].push({ "$limit": params.first + params.rows });
                crieteria[0]["$facet"]["data"].push({ "$skip": params.first })
            }

            crieteria[0]["$facet"]["totalCount"].push({ "$count": "count" });

            const resp = await DataAccess.aggregate('customer_cmr_details', crieteria);
            // setCMRapprovalStatus(resp[0].data);

            return resp;
        } catch (error) {
            throw new Error(error);
        }
    },
    CMR_WaitingForApproval: async (loggedUser, params) => {
        try {
            // let query = { deleted: { $ne: true }, customer_id: { $in: customerIds }, };
            let query = { deleted: { $ne: true }, };

            let canlListAllCMR = checkDatalListingPermission(loggedUser.group).cmr;

            if (!canlListAllCMR) {
                let customerIds = await getCustomerIdsToListCMR(loggedUser, query);
                console.log('canlListAllCMR: ', customerIds);
                query['customer_id'] = { $in: customerIds }
            }

            setApprovalStageQuery(query, loggedUser, params);

            console.log('CMR AA: ', JSON.stringify(query));

            const crieteria = [
                {
                    "$facet": {
                        "data": [
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
                            ...common_query.cmrAwaitingList.data
                        ]
                        , "totalCount": [
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
                            ...common_query.cmrAwaitingList.totalCount
                        ]
                    }
                }];
            if (params && !isEmpty(params)) {

                if (params.filters && Object.keys(params.filters).length > 0) {
                    let filterKeys = Object.keys(params.filters)
                    let filter = {

                    };
                    for (let i = 0; i < filterKeys.length; i++) {
                        if (filterKeys[i] == 'customer_region_name') {
                            const ids = await getStringIds('region', 'region', params.filters[filterKeys[i]].value)
                            filterKeys[i] = 'RBU'
                            console.log('ids: ', ids);
                            filter[filterKeys[i]] = { $in: ids }
                        } else {
                            filter[filterKeys[i]] = { "$regex": params.filters[filterKeys[i]].value, "$options": "i" }
                        }
                    }
                    crieteria[0]["$facet"]["data"].push({ "$match": filter });
                    crieteria[0]["$facet"]["totalCount"].push({ "$match": filter });

                }

                if (params.sortField) {
                    let sort = {

                    };
                    sort[params.sortField] = params.sortOrder
                    crieteria[0]["$facet"]["data"].unshift({ "$sort": sort });
                }
                if (params.rows) {
                    crieteria[0]["$facet"]["data"].push({ "$limit": params.first + params.rows });
                    crieteria[0]["$facet"]["data"].push({ "$skip": params.first })
                }
            }
            crieteria[0]["$facet"]["totalCount"].push({ "$count": "count" });

            const data = await DataAccess.aggregate('customer_cmr_details', crieteria);
            // setCMRapprovalStatus(data[0].data);
            return data;
        } catch (error) {
            throw new Error(error);
        }
    },

    listCustomersToLink: (body) => {
        let collectionName;
        let customers = [];
        let id;
        let foreignField;
        if (!isEmpty(body.contactId)) {
            collectionName = 'contacts';
            id = body.contactId;
            foreignField = 'linked_contacts.contactId';
        }

        if (!isEmpty(body.staffId)) {
            collectionName = 'users';
            id = body.staffId;
            foreignField = 'linked_staff.staffId';
        }

        const crieteria = ([
            { $match: { _id: ObjectId(id) } },
            { $lookup: { from: collection_name, localField: '_id', foreignField: foreignField, as: 'linked_customers' } },
            {
                $project: {
                    'createdBy_details.password': 0, 'linked_customers.linked_staff': 0,
                    'linked_customers.targets': 0, 'linked_customers.phone': 0, 'linked_customers.address': 0,
                    'createdBy_details.phone': 0, 'createdBy_details.address': 0, 'linked_customers.customer_region': 0,
                    'linked_customers.customer_area': 0, 'linked_customers.customer_zone': 0, 'linked_customers.customer_business_group': 0,
                    'linked_customers.customer_business_division': 0, 'linked_customers.customer_business_category': 0, 'linked_customers.customer_referred_by': 0,
                    'linked_customers.linked_contacts': 0, 'linked_customers.customer_code': 0, 'linked_customers.customer_postCode': 0,
                    'linked_customers.deleted': 0, 'linked_customers.created_at': 0, 'linked_customers.created_by': 0,
                }
            }
        ]);

        return DataAccess.aggregate(collectionName, crieteria).then((contactDetails) => {
            if (contactDetails) {
                if (!isEmpty(contactDetails[0].linked_customers)) {
                    contactDetails[0].linked_customers.forEach(customer => {
                        customers.push(ObjectId(customer._id));
                    });
                }
            }
            const crieteria = [
                { $match: { _id: { $nin: customers }, deleted: { $ne: 1 } } },
                { $project: { _id: 1, customer_name: 1 } }
            ];
            return DataAccess.aggregate(collection_name, crieteria);
        });
    },

    create: async (body, loggedUser, isCustomer) => {
        try {
            console.log('create customer body: ', body);

            convertToObjectIds(loggedUser, body);
            if (!body.isDealersCustomer) {
                setBDActivityFlow(body);
            }
            acl.allowUser('customer', loggedUser, body);
            setBusinessUnit(body);
            if (isCustomer) {
                body.dataType = 'customer';
            } else {
                body.dataType = 'lead';
            }
            console.log('customer created model: ', body);
            const resp = await DataAccess.InsertOne(collection_name, body);
            if (body.isDealer && body.isDealer === 'yes') { createdDealer(resp[0], loggedUser) }
            if (body.reference_lead_id) {
                if (body.bdStage && body.bdStage == 's1') {
                    saveCustomerActivity({
                        module: Modules().customer,
                        action: auditActions().bd_update,
                        documentId: ObjectId(resp[0]._id),
                        userId: ObjectId(loggedUser._id),
                        data: {
                            moved_from: 'lead',
                            moved_to: body.bdStage,
                            moved_date: new Date(),
                            bd_flow_id: body.bd_flow_id
                        },
                        message: 'moved the lead to ' + body.bdStage
                    });

                    getPermissionOfLeadCreator(body.reference_lead_id).then((leadPermissions) => {
                        setCustomerPermission(leadPermissions, resp[0]._id, resp[0]);
                    });

                }
            } else {
                saveCustomerActivity({
                    module: Modules().customer,
                    action: auditActions().create,
                    documentId: ObjectId(resp[0]._id),
                    userId: ObjectId(loggedUser._id),
                    data: resp[0],
                    message: 'Created a Customer ${body.customer_code}'
                });
            }

            // set creator as linked staff
            const dataToLinkedStaff = {
                staffId: body.created_by,
                addedBy: body.created_by,
                linked_on: new Date()
            };
            model.linkStaff(resp[0]._id, [dataToLinkedStaff], loggedUser);
            return resp[0];
        } catch (error) {
            throw new Error(error)
        }
    },

    update: async (id, body, loggedUser, isCustomer) => {
        if (isCustomer) {
            body.dataType = 'customer';
        } else {
            body.dataType = 'lead';
        }
        const oldData = await DataAccess.findOne(collection_name, { _id: ObjectId(id) });
        if (body.bdStateChanged && body.bd_flow === 'APPROVED_S1_APPROVAL' && body.bdStage === 's2') {
            CreateRespMatrix(id, oldData, body)
        }
        if (!body.bd_activity && !oldData.bd_activity) {
            body.bd_activity = [];
        }
        if (body && body.fromBD) {
            if (body.currentStage && !oldData.bdStage) {
                oldData.bd_activity.push(
                    {
                        bdStage: 's1',
                        moved_from: body.currentStage,
                        moved_to: body.bdStage,
                        moved_date: new Date(),
                    }
                );
            } else if (body.currentStage > oldData.bdStage) {
                oldData.bd_activity.push(
                    {
                        bdStage: body.bdStage,
                        moved_from: oldData.bdStage,
                        moved_to: body.bdStage,
                        moved_date: new Date(),
                    }
                );
            } else if (body.currentStage && (!oldData.bd_activity || oldData.bd_activity.length == 0)) {
                oldData.bd_activity = [];
                oldData.bd_activity.push(
                    {
                        bdStage: 's1',
                        moved_from: "s1",
                        moved_to: body.bdStage,
                        moved_date: new Date(),
                    }
                );
            }
            body.bd_activity = oldData.bd_activity;

        }

        if (!body.isDealersCustomer) {
            body.crm_sync = 1;
        }

        if (body.crm_division === 'EXMO' || body.crm_division === 'NOWO') {
            body.crm_brand_region = "NA"
        }

        const updateResp = await DataAccess.UpdateOne(collection_name, { _id: ObjectId(id) }, { $set: body });


        let customerCode = '';
        if (body.customer_code !== null && !isUndefined(body.customer_code)) {
            customerCode = body.customer_code;
        } else if (oldData.customer_code !== null && !isUndefined(oldData.customer_code)) {
            customerCode = oldData.customer_code;
        } else {
            if (body.customer_name && body.customer_name !== null && !isUndefined(body.customer_name)) {
                customerCode = body.customer_name;
            } else if (oldData.customer_name !== null && !isUndefined(oldData.customer_name)) {
                customerCode = oldData.customer_name;
            }
        }


        if (updateResp.modifiedCount > 0) {
            if (!body.customer_category) body.customer_category = oldData.customer_category;

            saveCustomerActivity({
                module: Modules().customer,
                action: auditActions().update,
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: body,
                message: `Updated the Customer ${customerCode}`
            });
            if (body && body.fromBD) {
                if (body.currentStage && !oldData.bdStage) {
                    saveCustomerActivity({
                        module: Modules().customer,
                        action: auditActions().bd_update,
                        documentId: ObjectId(id),
                        userId: ObjectId(loggedUser._id),
                        data: {
                            moved_from: 's1',
                            moved_to: body.currentStage,
                            moved_date: new Date(),
                            bd_flow_id: body.bd_flow_id || oldData.bd_flow_id
                        },
                        message: 'moved the ' + bdModule + ' to ' + body.currentStage
                    });
                } else if (body.currentStage > oldData.bdStage) {
                    saveCustomerActivity({
                        module: Modules().customer,
                        action: auditActions().bd_update,
                        documentId: ObjectId(id),
                        userId: ObjectId(loggedUser._id),
                        data: {
                            moved_from: oldData.bdStage,
                            moved_to: body.currentStage,
                            moved_date: new Date(),
                            bd_flow_id: body.bd_flow_id || oldData.bd_flow_id
                        },
                        message: 'moved the ' + bdModule + ' to ' + body.currentStage
                    });
                }
                if (body.bd_flow_id > oldData.bd_flow_id) {
                    saveCustomerActivity({
                        module: Modules().customer,
                        action: auditActions().bd_flow_id_update,
                        documentId: ObjectId(id),
                        userId: ObjectId(loggedUser._id),
                        data: {
                            from_flow_id: oldData.bd_flow_id,
                            to_flow_id: body.bd_flow_id,
                            moved_date: new Date(),
                            bd_flow_message: body.bd_flow_message,
                            dataType: oldData.dataType
                        },
                        message: oldData.dataType + ' ' + body.bd_flow_message,
                    });
                }
            }

        }
        return updateResp.modifiedCount > 0 ? 1 : 0;
    },
    updateSingleCMR: (id, body) => {
        body.modified_At = new Date();
        return DataAccess.UpdateOne('customer_cmr_details', { _id: ObjectId(id) }, { $set: body });
    },
    distinctCMRList: (type) => {
        const collections = collection('customer_cmr_details');
        return collections.distinct(type);
    },
    customerPotential: async (filters) => {

        const items = ["polymer", "blackMb", "whiteMb", "colourMb", "afmb", "modifier", "transfills", "additives", "printing_inks", "waxes", "any_other"];

        const results = [];
        for (const item of items) {
            let customerMatch = { "is_steady": { $ne: true }, ["input_material." + item]: { $exists: true, $ne: "" } };
            if (filters.user && filters.user != -1) {
                customerMatch.created_by = ObjectId(filters.user);
            }
            if (filters.rangeDates && filters.rangeDates.length > 1) {
                // @ts-ignore
                customerMatch.created_at = { "$gte": new Date(filters.rangeDates[0]), "$lte": new Date(filters.rangeDates[1]) }
            }
            const critreia = [
                { $match: customerMatch },
                {
                    $addFields: {
                        [item + "db"]: { "$toDouble": "$input_material." + item }
                    }
                },
                { $match: { [item + "db"]: { $gt: 0 } } },
                {
                    $group: {
                        _id: null,
                        [item]: { $sum: "$" + item + "db" },
                        customers: { $sum: 1 },
                    }
                }
            ];
            const bdResult = await DataAccess.aggregate('customer', critreia);
            let bdCustomers = 0;
            let bdPotential = 0;
            let bdPotential40 = 0;
            if (bdResult[0]) {
                bdCustomers = bdResult[0].customers;
                bdPotential = bdResult[0][item];
                bdPotential40 = bdPotential * 0.4
            }
            // @ts-ignore
            (critreia[0]).$match.is_steady = { $eq: true };
            const steadyResult = await DataAccess.aggregate('customer', critreia);
            let steadyCustomers = 0;
            let steadyPotential = 0;
            let steadyPotential40 = 0;
            if (steadyResult[0]) {
                steadyCustomers = steadyResult[0].customers;
                steadyPotential = steadyResult[0][item];
                steadyPotential40 = steadyPotential * 0.4
            }
            let totalCustomers = bdCustomers + steadyCustomers;
            let totalPotential = bdPotential + steadyPotential;
            let totalPotential40 = bdPotential40 + steadyPotential40;
            results.push({
                item: item,
                bdCustomers,
                bdPotential,
                bdPotential40,
                steadyCustomers,
                steadyPotential,
                steadyPotential40,
                totalCustomers,
                totalPotential,
                totalPotential40

            })
        }
        return results;
    },
    cmrPorential: (filters) => {

        let groupBy = filters.groupBy;
        let cmrMatch = {};
        cmrMatch[groupBy] = { $exists: true, $ne: "" }
        if (filters.user && filters.user != -1) {
            cmrMatch.created_by = ObjectId(filters.user);
        }
        if (filters.rangeDates && filters.rangeDates.length > 1) {
            // @ts-ignore
            cmrMatch.created_at = { "$gte": new Date(filters.rangeDates[0]), "$lte": new Date(filters.rangeDates[1]) }
        }
        let matchCustQuery = {};

        let regions = [];
        let areas = [];
        let zones = [];

        if (filters.cmr && !isEmpty(filters.cmr.industry)) {
            cmrMatch['quantity_requirement.process'] = { $in: filters.cmr.industry };
        }
        if (filters.cmr && !isEmpty(filters.cmr.brand)) {
            cmrMatch['quantity_requirement.brand_name'] = { $in: filters.cmr.brand };
        }
        if (filters.cmr && !isEmpty(filters.cmr.segment)) {
            cmrMatch['quantity_requirement.segment'] = { $in: filters.cmr.segment };
        }
        if (filters.cmr && !isEmpty(filters.cmr.endApplication)) {
            cmrMatch['quantity_requirement.end_application'] = { $in: filters.cmr.endApplication };
        }


        if (filters.customer && !isEmpty(filters.customer.region)) {
            // matchCustQuery['customer.customer_region'] = { $in: filters.customer.region }
            filters.customer.region.forEach(element => {
                regions.push(ObjectId(element));
            });
            matchCustQuery['customer.customer_region'] = { $in: regions };
        }

        if (filters.customer && !isEmpty(filters.customer.area)) {
            filters.customer.area.forEach(element => {
                areas.push(ObjectId(element));
            });
            matchCustQuery['customer.customer_area'] = { $in: areas };
        }

        if (filters.customer && !isEmpty(filters.customer.zone)) {
            filters.customer.zone.forEach(element => {
                zones.push(ObjectId(element));
            });
            matchCustQuery['customer.customer_zone'] = { $in: zones };
        }

        if (filters.customer && !isEmpty(filters.customer.businessunit)) {
            matchCustQuery['customer.businessunit'] = { $in: filters.customer.businessunit };
        }

        if (filters.customer && !isEmpty(filters.customer.businesscode)) {
            matchCustQuery['customer.businesscode'] = { $in: filters.customer.businesscode };
        }

        if (filters.customer && !isEmpty(filters.customer.businessdivision)) {
            matchCustQuery['customer.crm_division'] = { $in: filters.customer.businessdivision };
        }

        if (filters.customer && !isEmpty(filters.customer.customer_category)) {
            matchCustQuery['customer.customer_category'] = { $in: filters.customer.customer_category };
        }
        return DataAccess.aggregate('customer_cmr_details', [
            { $match: cmrMatch },
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
            { $lookup: { from: 'customer', localField: 'customer_id', foreignField: '_id', as: 'customer' } },
            { $unwind: '$customer' },
            { $match: matchCustQuery },
            {
                $group: {
                    _id: { code: "$" + groupBy },
                    customer_name: { $first: "$customer_name" },
                    item_category_code: { $first: "$item_category_code" },
                    customers: { $addToSet: "$customer_id" },
                    totalCmrs: { $sum: 1 },
                    potential_month: { $sum: "$quantity_requirement.potential_month" },
                    targeted_qnty: { $sum: "$quantity_requirement.targeted_qnty" },
                    potential40: { $sum: "$quantity_requirement.40_potential" },
                    end_application: { $first: "$quantity_requirement.end_application" },
                    segment: { $first: "$quantity_requirement.segment" },
                    brand_name: { $first: "$quantity_requirement.brand_name" },
                    industry: { $first: "$quantity_requirement.process" },
                }
            }

        ])
    },
    linkContacts: (id, body, currentLoggedUser) => {
        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .updateOne({ _id: ObjectId(id) }, { $push: { linked_contacts: { $each: body } }, $set: { modified_At: new Date() } }).then((result) => {
                    if (result.modifiedCount > 0) {
                        saveCustomerActivity({
                            module: Modules().contact,
                            action: auditActions().link,
                            documentId: ObjectId(id),
                            userId: ObjectId(currentLoggedUser._id),
                            data: body,
                            message: body.length > 1 ? 'linked ' + body.length + ' contacts' : 'linked a contact'
                        });

                        if (!isEmpty(body)) {
                            body.forEach(element => {
                                saveCustomerActivity({
                                    module: Modules().customer,
                                    action: auditActions().link,
                                    documentId: ObjectId(element.contactId),
                                    userId: ObjectId(currentLoggedUser._id),
                                    data: { customerId: id },
                                    message: 'linked a customer'
                                });
                            });
                        }
                    }
                    return result.modifiedCount > 0 ? 1 : 0;
                });
        }
    },
    unLinkContacts: (id, contactId, currentLoggedUser) => {
        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .updateOne({ _id: ObjectId(id) }, { $pull: { linked_contacts: { contactId: ObjectId(contactId) }, $set: { modified_At: new Date() } } }).then((resp) => {
                    if (resp.modifiedCount > 0) {
                        saveCustomerActivity({
                            module: Modules().customer,
                            // action: auditUnLinkAction,
                            action: auditActions().unlink,
                            documentId: ObjectId(id),
                            userId: ObjectId(currentLoggedUser._id),
                            data: [{ contactId: ObjectId(contactId) }],
                            message: 'unlinked a contact'
                        });
                        saveCustomerActivity({
                            module: Modules().contact,
                            action: auditActions().unlink,
                            documentId: ObjectId(contactId),
                            userId: ObjectId(currentLoggedUser._id),
                            data: [{ customerId: ObjectId(contactId) }],
                            message: 'unlinked a customer'
                        });
                    }
                    return resp.modifiedCount > 0 ? 1 : 0;
                });
        }
    },
    linkStaff: async (id, body, currentLoggedUser) => {

        let linkedStaffsObjectId = [];
        let linkedStaffs = [];
        body.forEach(element => {
            linkedStaffs.push(element.staffId.toString());
            linkedStaffsObjectId.push(element.staffId);
        });

        let crieteria = {
            _id: ObjectId(id),
            'linked_staff.staffId': { $nin: linkedStaffsObjectId },
        };

        let doc = {
            $set: { modified_At: new Date() },
            $push: {
                linked_staff: { $each: body },
            },
            $addToSet: {
                'acl_meta.users': { $each: linkedStaffs }
            }
        };

        const result = await DataAccess.UpdateOne(collection_name, crieteria, doc);
        if (result.modifiedCount > 0) {
            saveCustomerActivity({
                module: Modules().user,
                action: auditActions().link,
                documentId: ObjectId(id),
                userId: ObjectId(currentLoggedUser._id),
                data: body,
                message: body.length > 1 ? 'linked ' + body.length + ' staff' : 'linked a staff',
            });
            if (!isEmpty(body)) {
                body.forEach(element => {
                    saveCustomerActivity({
                        module: Modules().customer,
                        action: auditActions().link,
                        documentId: ObjectId(element.staffId),
                        userId: ObjectId(currentLoggedUser._id),
                        data: { customerId: id },
                        message: 'linked a customer',
                    });
                });
            }
        }
        return result.modifiedCount > 0 ? 1 : 0;
    },
    unLinkStaff: (id, staffId, currentLoggedUser) => {
        if (mydb) {
            const collections = collection(collection_name);
            return collections
                // .updateOne({ _id: ObjectId(id) }, { $pull: { linked_staff: { staffId: ObjectId(staffId) } } }).then((resp) => {
                .updateOne({ _id: ObjectId(id) }, { $pull: { linked_staff: { staffId: ObjectId(staffId) }, 'acl_meta.users': staffId }, $set: { modified_At: new Date() } }).then((resp) => {
                    if (resp.modifiedCount > 0) {
                        saveCustomerActivity({
                            module: Modules().customer,
                            action: auditActions().unlink,
                            documentId: ObjectId(id),
                            userId: ObjectId(currentLoggedUser._id),
                            data: [{ userId: ObjectId(staffId) }],
                            message: 'unlinked a staff',
                        });

                        saveCustomerActivity({
                            module: Modules().user,
                            action: auditActions().unlink,
                            documentId: ObjectId(staffId),
                            userId: ObjectId(currentLoggedUser._id),
                            data: [{ customerId: ObjectId(id) }],
                            message: 'unlinked a customer',
                        });
                    }
                    return resp.modifiedCount > 0 ? 1 : 0;
                });
        }
    },
    addTargets: (id, body, loggedUser) => {
        return DataAccess.UpdateOne(collection_name, { _id: ObjectId(id) }, { $push: { targets: body }, $set: { modified_At: new Date() } }).then((result) => {
            if (result.modifiedCount > 0) {
                saveCustomerActivity({
                    module: Modules().customer,
                    action: auditActions().create,
                    documentId: ObjectId(id),
                    userId: ObjectId(loggedUser._id),
                    data: body,
                    message: 'added a target',
                });
            }
            return result.modifiedCount > 0 ? 1 : 0;
        });

    },
    updateTargets: (id, targetId, body, loggedUser) => {

        return DataAccess.UpdateOne(collection_name, { _id: ObjectId(id), 'targets.targetId': ObjectId(targetId) },
            {
                $set: {
                    'targets.$.start_date': body.start_date,
                    'targets.$.end_date': body.end_date,
                    'targets.$.rm_tonnage': body.rm_tonnage,
                    'targets.$.shortfall_target': body.shortfall_target,
                    'targets.$.rm_projection': body.rm_projection,
                    'targets.$.targets_in_tonnage': body.targets_in_tonnage
                }
            })
            .then((result) => {
                if (result.modifiedCount > 0) {
                    saveCustomerActivity({
                        module: Modules().customer,
                        action: auditActions().update,
                        documentId: ObjectId(id),
                        userId: ObjectId(loggedUser._id),
                        data: body,
                        message: 'updated a target',
                    });
                }
                return result.modifiedCount > 0 ? 1 : 0;
            });
    },
    deleteTargets: (id, targetId, loggedUser) => {
        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .updateOne({ _id: ObjectId(id) }, { $pull: { targets: { targetId: ObjectId(targetId) } }, $set: { modified_At: new Date() } }).then((result) => {
                    if (result.modifiedCount > 0) {
                        saveCustomerActivity({
                            module: Modules().customer,
                            action: auditActions().Delete,
                            documentId: ObjectId(id),
                            userId: ObjectId(loggedUser._id),
                            data: [{ targetId: ObjectId(targetId) }],
                            message: 'updated a target',
                        });
                    }
                    return result.modifiedCount > 0 ? 1 : 0;
                });

        }
    },
    deleteById: (id, loggedUser) => {
        return DataAccess.UpdateOne(collection_name, { _id: ObjectId(id) }, { $set: { deleted: 1, modified_At: new Date() } })
            .then((result) => {
                if (result.modifiedCount > 0) {
                    saveCustomerActivity({
                        module: Modules().customer,
                        action: auditActions().Delete,
                        documentId: ObjectId(id),
                        userId: ObjectId(loggedUser._id),
                        data: [{ cuustomerId: ObjectId(id) }],
                        message: 'deleted a customer'
                    });

                    deleteNotes(id);

                    DataAccess.findAll('scheduler', { associated_with: ObjectId(id) }).then((found) => {
                        if (!isEmpty(found)) {
                            found.forEach(ele => {
                                DataAccess.UpdateOne('scheduler', { _id: ObjectId(ele._id) }, { $set: { associated_with: '', associated_radio_with: 'custom' } });
                                saveCustomerActivity({
                                    module: Modules().customer,
                                    action: auditActions().Delete,
                                    documentId: ObjectId(ele._id),
                                    userId: ObjectId(loggedUser._id),
                                    data: [{ customerId: ObjectId(id) }],
                                    message: 'deleted the Associated customer',
                                });
                            });
                        }
                    });
                    DataAccess.findOne(collection_name, { _id: ObjectId(id) }).then((customerDetails) => {
                        if (!isEmpty(customerDetails.linked_contacts)) {
                            customerDetails.linked_contacts.forEach(contact => {
                                saveCustomerActivity({
                                    module: Modules().customer,
                                    action: auditActions().Delete,
                                    documentId: ObjectId(contact.contactId),
                                    userId: ObjectId(loggedUser._id),
                                    data: [{ customerId: ObjectId(id) }],
                                    message: 'deleted the linked customer',
                                });
                            });
                        }

                        if (!isEmpty(customerDetails.linked_staff)) {
                            customerDetails.linked_staff.forEach(staff => {
                                saveCustomerActivity({
                                    module: Modules().customer,
                                    action: auditActions().Delete,
                                    documentId: ObjectId(staff.staffId),
                                    userId: ObjectId(loggedUser._id),
                                    data: [{ customerId: ObjectId(id) }],
                                    message: 'deleted the linked customer',
                                });
                            });
                        }
                    });
                    DataAccess.UpdateOne(collection_name, { _id: ObjectId(id) }, { $set: { linked_contacts: [], linked_staff: [] } });
                }

                return result.matchedCount > 0 ? 1 : 0;
            });
    },

    linkMarketInfo: (id, body, currentLoggedUser) => {
        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .updateOne({ _id: ObjectId(id) }, { $push: { linked_marketInfo: { $each: body } }, $set: { modified_At: new Date() } }).then((result) => {
                    if (result.modifiedCount > 0) {
                        saveCustomerActivity({
                            module: Modules().customer,
                            action: auditActions().link,
                            documentId: ObjectId(id),
                            userId: ObjectId(currentLoggedUser._id),
                            data: body,
                            message: 'linked a market info'
                        });
                    }
                    return result.modifiedCount > 0 ? 1 : 0;
                });
        }
    },

    linkCustomer_Quantity_Requirement: (id, body, currentLoggedUser) => {
        const crieteria = { _id: ObjectId(id) };
        const doc = {
            $set: { modified_At: new Date() },
            $push: { linked_customer_quantity_requirements: { $each: body } }
        };
        return DataAccess.UpdateOne(collection_name, crieteria, doc).then((result) => {
            if (result.modifiedCount > 0) {
                saveCustomerActivity({
                    module: Modules().customer,
                    action: auditActions().link,
                    documentId: ObjectId(id),
                    userId: ObjectId(currentLoggedUser._id),
                    data: body,
                    message: 'linked a customer quantity requiremens'
                });
            }
            return result.modifiedCount > 0 ? 1 : result;
        });
    },

    linkCustomer_Input_Material_Details: (id, body, currentLoggedUser) => {
        const crieteria = { _id: ObjectId(id) };
        const doc = {
            $set: { modified_At: new Date() },
            $push: { linked_customer_input_materials: { $each: body } }
        };
        return DataAccess.UpdateOne(collection_name, crieteria, doc).then((result) => {
            if (result.modifiedCount > 0) {
                saveCustomerActivity({
                    module: Modules().customer,
                    action: auditActions().link,
                    documentId: ObjectId(id),
                    userId: ObjectId(currentLoggedUser._id),
                    data: body,
                    message: 'linked a customer input material details'
                });
            }
            return result.modifiedCount > 0 ? 1 : result;
        });
    },
    link_customer_sample_order: (id, body, currentLoggedUser) => {
        const crieteria = { _id: ObjectId(id) };
        const doc = {
            $set: { modified_At: new Date() },
            $push: { linked_customer_sample_order: { $each: body } }
        };
        return DataAccess.UpdateOne(collection_name, crieteria, doc).then((result) => {
            if (result.modifiedCount > 0) {
                saveCustomerActivity({
                    module: Modules().customer,
                    action: auditActions().link,
                    documentId: ObjectId(id),
                    userId: ObjectId(currentLoggedUser._id),
                    data: body,
                    message: 'linked a customer sample order'
                });
            }
            return result.modifiedCount > 0 ? 1 : result;
        });
    },
    linkCustomer_Material_Details: (id, body, currentLoggedUser) => {
        const crieteria = { _id: ObjectId(id) };
        const doc = {
            $push: { linked_customer_materials: { $each: body } },
            $set: { modified_At: new Date() }
        };
        return DataAccess.UpdateOne(collection_name, crieteria, doc).then((result) => {
            if (result.modifiedCount > 0) {
                saveCustomerActivity({
                    module: Modules().customer,
                    action: auditActions().link,
                    documentId: ObjectId(id),
                    userId: ObjectId(currentLoggedUser._id),
                    data: body,
                    message: 'linked a customer material details'
                });
            }
            return result.modifiedCount > 0 ? 1 : result;
        });
    },
    linkCustomer_Procurement_Cycle: (id, body, currentLoggedUser) => {
        const crieteria = { _id: ObjectId(id) };
        const doc = {
            $push: { linked_customer_procurement_cycle: { $each: body } },
            $set: { modified_At: new Date() }
        };
        return DataAccess.UpdateOne(collection_name, crieteria, doc).then((result) => {
            if (result.modifiedCount > 0) {
                saveCustomerActivity({
                    module: Modules().customer,
                    // action: auditLinkAction,
                    action: auditActions().link,
                    documentId: ObjectId(id),
                    userId: ObjectId(currentLoggedUser._id),
                    data: body,
                    message: 'linked a customer procurement cycle'
                });
            }
            return result.modifiedCount > 0 ? 1 : result;
        });
    },

    linkCustomer_Machinery_details: (id, body, currentLoggedUser) => {
        const crieteria = { _id: ObjectId(id) };
        const doc = {
            $push: { linked_customer_machinery_details: { $each: body } },
            $set: { modified_At: new Date() }
        };
        return DataAccess.UpdateOne(collection_name, crieteria, doc).then((result) => {
            if (result.modifiedCount > 0) {
                saveCustomerActivity({
                    module: Modules().customer,
                    // action: auditLinkAction,
                    action: auditActions().link,
                    documentId: ObjectId(id),
                    userId: ObjectId(currentLoggedUser._id),
                    data: body,
                    message: 'linked a customer machinery details'
                });
            }
            return result.modifiedCount > 0 ? 1 : result;
        });
    },

    linkCMR_details: (id, body, currentLoggedUser) => {
        const crieteria = { _id: ObjectId(id) };
        const doc = {
            $push: { linked_cmr_details: { $each: body } },
            $set: { modified_At: new Date() }
        };
        return DataAccess.UpdateOne(collection_name, crieteria, doc).then((result) => {
            return result.modifiedCount > 0 ? 1 : result;
        });
    },
    listCustomerCategory: (filter) => {
        console.log("SyncCustomerCategory", filter);
        let crieteria = [];
        if (filter) {
            crieteria = [
                { $match: filter },
            ];
        }
        crieteria.push({ $sort: { subkey: 1 } });
        return DataAccess.aggregate('customer_category', crieteria);
    },
    listBDstages: () => {
        let crieteria = [
            { $match: { bd_stage: { $nin: ['s5', 's6', 's7'] } } },
        ];
        return DataAccess.aggregate('bdstage', crieteria);
    },

    linkResMatrixAsStaff: (id, body, currentLoggedUser) => {

        let linkedStaffsObjectId = [];
        let linkedStaffs = [];
        body.forEach(element => {
            linkedStaffs.push(element.staffId.toString());
            linkedStaffsObjectId.push(element.staffId);
        });

        let crieteria = {
            _id: ObjectId(id),
            'linked_staff.staffId': { $nin: linkedStaffsObjectId },
        };

        let doc = {
            $set: { modified_At: new Date() },
            $push: {
                linked_staff: { $each: body },
            },
            $addToSet: {
                'acl_meta.users': { $each: linkedStaffs }
            }
        };

        return DataAccess.UpdateOne(collection_name, crieteria, doc).then((result) => {
            if (result.modifiedCount > 0) {
                saveCustomerActivity({
                    module: Modules().customer,
                    // action: auditLinkAction,
                    action: auditActions().link,
                    documentId: new ObjectId(id),
                    userId: new ObjectId(currentLoggedUser._id),
                    data: body,
                    message: body.length > 1 ? 'linked ' + body.length + ' staff' : 'linked a staff',
                });
                if (!isEmpty(body)) {
                    body.forEach(element => {
                        saveCustomerActivity({
                            module: Modules().user,
                            // action: auditLinkAction,
                            action: auditActions().link,
                            documentId: ObjectId(element.staffId),
                            userId: ObjectId(currentLoggedUser._id),
                            data: element,
                            message: 'linked a customer',
                        });
                    });
                }
            }
            return result.modifiedCount > 0 ? 1 : 0;
        });
    },

    updateResponsibilityMatrix: async (params) => {
        try {
            if (!isEmpty(params.existing_staff) && !isEmpty(params.new_staff)) {
                const criteria = [];
                const customerIds = params.customerIds || [];
                const responsibilityMatrixFields = [
                    "primary_account_manager", "primary_field_coordinator", "primary_biss_development", 
                    "primary_technical_services", "primary_product_development", "primary_door_opener", 
                    "primary_salesOps", "secondary_account_manager", "secondary_field_coordinator", 
                    "secondary_biss_development", "secondary_technical_services", "secondary_product_development", 
                    "secondary_door_opener", "secondary_salesOps", "tertiary_account_manager", 
                    "tertiary_field_coordinator", "tertiary_biss_development", "tertiary_technical_services", 
                    "tertiary_product_development", "tertiary_door_opener", "tertiary_salesOps"
                ];
    
                const customerGroupFields = ["area_manager", "rbm", "sales_executive"];
    
                // Convert customerIds to ObjectId
                const customerObjectIds = customerIds.map(id => ObjectId(id));
    
                // Fetch employee details
                const existingEmpDetails = await User.findByEmpCode(params.existing_staff);
                const newEmpDetails = await User.findByEmpCode(params.new_staff);
    
                // Update for specific customer IDs if provided
                if (customerObjectIds.length > 0) {
                    customerObjectIds.forEach(customerId => {
                        responsibilityMatrixFields.forEach(field => {
                            const filter = {
                                "_id": customerId,
                                [`responsibility_matrix.${field}`]: params.existing_staff
                            };
                            const update = {
                                $set: {
                                    [`responsibility_matrix.${field}`]: params.new_staff,
                                    "crm_sync": 1
                                }
                            };
                            criteria.push({ updateMany: { filter, update } });
                        });
                        // Also check and update the fields outside responsibility_matrix
                        customerGroupFields.forEach(field => {
                            const filter = {
                                "_id": customerId,
                                [field]: params.existing_staff
                            };
                            const update = {
                                $set: {
                                    [field]: params.new_staff,
                                    "crm_sync": 1
                                }
                            };
                            criteria.push({ updateMany: { filter, update } });
                        });
                        // Check and update linked_staff array
                        const linkedStaffFilter = {
                            "_id": customerId,
                            "linked_staff.staffId": existingEmpDetails._id
                        };
                        const linkedStaffUpdate = {
                            $set: {
                                "linked_staff.$.staffId": newEmpDetails._id,
                                "crm_sync": 1
                            }
                        };
                        criteria.push({ updateMany: { filter: linkedStaffFilter, update: linkedStaffUpdate } });
                    });
                } else {
                    // Update for all documents when no specific customer IDs are provided
                    responsibilityMatrixFields.forEach(field => {
                        const filter = {
                            [`responsibility_matrix.${field}`]: params.existing_staff
                        };
                        const update = {
                            $set: {
                                [`responsibility_matrix.${field}`]: params.new_staff,
                                "crm_sync": 1
                            }
                        };
                        criteria.push({ updateMany: { filter, update } });
                    });
                    // Also check and update the fields outside responsibility_matrix
                    customerGroupFields.forEach(field => {
                        const filter = {
                            [field]: params.existing_staff
                        };
                        const update = {
                            $set: {
                                [field]: params.new_staff,
                                "crm_sync": 1
                            }
                        };
                        criteria.push({ updateMany: { filter, update } });
                    });
                    // Check and update linked_staff array
                    const linkedStaffFilter = {
                        "linked_staff.staffId": existingEmpDetails._id
                    };
                    const linkedStaffUpdate = {
                        $set: {
                            "linked_staff.$.staffId": newEmpDetails._id,
                            "crm_sync": 1
                        }
                    };
                    criteria.push({ updateMany: { filter: linkedStaffFilter, update: linkedStaffUpdate } });
                }
    
                return DataAccess.BulkWrite(collection_name, criteria);
            }
        } catch (error) {
            console.error('Error updating documents:', error);
            throw new Error(error);
        }
    }
};


module.exports = model;

function createdDealer(doc, loggedUser) {
    console.log('came to create dealer');

    let data = {}
    data.name = doc.customer_name;
    data.city = doc.customer_city;
    data.phone = doc.customer_phone;
    data.address1 = doc.customer_address1;
    data.address2 = doc.customer_address2;
    data.address2 = doc.customer_address2;
    data.email = doc.customer_email;
    data.postCode = doc.customer_postCode;
    data.state = doc.customer_state;
    data.country = doc.customer_country;
    data.region = doc.customer_region;
    data.area = doc.customer_area;
    data.zone = doc.customer_zone;
    data.category = doc.customer_category;
    data.crm_division = doc.crm_division;
    data.businesscode = doc.businesscode;
    data.businessunit = doc.businessunit;
    data.customerId = doc._id;

    Dealer.create(data, loggedUser).then((newDealer) => {
        console.log('new Dealer: ', newDealer);
        DataAccess.UpdateOne(Modules().customer, { _id: ObjectId(doc._id) }, { $set: { dealerId: newDealer[0]._id.toString() } })
    })
}

function convertToObjectIds(currentLoggedUser, body) {
    if (body.customer_state && ObjectId.isValid(body.customer_state)) {
        body.customer_state = ObjectId(body.customer_state);
    }
    if (body.customer_region) {
        // if (isArray(body.customer_region)) {
        //     body.customer_region = ObjectId(body.customer_region[0]);
        // }
        // else {
        body.customer_region = ObjectId(body.customer_region);
        // }
    }
    if (body.customer_area) {
        // if (isArray(body.customer_area)) {
        //     body.customer_area = ObjectId(body.customer_area[0]);
        // }
        // else {
        body.customer_area = ObjectId(body.customer_area);
        // }
    }
    if (body.customer_zone) {
        // if (isArray(body.customer_zone)) {
        //     body.customer_zone = ObjectId(body.customer_zone[0]);
        // }
        // else {
        body.customer_zone = ObjectId(body.customer_zone);
        // }
    }
    if (body.linked_staff && isArray(body.linked_staff)) {
        let arr = [];
        body.linked_staff.forEach(element => {
            arr.push({ staffId: ObjectId(element.staffId), addedBy: ObjectId(element.addedBy), linked_on: new Date(element.linked_on) });
        });
        body.linked_staff = arr;
    }
    else {
        body.linked_staff = [];
    }
    if (body.linked_contacts && isArray(body.linked_contacts)) {
        let arr = [];
        body.linked_contacts.forEach(element => {
            arr.push({ contactId: ObjectId(element.contactId), addedBy: ObjectId(element.addedBy), linked_on: new Date(element.linked_on) });
        });
        body.linked_contacts = arr;
    } else {
        body.linked_contacts = [];
    }
    // if (body.bd_stage && !isEmpty(body.bd_stage)) {
    //     body.bd_stage = ObjectId(body.bd_stage);
    // }
    if (body.reference_lead_id) {
        body.reference_lead_id = ObjectId(body.reference_lead_id);
    }
    body.targets = [];
    body.created_by = ObjectId(currentLoggedUser._id);
    body.created_at = new Date();
    body.modified_At = new Date();
    if (body._id) {
        body.offlineSyncId = body._id;
        delete body._id;
    }

    if (body.customer_country && body.businessunit) {
        setNumberSeries(body);
    }
}

function setBDActivityFlow(body) {
    if (!body.bd_activity) {
        body.bd_activity = [];
    }

    if (body.bdStage && body.bdStage == 's1') {
        body.bd_activated = 1;
        body.bdStage = 's1';
        body.bd_activity.push({
            bdStage: 's1',
            moved_from: 'lead',
            moved_to: body.bdStage,
            moved_date: new Date(),
        });
    }
}

function setBusinessUnit(body) {
    if (body.reference_lead_id) {
        if (isEmpty(body.businessunit) || body.businessunit == null) {
            body.businessunit = 'common';
        }
    }
}


async function getIds(collection, key, params) {
    const data = await DataAccess.aggregate(collection, [{ $match: { [key]: { $regex: params, $options: "i" } } }, /* { $project: { _id: 1 } } */])
    let array = [];
    for (const iterator of data) {
        array.push(iterator._id)
    }
    return array;
}
async function getStringIds(collection, key, params) {
    const data = await DataAccess.aggregate(collection, [{ $match: { [key]: { $regex: params, $options: "i" } } }, /* { $project: { _id: 1 } } */])
    let array = [];
    for (const iterator of data) {
        array.push(String(iterator._id))
    }
    return array;
}

async function getStateIds(collection, key, params) {
    const data = await DataAccess.aggregate(collection, [{ $match: { [key]: { $regex: params, $options: "i" } } }, /* { $project: { _id: 1 } } */])
    let array = [];
    for (const iterator of data) {
        array.push(iterator.stateCode)
    }
    return array;
}


let common_query = {
    customerList: {
        data: [
            { $lookup: { from: 'state', localField: 'customer_state', foreignField: 'stateCode', as: 'state_details' } },
            { $lookup: { from: 'region', localField: 'customer_region', foreignField: '_id', as: 'customer_region_details' } },
            { $lookup: { from: 'area', localField: 'customer_area', foreignField: '_id', as: 'customer_area_details' } },
            { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'createdBy_details' } },
            { $lookup: { from: 'zone', localField: 'customer_zone', foreignField: '_id', as: 'zone_details' } },
            {$addFields:{'customer_zone_name': { $arrayElemAt: ['$zone_details.zone_code', 0] }}},
            { $lookup: { from: 'users', localField: 'customer_assigned_to', foreignField: 'emp_code', as: 'customerAssignedToDetails' } },
            {$addFields: {'customer_assigned_to_name': {$concat: [{ $arrayElemAt:['$customerAssignedToDetails.first_name', 0] },' ',{ $arrayElemAt: ['$customerAssignedToDetails.last_name', 0] }]}}
            },
            {
                $project: {
                    _id: 1,
                    modified_At: 1,
                    customer_code: 1,
                    customer_name: 1,
                    customer_phone: 1,
                    customer_email: 1,
                    customer_address1: 1,
                    customer_address2: 1,
                    customer_postCode: 1,
                    customer_city: 1,
                    customer_state: 1,
                    customer_region: 1,
                    customer_area: 1,
                    customer_zone: 1,
                    customer_zone_name: 1,
                    businesscode: 1,
                    crm_division: 1,
                    businessunit: 1,
                    customer_category: 1,
                    customer_landmark: 1,
                    customer_status: 1,
                    customer_assigned_to: 1,
                    customer_assigned_to_name: 1,
                    location: 1,
                    nav_contact_no: 1,
                    customer_referred_by: 1,
                    bd_activated: { $ifNull: ["$bd_activated", 0] },
                    customer_state_name: { $arrayElemAt: ['$state_details.state', 0] },
                    customer_region_name: { $arrayElemAt: ['$customer_region_details.region', 0] },
                    customer_area_name: { $arrayElemAt: ['$customer_area_details.area', 0] },
                    // customer_zone_name: { $arrayElemAt: ['$customer_zone_details.zone', 0] },
                    created_by: { $concat: [{ $arrayElemAt: ['$createdBy_details.first_name', 0] }, ' ', { $arrayElemAt: ['$createdBy_details.last_name', 0] }] },
                    deleted: 1,
                    created_at: { $arrayElemAt: [formatDate('$created_at'), 0] },
                    bdStage: 1,
                    responsibility_matrix: 1,
                    area_manager: 1,
                    rbm: 1,
                    sales_executive: 1,
                    linked_staff: 1,
                    type: {
                        $cond: {
                            if: { $or: [{ $eq: ['$bdStage', 's1'] }, { $eq: ['$bdStage', 's2'] }, { $eq: ['$bdStage', 's3'] }] },
                            then: 'Lead', else: 'Customer'
                        }
                    },
                    isDealer: { $cond: { if: { $or: [{ $eq: ["$isDealer", ""] }, { $not: ["$isDealer"] }] }, then: "No", else: "$isDealer" } },

                }
            },
            { $sort: { 'modified_At': -1 } },
        ],
        totalCount: [
            {
                $project: {
                    customer_name: 1,
                    customer_phone: 1,
                    customer_email: 1,
                    customer_city: 1,
                    customer_state: 1,
                    customer_region: 1,
                    customer_area: 1,
                    customer_zone: 1,
                    crm_division: 1,
                    customer_category: 1,
                    created_at: formatDate('$created_at'),
                    type: {
                        $cond: {
                            if: { $or: [{ $eq: ['$bdStage', 's1'] }, { $eq: ['$bdStage', 's2'] }, { $eq: ['$bdStage', 's3'] }] },
                            then: 'Lead', else: 'Customer'
                        }
                    },
                    isDealer: 1
                }
            },
        ]
    },
    cmrList: {
        data: [

            { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'created_by_details' } },
            { $lookup: { from: 'users', localField: 'Approved_By', foreignField: 'emp_code', as: 'Approved_By_Details' } },
            { $lookup: { from: 'users', localField: 'Requested_By', foreignField: 'emp_code', as: 'Requested_By_Details' } },

            {
                $lookup: {
                    from: "region",
                    let: {
                        customerRegionId: "$RBU",
                    },
                    pipeline: [
                        {
                            $addFields: {
                                _id: {
                                    $convert: {
                                        input: '$_id',
                                        to: 'string',
                                        onError: 0
                                    }
                                },
                            }
                        },
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$_id", "$$customerRegionId"] },
                                    ]
                                }
                            }
                        },
                    ],
                    as: "customer_region_details"
                }
            },

            {
                $addFields: {
                    CMR_Status_Actual: '$CMR_Status'
                }
            },
            {
                $project: {
                    customer_id: 1,
                    CRM_CMR_No: 1,
                    customer_name: 1,
                    Customer_Category: 1,
                    Product_Group: 1,
                    CMR_Status_Actual: 1,
                    Target_sample_Colour: 1,
                    New_Product_Code: 1,
                    Equivalent_Code: 1,
                    opportunityStage: 1,
                    Nav_CMR_ID: 1,
                    Application_Type: 1,
                    opportunity_name: 1,
                    remarks: 1,
                    Request_Type: {
                        $switch: {
                            branches: [
                                { case: { $eq: ['$Request_Type', '1'] }, then: 'Colour Matching Request' },
                                { case: { $eq: ['$Request_Type', '2'] }, then: 'Existing Sample Request' },
                                { case: { $eq: ['$Request_Type', '3'] }, then: 'Mass Market Product Development' },

                            ],
                            default: ""
                        }
                    },
                    Customer_No: 1,
                    Matching_Status: 1,
                    Tech_approved_by: 1,
                    courier_tracing_no: 1,
                    potential_month: 1,
                    Target_Price_Range: 1,
                    Trial_Sample_quantity_Required_in_KG: 1,
                    order_date: 1,
                    Contact_No: 1,
                    sample_trails: 1,
                    customer_machinery_details: 1,
                    sales_quote_request: 1,
                    modified_At: 1,
                    orders: 1,
                    sample_orders: 1,
                    order_status: {
                        $switch: {
                            branches: [
                                { case: { $eq: ['$sample_orders.order_status', 0] }, then: 'To be Processed' },
                                { case: { $eq: ['$sample_orders.order_status', 1] }, then: 'Order Released in ERP' },
                                { case: { $eq: ['$sample_orders.order_status', 2] }, then: 'Approval Pending in ERP' },

                            ],
                            default: ""
                        }
                    },
                    approvals: 1,
                    CMRStatusCode: "$CMR_Status",
                    CMR_Status: getCMRStatusQuery(),
                    Requested_By: { $concat: [{ $arrayElemAt: ['$Requested_By_Details.first_name', 0] }, ' ', { $arrayElemAt: ['$Requested_By_Details.last_name', 0] }] },
                    Approved_By: { $concat: [{ $arrayElemAt: ['$Approved_By_Details.first_name', 0] }, ' ', { $arrayElemAt: ['$Approved_By_Details.last_name', 0] }] },
                    Application: {
                        $switch: {
                            branches: [
                                { case: { $eq: ['$Application', '1'] }, then: 'Extrusion' },
                                { case: { $eq: ['$Application', '2'] }, then: 'Molding' }
                            ],
                            default: ""
                        }
                    },
                    Requested_Date: 1,
                    customer_quantity_requirement: 1,
                    RBU: 1,
                    customer_region_name: { $arrayElemAt: ['$customer_region_details.region', 0] },
                    crm_sync: 1,
                    deleted: 1,
                    status: {
                        $switch: {
                            branches: [
                                { case: { $or: [{ $eq: ['$approvalStage', ''] }, { $eq: ['$approvalStage', null] }, { $eq: ['$approvalStage', undefined] }] }, then: 'Un Sent' },
                                { case: { $eq: ['$approvalStage', 1] }, then: 'Waiting for an Approval from Area Manager' },
                                { case: { $eq: ['$approvalStage', 2] }, then: 'Waiting for an Approval from RBM' },
                                { case: { $eq: ['$approvalStage', 3] }, then: 'Waiting for an Approval from CMR Approver' },
                                { case: { $eq: ['$approvalStage', 4] }, then: 'Approved by CMR Approver' },
                                { case: { $eq: ['$approvalStage', 5] }, then: 'Awaiting S4 Approval' },
                                { case: { $eq: ['$approvalStage', 6] }, then: 'Awaiting Trails' },
                                { case: { $eq: ['$approvalStage', 7] }, then: 'Awaiting Quote Request' },
                                { case: { $eq: ['$approvalStage', 8] }, then: 'First Order received' },
                                { case: { $eq: ['$approvalStage', 9] }, then: 'Second Order received' },
                                { case: { $eq: ['$approvalStage', 10] }, then: 'Third Order received' },
                            ],
                            default: ""
                        }
                    },
                    // created_at: { $concat: ['$day', '-', '$monthName', '-', '$year', ', ', '$hour', ':', '$minutes'] },
                    created_at: formatDate('$created_at'),
                    Customer_Type: 1,
                    created_by: { $concat: [{ $arrayElemAt: ['$created_by_details.first_name', 0] }, ' ', { $arrayElemAt: ['$created_by_details.last_name', 0] }] },
                    cmr_color: { $cond: { if: { $eq: ['$crm_sync', 99] }, then: '#FFA500', else: null } },
                    Estimated_completion_Date_of_Development: {
                        $cond: {
                          if: {
                            $and: [
                              { $eq: [{ $type: "$Estimated_completion_Date_of_Development" }, "date"] },
                              { $gte: ["$Estimated_completion_Date_of_Development", new Date(0)] },
                            ]
                          },
                          then: {
                            $dateToString: {
                                format: "%Y-%m-%dT%H:%M:%S.%LZ",
                              date: "$Estimated_completion_Date_of_Development"
                            }
                          },
                          else: null
                        }
                    },
                    Customer_Sample_sent_Date: {
                        $cond: {
                          if: {
                            $and: [
                              { $eq: [{ $type: "$Customer_Sample_sent_Date" }, "date"] },
                              { $gte: ["$Customer_Sample_sent_Date", new Date(0)] } 
                            ]
                          },
                          then: formatDate('$Customer_Sample_sent_Date'),
                          else: [null]
                        }
                    },
                    CMR_receipt_Date: {
                        $cond: {
                          if: {
                            $and: [
                              { $eq: [{ $type: "$CMR_receipt_Date" }, "date"] },
                              { $gte: ["$CMR_receipt_Date", new Date(0)] } 
                            ]
                          },
                          then: formatDate('$CMR_receipt_Date'),
                          else: [null] 
                        }
                    }
                }
            },
        ],
        totalCount: [
            { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'created_by_details' } },
            { $lookup: { from: 'users', localField: 'Approved_By', foreignField: 'emp_code', as: 'Approved_By_Details' } },
            { $lookup: { from: 'users', localField: 'Requested_By', foreignField: 'emp_code', as: 'Requested_By_Details' } },
            {
                $project: {
                    customer_id: 1,
                    CRM_CMR_No: 1,
                    customer_name: 1,
                    Customer_Category: 1,
                    Product_Group: 1,
                    opportunityStage: 1,
                    Requested_By: { $concat: [{ $arrayElemAt: ['$Requested_By_Details.first_name', 0] }, ' ', { $arrayElemAt: ['$Requested_By_Details.last_name', 0] }] },
                    Approved_By: { $concat: [{ $arrayElemAt: ['$Approved_By_Details.first_name', 0] }, ' ', { $arrayElemAt: ['$Approved_By_Details.last_name', 0] }] },
                    CMRStatusCode: "$CMR_Status",
                    CMR_Status: getCMRStatusQuery(),
                    Application: {
                        $switch: {
                            branches: [
                                { case: { $eq: ['$Application', '1'] }, then: 'Extrusion' },
                                { case: { $eq: ['$Application', '2'] }, then: 'Molding' }
                            ],
                            default: ""
                        }
                    },
                    Customer_Sample_sent_Date: formatDate('$Customer_Sample_sent_Date'),
                    CMR_receipt_Date: formatDate('$CMR_receipt_Date'),
                    Requested_Date: 1,
                    customer_quantity_requirement: 1,
                    RBU: 1,
                    deleted: 1,
                    approvalStage: 1,
                    Customer_Type: 1,
                    crm_sync: 1,
                    status: {
                        $switch: {
                            branches: [
                                { case: { $or: [{ $eq: ['$approvalStage', ''] }, { $eq: ['$approvalStage', null] }, { $eq: ['$approvalStage', undefined] }] }, then: 'Un Sent' },
                                { case: { $eq: ['$approvalStage', 1] }, then: 'Waiting for an Approval from Area Manager' },
                                { case: { $eq: ['$approvalStage', 2] }, then: 'Waiting for an Approval from RBM' },
                                { case: { $eq: ['$approvalStage', 3] }, then: 'Waiting for an Approval from CMR Approver' },
                                { case: { $eq: ['$approvalStage', 4] }, then: 'Approved by CMR Approver' },
                            ],
                            default: ""
                        }
                    },
                    CMR_Status_Actual: 1,
                    // created_at: { $concat: ['$day', '-', '$monthName', '-', '$year', ', ', '$hour', ':', '$minutes'] },
                    created_at: formatDate('$created_at'),
                    created_by: { $concat: [{ $arrayElemAt: ['$created_by_details.first_name', 0] }, ' ', { $arrayElemAt: ['$created_by_details.last_name', 0] }] },
                }
            },
        ],
    },

    cmrAwaitingList: {
        data: [
            { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'created_by_details' } },
            { $lookup: { from: 'users', localField: 'Approved_By', foreignField: 'emp_code', as: 'Approved_By_Details' } },
            { $lookup: { from: 'users', localField: 'Requested_By', foreignField: 'emp_code', as: 'Requested_By_Details' } },
            {
                $lookup: {
                    from: "region",
                    let: {
                        customerRegionId: "$RBU",
                    },
                    pipeline: [
                        {
                            $addFields: {
                                _id: {
                                    $convert: {
                                        input: '$_id',
                                        to: 'string',
                                        onError: 0
                                    }
                                },
                            }
                        },
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$_id", "$$customerRegionId"] },
                                    ]
                                }
                            }
                        },
                    ],
                    as: "customer_region_details"
                }
            },
            { $sort: { 'modified_At': -1 } },
            {
                $project: {
                    customer_id: 1,
                    CRM_CMR_No: 1,
                    customer_name: 1,
                    Customer_Category: 1,
                    Product_Group: 1,
                    CMR_Status: getCMRStatusQuery(),
                    Requested_By: { $concat: [{ $arrayElemAt: ['$Requested_By_Details.first_name', 0] }, ' ', { $arrayElemAt: ['$Requested_By_Details.last_name', 0] }] },
                    Approved_By: { $concat: [{ $arrayElemAt: ['$Approved_By_Details.first_name', 0] }, ' ', { $arrayElemAt: ['$Approved_By_Details.last_name', 0] }] },
                    Application: {
                        $switch: {
                            branches: [
                                { case: { $eq: ['$Application', '1'] }, then: 'Extrusion' },
                                { case: { $eq: ['$Application', '2'] }, then: 'Molding' }
                            ],
                            default: ""
                        }
                    },
                    Customer_Sample_sent_Date: formatDate('$Customer_Sample_sent_Date'),
                    CMR_receipt_Date: formatDate('$CMR_receipt_Date'),
                    Requested_Date: 1,
                    customer_quantity_requirement: 1,
                    RBU: 1,
                    customer_region_name: { $arrayElemAt: ['$customer_region_details.region', 0] },
                    crm_sync: 1,
                    deleted: 1,
                    Request_Type: {
                        $switch: {
                            branches: [
                                { case: { $eq: ['$Request_Type', '1'] }, then: 'Colour Matching Request' },
                                { case: { $eq: ['$Request_Type', '2'] }, then: 'Existing Sample Request' },
                                { case: { $eq: ['$Request_Type', '3'] }, then: 'Mass Market Product Development' },

                            ],
                            default: ""
                        }
                    },
                    status: {
                        $switch: {
                            branches: [
                                { case: { $or: [{ $eq: ['$approvalStage', ''] }, { $eq: ['$approvalStage', null] }, { $eq: ['$approvalStage', undefined] }] }, then: 'Un Sent' },
                                { case: { $eq: ['$approvalStage', 1] }, then: 'Waiting for an Approval from Area Manager' },
                                { case: { $eq: ['$approvalStage', 2] }, then: 'Waiting for an Approval from RBM' },
                                { case: { $eq: ['$approvalStage', 3] }, then: 'Waiting for an Approval from CMR Approver' },
                                { case: { $eq: ['$approvalStage', 4] }, then: 'Approved by CMR Approver' },
                            ],
                            default: ""
                        }
                    },
                    created_at: formatDate('$created_at'),
                    Customer_Type: 1,
                    created_by: { $concat: [{ $arrayElemAt: ['$created_by_details.first_name', 0] }, ' ', { $arrayElemAt: ['$created_by_details.last_name', 0] }] },
                    cmr_color: { $cond: { if: { $eq: ['$crm_sync', 99] }, then: '#FFA500', else: null } }
                }
            },
        ],
        totalCount: [
            { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'created_by_details' } },
            { $lookup: { from: 'users', localField: 'Approved_By', foreignField: 'emp_code', as: 'Approved_By_Details' } },
            { $lookup: { from: 'users', localField: 'Requested_By', foreignField: 'emp_code', as: 'Requested_By_Details' } },
            {
                $project: {
                    customer_id: 1,
                    CRM_CMR_No: 1,
                    customer_name: 1,
                    Customer_Category: 1,
                    Product_Group: 1,
                    Requested_By: { $concat: [{ $arrayElemAt: ['$Requested_By_Details.first_name', 0] }, ' ', { $arrayElemAt: ['$Requested_By_Details.last_name', 0] }] },
                    Approved_By: { $concat: [{ $arrayElemAt: ['$Approved_By_Details.first_name', 0] }, ' ', { $arrayElemAt: ['$Approved_By_Details.last_name', 0] }] },
                    CMR_Status: getCMRStatusQuery(),
                    Application: {
                        $switch: {
                            branches: [
                                { case: { $eq: ['$Application', '1'] }, then: 'Extrusion' },
                                { case: { $eq: ['$Application', '2'] }, then: 'Molding' }
                            ],
                            default: ""
                        }
                    },
                    Customer_Sample_sent_Date: formatDate('$Customer_Sample_sent_Date'),
                    CMR_receipt_Date: formatDate('$CMR_receipt_Date'),
                    Requested_Date: 1,
                    customer_quantity_requirement: 1,
                    RBU: 1,
                    deleted: 1,
                    approvalStage: 1,
                    Customer_Type: 1,
                    crm_sync: 1,
                    created_at: formatDate('$created_at'),
                    created_by: { $concat: [{ $arrayElemAt: ['$created_by_details.first_name', 0] }, ' ', { $arrayElemAt: ['$created_by_details.last_name', 0] }] },
                }
            },
        ],
    },
    bdList: {
        data: [
            // {
            //     $addFields: {
            //         customer_id: {
            //             $convert: {
            //                 input: '$customer_id',
            //                 to: 'objectId',
            //                 onError: 0
            //             }
            //         },
            //     }
            // },
            // { $lookup: { from: 'customer', localField: 'customer_id', foreignField: '_id', as: 'customer_details' } },
            { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'created_by_details' } },
            {
                '$lookup': {
                    from: 'state',
                    let: { customer_state: '$customer_state', },
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
                $project: {
                    modified_At: 1,
                    bdStage: 1,
                    customer_details: 1,
                    customer_name: 1,
                    customer_phone: 1,
                    customer_email: 1,
                    customer_city: 1,
                    customer_state: { $arrayElemAt: ['$state_details.state', 0] },
                    bd_activated: { $ifNull: ["$bd_activated", 0] },
                    bd_activity: 1,
                    customer_category: 1,
                    created_by: { $concat: [{ $arrayElemAt: ['$created_by_details.first_name', 0] }, ' ', { $arrayElemAt: ['$created_by_details.last_name', 0] }] },
                    created_at: { $arrayElemAt: [formatDate('$created_at'), 0] },
                }
            },
            // {
            //     $project: {
            //         modified_At: 1,
            //         bdStage: 1,
            //         customer_name: { $arrayElemAt: ['$customer_details.customer_name', 0] },
            //         customer_phone: { $arrayElemAt: ['$customer_details.customer_phone', 0] },
            //         customer_email: { $arrayElemAt: ['$customer_details.customer_email', 0] },
            //         customer_city: { $arrayElemAt: ['$customer_details.customer_city', 0] },
            //         customer_state: { $arrayElemAt: ['$state_details.state', 0] },
            //         bd_activated: { $ifNull: ["$bd_activated", 0] },
            //         bd_activity: { $arrayElemAt: ['$customer_details.bd_activity', 0] },
            //         customer_category: { $arrayElemAt: ['$customer_details.customer_category', 0] },
            //         created_by: { $concat: [{ $arrayElemAt: ['$created_by_details.first_name', 0] }, ' ', { $arrayElemAt: ['$created_by_details.last_name', 0] }] },
            //         created_at: { $arrayElemAt: [formatDate('$created_at'), 0] },
            //     }
            // },
            { $sort: { 'modified_At': -1 } },
        ],
        totalCount: [
            { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'created_by_details' } },
            {
                '$lookup': {
                    from: 'state',
                    let: { customer_state: '$customer_state', },
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
            // {
            //     $addFields: {
            //         customer_state: { $arrayElemAt: ['$state_details.state', 0] },
            //     }
            // },
            {
                $project: {
                    modified_At: 1,
                    bdStage: 1,
                    customer_name: 1,
                    customer_phone: 1,
                    customer_email: 1,
                    customer_city: 1,
                    // customer_state: 1,
                    customer_state: { $arrayElemAt: ['$state_details.state', 0] },
                    bd_activity: 1,
                    customer_category: 1,
                    created_by: { $concat: [{ $arrayElemAt: ['$created_by_details.first_name', 0] }, ' ', { $arrayElemAt: ['$created_by_details.last_name', 0] }] },
                    created_at: formatDate('$created_at'),
                    // created_at: { $concat: ['$day', '-', '$monthName', '-', '$year', ', ', '$hour', ':', '$minutes'] },
                }
            },
            { $sort: { 'modified_At': -1 } },
        ]
    }
}


const getDealDetails = async (dealId) => {
    try {
        const deal = await DataAccess.findOne(Modules().deals, { _id: ObjectId(dealId) })
        return deal;
    } catch (error) {
        throw new Error(error)
    }
}
