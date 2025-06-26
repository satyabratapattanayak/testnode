const ObjectId = require('mongodb').ObjectID;
const { isEmpty, sortBy } = require('lodash');

const DataAccess = require('../../helpers/DataAccess');
const Audit = require('../audit/audit.model.js');
const acl = require('../../service/acl');
const { deleteNotes } = require('../shared/shared.controller');
const { mapLeadQuery, auditActions, Modules, formatDate } = require('../shared/shared.model');

const collection_name = 'lead';
let mydb;
const database = require('../../service/database');
database.getDb().then(res => {
    mydb = res;
});


const collection = (collectionName) => { return mydb.collection(collectionName); };


const auditStatusUpdateAction = auditActions().change_status; // 'update_status'; // log
const auditUpdateAction = auditActions().update; // 'update'; // logu
const auditArchiveAction = 'archive'; // log
const auditCreateAction = auditActions().create; // 'create'; // log
const auditDeleteAction = auditActions().Delete; // 'delete'; // log
const auditLinkAction = auditActions().link; // 'link'; // log
const auditUserLinkAction = auditActions().userLink; // 'link'; // log
const auditUnLinkAction = auditActions().unlink; // 'unlink'; // log
const leadModule = Modules().lead;  //'lead';
const userModule = Modules().user; // 'users';

let saveLeadActivity = (body) => {
    body.date = new Date();
    Audit.addLog(body);
};
const addLog = (action, id, userId, doc, msg) => {
    saveLeadActivity({
        module: leadModule,
        action: action,
        documentId: ObjectId(id),
        userId: ObjectId(userId),
        data: doc,
        message: msg,
    });
};


const updatePermissions = async (oldData, id, user) => {
    try {
        // const oldData = await DataAccess.findOne('lead', { _id: ObjectId(id) });
        let doc = { acl_meta: oldData.acl_meta };
        acl.allowUser('lead', user, doc);
        DataAccess.UpdateOne(collection_name, { _id: ObjectId(id) }, { $set: doc });
    } catch (error) {
        throw new Error(error);
    }
};

const checkStatusUpdated = async (prevData, id, currentData, loggedUser) => {
    try {
        if (JSON.stringify(prevData.lead_status) != JSON.stringify(currentData.lead_status)) {
            let doc = {
                oldStatus: prevData.lead_status.toString(),
                newStatus: currentData.lead_status.toString()
            };
            let docToSave = { ...doc, ...prevData, ...currentData };
            addLog(auditStatusUpdateAction, id, loggedUser._id, docToSave, 'changed the status from: ')
        }
    } catch (error) {
        throw new Error(error);
    }
};

const model = {
    findById: (id) => {
        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .aggregate([
                    { $match: { _id: ObjectId(id) } },
                    // { $lookup: { from: 'state', localField: 'lead_state', foreignField: '_id', as: 'state_details' } },

                    {
                        '$lookup': {
                            from: 'state',
                            let: { lead_state: '$lead_state', },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $or: [
                                                {
                                                    $eq: ['$_id', '$$lead_state']
                                                },
                                                {
                                                    $eq: ['$stateCode', '$$lead_state']
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
                            lead_status: {
                                $convert: {
                                    input: '$lead_status',
                                    to: 'objectId',
                                    onError: 0
                                }
                            }
                        },
                    },
                    { $lookup: { from: 'status', localField: 'lead_status', foreignField: '_id', as: 'status_details' } },
                    {
                        $addFields: {
                            'lead_region': { '$toObjectId': '$lead_region' },
                            'lead_area': { '$toObjectId': '$lead_area' },
                            'lead_zone': { '$toObjectId': '$lead_zone' }
                        }
                    },
                    { $lookup: { from: 'region', localField: 'lead_region', foreignField: '_id', as: 'region_details' } },
                    { $lookup: { from: 'country', localField: 'lead_country', foreignField: 'countryCode', as: 'lead_country_details' } },
                    { $lookup: { from: 'area', localField: 'lead_area', foreignField: '_id', as: 'area_details' } },
                    { $lookup: { from: 'zone', localField: 'lead_zone', foreignField: '_id', as: 'zone_details' } },
                    { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'createdBy_details' } },
                    { $lookup: { from: 'users', localField: 'lead_assigned_to', foreignField: '_id', as: 'assignee_details' } },
                    { $lookup: { from: 'business_category', localField: 'crm_division', foreignField: 'key', as: 'crmDivision_details' } },
                    { $lookup: { from: 'business_group', localField: 'businesscode', foreignField: 'key', as: 'businesscode_details' } },
                    { $lookup: { from: 'business_division', localField: 'businessunit', foreignField: 'key', as: 'businessunit_details' } },
                    { $lookup: { from: 'customer_category', localField: 'customer_category', foreignField: '_id', as: 'customer_category_details' } },
                    { $lookup: { from: 'users', localField: 'linked_staff.staffId', foreignField: '_id', as: 'linked_staff_details' } },

                    {
                        $addFields: {
                            customer_category_name: '$customer_category_details.category',
                            lead_country_name: { $arrayElemAt: ['$lead_country_details.country', 0] },
                            lead_region: { $arrayElemAt: ['$region_details', 0] },
                            lead_area: { $arrayElemAt: ['$area_details', 0] },
                            lead_zone: { $arrayElemAt: ['$zone_details', 0] },
                            crm_division: { $arrayElemAt: ['$crmDivision_details', 0] },
                            businesscode: { $arrayElemAt: ['$businesscode_details', 0] },
                            businessunit: { $arrayElemAt: ['$businessunit_details', 0] },
                            // customer_category: { $arrayElemAt: ['$businessunit_details', 0] },
                        }
                    },
                    {
                        $project: {
                            customer_category_details: 0,
                            crmDivision_details: 0,
                            businesscode_details: 0,
                            businessunit_details: 0,
                            lead_country_details: 0
                        }
                    }
                ])
                .toArray()
                .then((result) => {
                    return result;
                });
        }
    },


    filter: (loggedUser, DataToFilter) => {
        let matchQuery = {};
        let regions = [];
        let areas = [];
        let zones = [];
        let listOfAssignedUsers = [];


        if (DataToFilter && !isEmpty(DataToFilter.region)) {
            matchQuery['lead_region'] = { $in: DataToFilter.region };
        }

        if (DataToFilter && !isEmpty(DataToFilter.area)) {
            matchQuery['lead_area'] = { $in: DataToFilter.area };
        }

        if (DataToFilter && !isEmpty(DataToFilter.zone)) {
            matchQuery['lead_zone'] = { $in: DataToFilter.zone };
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
        ) { }
        return model.all(null, loggedUser, matchQuery);
    },
    flatList: (filter) => {
        return DataAccess.findAll(collection_name, filter);
    },

    all: async (body, loggedUser, queryParam) => {

        let query = await mapLeadQuery(loggedUser, queryParam);
        if (body) {
            if (body.lead_assigned_to == 0) {
                query.lead_assigned_to = { $eq: [] };
            } else if (body.lead_assigned_to == 1) {
                query.lead_assigned_to = { $ne: [] };
            } else if (body.modified_At) {
                query.modified_At = body.modified_At;
            }
        }

        console.log('Lead list query: ', JSON.stringify(query));


        const crieteria = ([
            {
                $addFields: {
                    lead_status: {
                        $convert: {
                            input: '$lead_status',
                            to: 'objectId',
                            onError: 0
                        }
                    },
                }
            },
            { $match: query },
            { $sort: { 'created_at': -1 } },
            {
                $addFields: {
                    'lead_region': { '$toObjectId': '$lead_region' },
                    'lead_area': { '$toObjectId': '$lead_area' },
                }
            },
            { $lookup: { from: 'users', localField: 'linked_staff.staffId', foreignField: '_id', as: 'linked_staff' } },
            { $lookup: { from: 'region', localField: 'lead_region', foreignField: '_id', as: 'region_details' } },
            { $lookup: { from: 'users', localField: 'lead_assigned_to', foreignField: '_id', as: 'assignee_details' } },
            { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'createdBy_details' } },
            { $lookup: { from: 'area', localField: 'lead_area', foreignField: '_id', as: 'lead_area_details' } },
            { $lookup: { from: 'status', localField: 'lead_status', foreignField: '_id', as: 'lead_status_details' } },
            {
                $addFields: {
                    lead_region_name: { $arrayElemAt: ['$region_details.region', 0] },
                    lead_area_name: { $arrayElemAt: ['$lead_area_details.area', 0] },
                    lead_status_name: { $arrayElemAt: ['$lead_status_details.type', 0] },
                    lead_assigned_to: { $arrayElemAt: ['$assignee_details.first_name', 0] },
                    created_by: { $arrayElemAt: ['$createdBy_details.first_name', 0] },
                }
            },
            {
                $project: {
                    lead_region_name: 1,
                    lead_area_name: 1,
                    lead_name: 1,
                    lead_phone: 1,
                    lead_remarks: 1,
                    customer_category: 1,
                    crm_division: 1,
                    businesscode: 1,
                    businessunit: 1,
                    lead_email: 1,
                    lead_address1: 1,
                    lead_address2: 1,
                    lead_landmark: 1,
                    lead_postCode: 1,
                    lead_city: 1,
                    lead_state: 1,
                    lead_region: 1,
                    lead_area: 1,
                    lead_zone: 1,
                    lead_status: 1,
                    lead_status_name: 1,
                    lead_referred_by: 1,
                    lead_assigned_to: 1,
                    deleted: 1,
                    created_by: 1,
                    modified_At: 1,
                    movedToR0: 1,
                    linked_staff: {
                        first_name: 1,
                        last_name: 1,
                        email: 1
                    },
                    created_at: formatDate('$created_at')
                },
            },


        ]);

        const result = await DataAccess.aggregate(collection_name, crieteria);
        return result;
    },
    create: async (body, loggedUser) => {
        try {
            acl.allowUser('lead', loggedUser, body);
            const resp = await DataAccess.InsertOne(collection_name, body);
            addLog(auditCreateAction, resp[0]._id, loggedUser._id, resp[0], 'created the lead');
            // set creator as linked staff
            const dataToLinkedStaff = {
                staffId: body.created_by,
                addedBy: body.created_by,
                linked_on: new Date()
            };
            model.linkStaff(resp[0]._id, [dataToLinkedStaff], loggedUser);
            return resp;
        } catch (error) {
            throw new Error(error);
        }
    },
    update: async (id, body, loggedUser) => {
        try {
            mapRequestDataForUpdate(body);
            const oldData = await DataAccess.findOne('lead', { _id: ObjectId(id) });
            const resp = await DataAccess.UpdateOne(collection_name, { _id: ObjectId(id) }, { $set: body });
            if (resp.modifiedCount > 0) {
                addLog(auditUpdateAction, id, loggedUser._id, body, 'updated the lead');
                checkStatusUpdated(oldData, id, body, loggedUser);
                setAssigneeAsLinkedStaff(body, loggedUser, id);
                updatePermissions(oldData, id, loggedUser);
            }
            return resp.modifiedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }
    },

    deleteById: async (id, loggedUser) => {
        const result = await DataAccess.UpdateOne(collection_name, { _id: ObjectId(id) }, { $set: { deleted: 1, modified_At: new Date() } });
        if (result.modifiedCount > 0) {
            addLog(auditDeleteAction, id, loggedUser._id, { id: id }, 'deleted the lead');
            deleteNotes(id);
            DataAccess.findAll('scheduler', { associated_with: ObjectId(id) }).then((found) => {
                if (!isEmpty(found)) {
                    found.forEach(ele => {
                        DataAccess.UpdateOne('scheduler', { _id: ObjectId(ele._id) }, { $set: { associated_with: '', associated_radio_with: 'custom' } });
                        Audit.addLog({
                            module: 'scheduler',
                            action: 'update',
                            documentId: ObjectId(ele._id),
                            userId: ObjectId(loggedUser._id),
                            data: { 'lead_id': ObjectId(id) },
                            message: 'deleted the Associated Lead',
                            date: new Date()
                        });
                    });
                }
            });
        }
        return result.matchedCount > 0 ? 1 : 0;
    },

    Archive: async (id, loggedUser) => {
        try {
            const result = await DataAccess.UpdateOne(collection_name, { _id: ObjectId(id) }, { $set: { isArchived: 1, modified_At: new Date() } });
            addLog(auditArchiveAction, id, loggedUser._id, { _id: id }, 'Archived the lead');
        } catch (error) {
            throw new Error(error);
        }
    },

    linkStaff: (id, body, currentLoggedUser, linkedUsers) => {
        console.log('body LINKED STAFF: ', body);

        let linkedStaffsObjectId = [];
        let linkedStaffs = [];
        body.forEach(element => {
            linkedStaffs.push(element.staffId.toString());
            linkedStaffsObjectId.push(element.staffId);
        });


        let crieteria = {
            _id: ObjectId(id),
            'linked_staff.staffId': { $nin: linkedStaffsObjectId },
            // 'acl_meta.users': { $nin: linkedStaffs },
        };

        let doc = {
            $push: {
                linked_staff: { $each: body },
            },
            $addToSet: {
                'acl_meta.users': { $each: linkedStaffs }
            }
        };

        return DataAccess.UpdateOne(collection_name, crieteria, doc).then((result) => {
            if (result.modifiedCount > 0) {
                saveLeadActivity({
                    module: leadModule,
                    action: auditUserLinkAction,
                    documentId: ObjectId(id),
                    userId: ObjectId(currentLoggedUser._id),
                    data: { users: linkedStaffsObjectId },
                    message: body.length > 1 ? 'linked ' + body.length + ' staff' : 'linked a staff',
                });
            }
            return result.modifiedCount > 0 ? 1 : 0;
        });
    },
    unLinkStaff: (id, staffId, currentLoggedUser) => {
        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .updateOne({ _id: ObjectId(id) }, { $pull: { linked_staff: { staffId: ObjectId(staffId) }, 'acl_meta.users': staffId } }).then((resp) => {
                    if (resp.modifiedCount > 0) {
                        saveLeadActivity({
                            module: leadModule,
                            action: auditUnLinkAction,
                            documentId: ObjectId(id),
                            userId: ObjectId(currentLoggedUser._id),
                            data: [{ userId: ObjectId(staffId) }],
                            message: 'unlinked a staff',
                        });

                    }
                    return resp.modifiedCount > 0 ? 1 : 0;
                });
        }
    },

    listLeadsToLink: (body) => {
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
            { $lookup: { from: collection_name, localField: '_id', foreignField: foreignField, as: 'linked_leads' } },
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
            console.log('contactDetails: ', contactDetails[0].linked_leads);

            if (contactDetails) {
                if (!isEmpty(contactDetails[0].linked_leads)) {
                    contactDetails[0].linked_leads.forEach(customer => {
                        customers.push(ObjectId(customer._id));
                    });
                }
            }
            const crieteria = [
                { $match: { _id: { $nin: customers }, deleted: { $ne: 1 } } },
                { $project: { _id: 1, lead_name: 1 } }
            ];
            return DataAccess.aggregate(collection_name, crieteria);
        });
    },
    findOne: (id) => {
        try {
            return DataAccess.findOne('lead', { _id: ObjectId(id) });
        } catch (error) {
            throw new Error(error);
        }
    }

};

module.exports = model;

function mapRequestDataForUpdate(body) {
    // if (body.lead_status) { body.lead_status = ObjectId(body.lead_status); }
    if (body.lead_state && ObjectId.isValid(body.lead_state)) {
        body.lead_state = ObjectId(body.lead_state);
    }

    if (body.lead_assigned_to) {
        let selectedAssignee = [];
        body.lead_assigned_to.forEach(element => { selectedAssignee.push(ObjectId(element)); });
        body.lead_assigned_to = selectedAssignee;
    }
    body.modified_At = new Date();
    delete body.created_by;
    delete body.created_at;
}

function setAssigneeAsLinkedStaff(body, loggedUser, id) {
    if (!isEmpty(body.lead_assigned_to)) {
        // set assigned_to as linked staff
        const dataToLinkedStaff = {
            staffId: ObjectId(body.lead_assigned_to[0]),
            addedBy: ObjectId(loggedUser._id),
            linked_on: new Date()
        };
        model.linkStaff(id, [dataToLinkedStaff], loggedUser);
    }
}

