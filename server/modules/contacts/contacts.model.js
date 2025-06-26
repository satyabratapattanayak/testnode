// @ts-check
const ObjectId = require('mongodb').ObjectID;
const { isEmpty } = require('lodash');

const { deleteNotes } = require('../shared/shared.controller');
const { mapContactsQuery, formatDate, Modules, auditActions } = require('../shared/shared.model');
const DataAccess = require('../../helpers/DataAccess');
const Audit = require('../audit/audit.model.js');
const acl = require('../../service/acl');

let mydb;
const database = require('../../service/database');
database.getDb().then(res => { mydb = res; });
const collection_name = 'contacts';

const collection = (collectionName) => { return mydb.collection(collectionName); };

const model = {
    findById: (id) => {
        const crieteria = [
            { $match: { _id: ObjectId(id) } },
            // { $lookup: { from: 'state', localField: 'contact_state', foreignField: '_id', as: 'state_details' } },

            {
                '$lookup': {
                    from: 'state',
                    let: { state: '$contact_state', },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        {
                                            $eq: ['$_id', '$$state']
                                        },
                                        {
                                            $eq: ['$stateCode', '$$state']
                                        },
                                    ],
                                }
                            }
                        }
                    ],
                    as: 'state_details'
                }
            },

            { $lookup: { from: 'region', localField: 'contact_region', foreignField: '_id', as: 'region_details' } },
            { $lookup: { from: 'area', localField: 'contact_area', foreignField: '_id', as: 'area_details' } },
            { $lookup: { from: 'zone', localField: 'contact_zone', foreignField: '_id', as: 'zone_details' } },
            { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'createdBy_details' } },
            { $lookup: { from: 'customer', localField: '_id', foreignField: 'linked_contacts.contactId', as: 'linked_customers' } },
            { $lookup: { from: 'zone', localField: 'linked_customers.customer_zone', foreignField: '_id', as: 'linked_customers_zone_details' } },
            { $lookup: { from: 'business_category', localField: 'linked_customers.crm_division', foreignField: 'key', as: 'linked_customers_bc_details' } },
            {
                $addFields: {
                    'linked_customers.customer_zone': { $arrayElemAt: ['$linked_customers_zone_details.zone', 0] },
                    'linked_customers.crm_division': { $arrayElemAt: ['$linked_customers_bc_details.category', 0] },
                }
            },
            {
                $project: {
                    'linked_customers.customer_zone.area': 0,
                    'createdBy_details.password': 0, 'linked_customers.linked_staff': 0,
                    'linked_customers.targets': 0, 'linked_customers.phone': 0, 'linked_customers.address': 0,
                    'createdBy_details.phone': 0, 'createdBy_details.address': 0, 'linked_customers.customer_region': 0,
                    'linked_customers.customer_area': 0, 'linked_customers.customer_referred_by': 0,
                    'linked_customers.linked_contacts': 0, 'linked_customers.customer_code': 0, 'linked_customers.customer_postCode': 0,
                    'linked_customers.deleted': 0, 'linked_customers.created_at': 0, 'linked_customers.created_by': 0,
                    // 'linked_customers.customer_zone': 0,'linked_customers.customer_business_group': 0, 'linked_customers.customer_business_division': 0, 'linked_customers.customer_business_category': 0,
                }
            }
        ];
        return DataAccess.aggregate('contacts', crieteria);
    },
    filter: (filter) => {
        console.log('model ', filter);

        const Nullquery = { $ne: null };

        let temp_city = [];
        let temp_state = [];
        let temp_associatedWith = [];

        if (!filter.city) {
            temp_city = Nullquery;
        } else {
            for (let key in filter.city) {
                temp_city[key] = filter.city[key];
            }
            temp_city = { $in: temp_city };
            console.log('filter region: ', temp_city);
        }

        if (!filter.state) {
            temp_state = Nullquery;
        } else {
            for (let key in filter.state) {
                temp_state[key] = ObjectId(filter.state[key]);
            }
            temp_state = { $in: temp_state };
            console.log('filter temp_state: ', temp_state);
        }

        if (!filter.associated_with) {
            temp_associatedWith = Nullquery;
        } else {
            for (let key in filter.associated_with) {
                temp_associatedWith[key] = ObjectId(filter.associated_with[key]);
            }
            temp_associatedWith = { $in: temp_associatedWith };
            console.log('filter temp_associatedWith: ', temp_associatedWith);
        }

        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .aggregate([
                    { $lookup: { from: 'customer', localField: '_id', foreignField: 'contacts.contactId', as: 'customer_details' } },
                    { $match: { city: temp_city, state: temp_state } },
                ])
                .toArray().then((result) => { return result; });
        }
    },
    all: async (loggedUser, query1, params) => {
        let query = await mapContactsQuery(loggedUser, query1);
        // console.log("contact list query", JSON.stringify(query));
        const crieteria = [
            {
                "$facet": {
                    "data": [
                        { $match: query },
                        ...common_Queries.contactList
                    ]
                    ,
                    "totalCount": [
                        { $match: query },
                        ...common_Queries.contactList
                        // { "$count": "count" }
                    ]
                }
            }];
        if (params && !isEmpty(params)) {

            if (params.filters && Object.keys(params.filters).length > 0) {
                let filterKeys = Object.keys(params.filters)
                let filter = {

                };
                for (let i = 0; i < filterKeys.length; i++) {
                    filter[filterKeys[i]] = { "$regex": params.filters[filterKeys[i]].value, "$options": "i" }
                    // totalMatch[filterKeys[i]] = { "$regex": params.filters[filterKeys[i]].value, "$options": "i" }
                }
                crieteria[0]["$facet"]["data"].push({ "$match": filter });
                crieteria[0]["$facet"]["totalCount"].push({ "$match": filter });
            }

            if (params.sortField) {
                let sort = {

                };
                sort[params.sortField] = params.sortOrder
                crieteria[0]["$facet"]["data"].push({ "$sort": sort });
            }

            crieteria[0]["$facet"]["data"].push({ "$limit": params.first + params.rows });
            crieteria[0]["$facet"]["data"].push({ "$skip": params.first })
        }
        crieteria[0]["$facet"]["totalCount"].push({ "$count": "count" });

        return DataAccess.aggregate('contacts', crieteria);
    },
    listContactsToLink: (customerId) => {
        let query = { deleted: { $ne: 1 } };
        let contacts = [];
        return DataAccess.findOne('customer', { _id: ObjectId(customerId) }).then((customerDetails) => {
            if (customerDetails) {
                if (!isEmpty(customerDetails.linked_contacts)) {
                    customerDetails.linked_contacts.forEach(contact => {
                        contacts.push(ObjectId(contact.contactId));
                    });
                }
            }
            const crieteria = [
                { $match: { _id: { $nin: contacts }, deleted: { $ne: 1 } } },
                { $project: { _id: 1, contact_name: 1 } }
            ];
            return DataAccess.aggregate('contacts', crieteria);
        });
    },
    linkCustomers: (contactId, body, currentLoggedUser) => {
        console.log('model: ', contactId, body);
        if (mydb) {
            const collections = collection('customer');
            return collections
                .updateMany({ _id: { $in: body } }, { $push: { linked_contacts: { contactId: ObjectId(contactId), addedBy: ObjectId(currentLoggedUser._id), linked_on: new Date() } } })
                .then((result) => {
                    if (result.modifiedCount > 0) {
                        Audit.addLog({
                            module: Modules().customer,
                            action: auditActions().link,
                            documentId: ObjectId(contactId),
                            userId: ObjectId(currentLoggedUser._id),
                            data: body,
                            message: body.length > 1 ? 'linked ' + body.length + ' customers' : 'linked a customer',
                            date: new Date()
                        });
                        if (!isEmpty(body)) {
                            body.forEach(element => {
                                Audit.addLog({
                                    module: Modules().contact,
                                    action: auditActions().link,
                                    documentId: ObjectId(element),
                                    userId: ObjectId(currentLoggedUser._id),
                                    data: { contactId: ObjectId(contactId) },
                                    message: 'linked a contact',
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
        acl.allowUser('contact', currentLoggedUser, body);
        body.contact_index = await contactIndexOperatons(body.customer_id) + 1000;
        const data = await DataAccess.InsertOne(collection_name, body);
        Audit.addLog({
            module: Modules().contact,
            action: auditActions().create,
            documentId: ObjectId(data[0]._id),
            userId: ObjectId(currentLoggedUser._id),
            data: data[0],
            message: 'created a contact',
            date: new Date()
        });
        return data;
    },
    update: (id, body, currentLoggedUser) => {
        acl.allowUser('contact', currentLoggedUser, body);
        return DataAccess.UpdateOne(collection_name, { _id: ObjectId(id) }, { $set: body })
            .then((resp) => {
                if(body.deleted == true || body.contact_index == "") {
                    contactIndexOperatons(body.customer_id);
                } 
                return resp.modifiedCount > 0 ? 1 : 0;
            });
    },
    delesteById: (id) => {
        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .updateOne({ _id: ObjectId(id) }, { $set: { deleted: 1 } })
                .then((result) => {
                    console.log('MODEL::deleteOne() called: ', result.deletedCount);
                    if (result.deletedCount > 0) {
                        return collections
                            .aggregate([
                                { $match: { deleted: { $ne: 1 } } },
                                // { $lookup: { from: 'state', localField: 'state', foreignField: '_id', as: 'state_details' } },

                                {
                                    '$lookup': {
                                        from: 'state',
                                        let: { state: '$contact_state', },
                                        pipeline: [
                                            {
                                                $match: {
                                                    $expr: {
                                                        $or: [
                                                            {
                                                                $eq: ['$_id', '$$state']
                                                            },
                                                            {
                                                                $eq: ['$stateCode', '$$state']
                                                            },
                                                        ],
                                                    }
                                                }
                                            }
                                        ],
                                        as: 'state_details'
                                    }
                                },

                                { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'createdBy_details' } },
                                { $sort: { 'created_at': -1 } }
                            ])
                            .toArray();
                    } else {
                        return 0;
                    }
                });
        }
    },

    deleteById: (id, loggedUser) => {
        return DataAccess.UpdateOne(collection_name, { _id: ObjectId(id) }, { $set: { deleted: 1, deleted: 1, modified_At: new Date() } })
            .then((result) => {
                if (result.modifiedCount > 0) {
                    Audit.addLog({
                        module: 'contact',
                        action: 'delete',
                        documentId: ObjectId(id),
                        userId: ObjectId(loggedUser._id),
                        data: [{ contactId: ObjectId(id) }],
                        message: 'deleted a contact',
                        date: new Date()
                    });
                    deleteNotes(id);
                    DataAccess.findAll('scheduler', { associated_with: ObjectId(id) }).then((found) => {
                        if (!isEmpty(found)) {
                            found.forEach(ele => {
                                DataAccess.UpdateOne('scheduler', { _id: ObjectId(ele._id) }, { $set: { associated_with: '', associated_radio_with: 'custom' } });
                                Audit.addLog({
                                    module: 'contact',
                                    action: 'delete',
                                    documentId: ObjectId(ele._id),
                                    userId: ObjectId(loggedUser._id),
                                    data: [{ 'contactId': ObjectId(id) }],
                                    message: 'deleted the Associated Contact',
                                    date: new Date()
                                });
                            });
                        }
                    });
                    DataAccess.findAll('customer', { 'linked_contacts.contactId': { $in: [ObjectId(id)] } }).then((resp) => {
                        if (!isEmpty(resp)) {
                            resp.forEach(eachCustomer => {
                                DataAccess.UpdateOne('customer', { _id: ObjectId(eachCustomer._id) }, { $pull: { linked_contacts: { contactId: ObjectId(id) } } });
                                Audit.addLog({
                                    module: 'contact',
                                    action: 'delete',
                                    documentId: ObjectId(eachCustomer._id),
                                    userId: ObjectId(loggedUser._id),
                                    data: [{ contactId: ObjectId(id), customerId: ObjectId(eachCustomer._id) }],
                                    message: 'deleted a linked contact',
                                    date: new Date()
                                });
                            });
                        }
                    });
                }
                return result.matchedCount > 0 ? 1 : 0;
            });
    },
};

module.exports = model;

const common_Queries = {
    contactList: [
        { $lookup: { from: 'region', localField: 'contact_region', foreignField: '_id', as: 'contact_region_details' } },
        { $lookup: { from: 'area', localField: 'contact_area', foreignField: '_id', as: 'contact_area_details' } },
        { $lookup: { from: 'customer', localField: '_id', foreignField: 'linked_contacts.contactId', as: 'linked_customers' } },
        {
            $project: {
                _id: 1,
                contact_name: 1,
                contact_phone: 1,
                contact_email: 1,
                designation: 1,
                contact_region: { $arrayElemAt: ['$contact_region_details.region', 0] },
                contact_area: { $arrayElemAt: ['$contact_area_details.area', 0] },
                customer_name: { $arrayElemAt: ['$linked_customers.customer_name', 0] },
                created_at: {
                    $cond: {
                      if: {
                        $and: [
                          { $ne: [{ $type: "$created_at" }, "missing"] },
                          { $eq: [{ $type: "$created_at" }, "date"] }
                        ]
                      },
                      then: formatDate("$created_at"),
                      else: null
                    }
                  }
            }
        },
        { $sort: { 'created_at': -1 } },
    ]
}

async function contactIndexOperatons(customerId) {
    const filter = {
        "customer_id": customerId,
        $or: [
          { "deleted": { $exists: false } },
          { "deleted": { $eq: false } },
          { "deleted": { $eq: 0 } },
          { "deleted": "" }
        ]
    };
    let initiaIndexValue = 1000;
    let indexValue = 0;
    await DataAccess.findAll(collection_name, filter).then((resp) => {
        if (!isEmpty(resp)) {
            resp.reverse().forEach((contactData, index) => {
                indexValue = initiaIndexValue * (index + 1);
                if (contactData['contact_index'] === undefined || contactData['contact_index'] == "") {
                    updateContactIndex({ _id: ObjectId(contactData['_id']) }, { $set: { "contact_index": indexValue }});
                }
            });
        }
    });
    return indexValue;
};

async function updateContactIndex(condition, updateValue) {
    await DataAccess.UpdateOne(collection_name, condition, updateValue);
}