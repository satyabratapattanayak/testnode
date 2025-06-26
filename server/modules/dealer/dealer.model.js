const ObjectId = require('mongodb').ObjectID;
const { isEmpty, first, isArray } = require('lodash');

const DataAccess = require('../../helpers/DataAccess');
const Audit = require('../audit/audit.model');
const Customer = require('../customers/customer.model');
const acl = require('../../service/acl');
const { auditActions, Modules, formatDate, mapCustomerQuery } = require('../shared/shared.model');


const database = require('../../service/database');
const collection_name = 'dealer';
let mydb;
database.getDb().then(res => { mydb = res; ensureIndex(); });
const collection = (collectionName) => { return mydb.collection(collectionName); };
const ensureIndex = () => {
    let locCollection = collection(collection_name);
    locCollection.ensureIndex("name", (err, name) => {
        console.log("ensureIndex dealer name ", err, name);
    });
}

let saveActivity = (body) => {
    body.date = new Date();
    Audit.addLog(body);
};

let addLog = (module, action, id, userId, doc, msg) => {
    try {
        Audit.addLog({
            module: module,
            action: action,
            documentId: ObjectId(id),
            userId: ObjectId.isValid(userId) ? ObjectId(userId) : userId,
            data: doc,
            message: msg,
            date: new Date(),
        });
    } catch (error) {
        console.log('dealer module::audit log error: ', error);
    }
};

class model {
    constructor() {
        console.log('"DEALER" module constructor');
        this.common_query = {
            dealerList: {
                data: [
                    {
                        $addFields: {
                            region: {
                                $convert: {
                                    input: '$region',
                                    to: 'objectId',
                                    onError: 0
                                }
                            },
                            area: {
                                $convert: {
                                    input: '$area',
                                    to: 'objectId',
                                    onError: 0
                                }
                            },
                        }
                    },
                    { $lookup: { from: 'state', localField: 'customer_state', foreignField: 'stateCode', as: 'state_details' } },
                    { $lookup: { from: 'region', localField: 'customer_region', foreignField: '_id', as: 'region_details' } },
                    { $lookup: { from: 'area', localField: 'customer_area', foreignField: '_id', as: 'area_details' } },
                    { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'createdBy_details' } },
                    {
                        $project: {
                            _id: 1,
                            name: "$customer_name",
                            phone: "$customer_phone",
                            email: "$customer_email",
                            city: "$customer_city",
                            area: "$customer_area",
                            zone: "$customer_zone",
                            region: "$customer_region",
                            category: "$customer_category",
                            state_name: { $arrayElemAt: ['$state_details.state', 0] },
                            region_name: { $arrayElemAt: ['$region_details.region', 0] },
                            area_name: { $arrayElemAt: ['$area_details.area', 0] },
                            created_by: {
                                $concat: [{ $arrayElemAt: ['$createdBy_details.first_name', 0] }, ' ', { $arrayElemAt: ['$createdBy_details.last_name', 0] }]
                            },
                            created_at: { $arrayElemAt: [formatDate('$created_at'), 0] }
                        }
                    },
                    { $sort: { 'created_at': -1 } },
                ],
                totalCount: [
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            email: 1,
                            city: 1,
                            area: 1,
                            zone: 1,
                            region: 1,
                            created_at: formatDate('$created_at')
                        }
                    },
                ]
            },
            delaerDetails: [
                {
                    $addFields: {
                        region: {
                            $convert: {
                                input: '$region',
                                to: 'objectId',
                                onError: 0
                            }
                        },
                        area: {
                            $convert: {
                                input: '$area',
                                to: 'objectId',
                                onError: 0
                            }
                        },
                        zone: {
                            $convert: {
                                input: '$zone',
                                to: 'objectId',
                                onError: 0
                            }
                        },
                    }
                },
                { $lookup: { from: 'state', localField: 'state', foreignField: 'stateCode', as: 'state_details' } },
                { $lookup: { from: 'region', localField: 'region', foreignField: '_id', as: 'region_details' } },
                { $lookup: { from: 'area', localField: 'area', foreignField: '_id', as: 'area_details' } },
                { $lookup: { from: 'zone', localField: 'zone', foreignField: '_id', as: 'zone_details' } },
                { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'createdBy_details' } },
                { $lookup: { from: 'business_category', localField: 'crm_division', foreignField: 'key', as: 'crmDivision_details' } },
                { $lookup: { from: 'business_group', localField: 'businesscode', foreignField: 'key', as: 'businesscode_details' } },
                { $lookup: { from: 'business_division', localField: 'businessunit', foreignField: 'key', as: 'businessunit_details' } },
                { $lookup: { from: 'country', localField: 'country', foreignField: 'countryCode', as: 'country_details' } },
                {
                    '$lookup': {
                        from: 'customer',
                        let: { dealerId: '$_id', },
                        pipeline: [
                            {
                                $addFields: {
                                    dealer: {
                                        $convert: {
                                            input: '$dealer',
                                            to: 'objectId',
                                            onError: 0
                                        }
                                    }
                                }
                            },
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $eq: ['$dealer', '$$dealerId'],
                                            },
                                            { $ne: ['$deleted', 1], }
                                        ],
                                    }
                                }
                            }
                        ],
                        as: 'dealers_customer'
                    }
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        description: 1,
                        phone: 1,
                        address1: 1,
                        address2: 1,
                        email: 1,
                        landmark: 1,
                        category: 1,
                        postCode: 1,
                        referred_by: 1,
                        city: 1,
                        country: 1,
                        country_name: { $arrayElemAt: ['$country_details.country', 0] },
                        crm_division: { $arrayElemAt: ['$crmDivision_details', 0] },
                        businesscode: { $arrayElemAt: ['$businesscode_details', 0] },
                        businessunit: { $arrayElemAt: ['$businessunit_details', 0] },
                        state: {
                            _id: { $arrayElemAt: ['$state_details._id', 0] },
                            state: { $arrayElemAt: ['$state_details.state', 0] },
                            stateCode: { $arrayElemAt: ['$state_details.stateCode', 0] },
                        },
                        region: {
                            _id: { $arrayElemAt: ['$region_details._id', 0] },
                            region_code: { $arrayElemAt: ['$region_details.region_code', 0] },
                            region: { $arrayElemAt: ['$region_details.region', 0] },
                        },
                        area: {
                            _id: { $arrayElemAt: ['$area_details._id', 0] },
                            area: { $arrayElemAt: ['$area_details.area', 0] },
                            area_code: { $arrayElemAt: ['$area_details.area_code', 0] },
                        },
                        zone: {
                            _id: { $arrayElemAt: ['$zone_details._id', 0] },
                            zone: { $arrayElemAt: ['$zone_details.zone', 0] },
                            zone_code: { $arrayElemAt: ['$zone_details.zone_code', 0] },
                        },
                        dealers_customer: {
                            _id: 1,
                            customer_name: 1,
                            customer_phone: 1,
                            customer_email: 1,
                            customer_address1: 1,
                            customer_category: 1,
                            customer_address2: 1,
                            customer_landmark: 1,
                            customer_postCode: 1,
                            customer_city: 1,
                            customer_state: 1,
                            customer_country: 1,
                            customer_continent: 1,
                            created_at: 1
                        },
                        created_by: {
                            $concat: [{ $arrayElemAt: ['$createdBy_details.first_name', 0] }, ' ', { $arrayElemAt: ['$createdBy_details.last_name', 0] }]
                        },
                        created_at: { $arrayElemAt: [formatDate('$created_at'), 0] },

                    }
                },
            ]
        }
    }
    async details(user, id) {
        try {
            const crieteria = [
                { $match: { _id: ObjectId(id) } },
                ...this.common_query.delaerDetails
            ];
            const data = await DataAccess.aggregate(Modules().customer, crieteria);
            return data
        } catch (error) {
            throw new Error(error);
        }
    }
    async listAll(loggedUser, params) {
        const query = { isDealer: "Yes", customer_name: { $exists: true }, deleted: { $ne: 1 }, isDealersCustomer: { $ne: true } };
        query["customer_code"] = { $exists: true, "$ne": "" };
        try {
            const crieteria = [
                {
                    "$facet": {
                        "data": [

                            { $match: query },
                            ...this.common_query.dealerList.data,
                        ],
                        "totalCount": [
                            { $match: query },
                            ...this.common_query.dealerList.totalCount,
                        ]
                    }
                }
            ];
            if (params && !isEmpty(params)) {

                if (params.filters && Object.keys(params.filters).length > 0) {
                    let filterKeys = Object.keys(params.filters)
                    let filter = {

                    };
                    for (let i = 0; i < filterKeys.length; i++) {
                        if (filterKeys[i] == 'region_name') {
                            const ids = await getIds('region', 'region', params.filters[filterKeys[i]].value)
                            filterKeys[i] = 'region'
                            console.log('ids: ', ids);
                            filter[filterKeys[i]] = { $in: ids }
                        } else if (filterKeys[i] == 'area_name') {
                            const ids = await getIds('area', 'area', params.filters[filterKeys[i]].value)
                            filterKeys[i] = 'area'
                            console.log('ids: ', ids);
                            filter[filterKeys[i]] = { $in: ids }
                        } else if (filterKeys[i] == 'zone_name') {
                            const ids = await getIds('zone', 'zone', params.filters[filterKeys[i]].value)
                            filterKeys[i] = 'zone'
                            console.log('ids: ', ids);
                            filter[filterKeys[i]] = { $in: ids }
                        } else if (filterKeys[i] == 'state_name') {
                            const ids = await getStateIds('state', 'state', params.filters[filterKeys[i]].value)
                            filterKeys[i] = 'state'
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
                    let sort = {};
                    sort[params.sortField] = params.sortOrder
                    crieteria[0]["$facet"]["data"].push({ "$sort": sort });
                }
                crieteria[0]["$facet"]["data"].push({ "$limit": params.first + params.rows });
                crieteria[0]["$facet"]["data"].push({ "$skip": params.first })
            }

            crieteria[0]["$facet"]["totalCount"].push({ "$count": "count" });
            const data = await DataAccess.aggregate(Modules().customer, crieteria);
            return data
        } catch (error) {
            throw new Error(error)
        }
    }
    async create(reqBody, loggedUser) {
        console.log('delaer create: ', reqBody, ' :: ', loggedUser);

        try {
            reqBody.created_at = new Date();
            reqBody.modified_At = new Date();
            reqBody.created_by = loggedUser._id;
            reqBody.dealers_customer = [];
            acl.allowUser(Modules().dealer, loggedUser, reqBody);
            const newData = await DataAccess.InsertOne(Modules().dealer, reqBody);
            addLog(Modules().dealer, auditActions().create, first(newData)._id, loggedUser._id, first(newData), `created a ${Modules().dealer} `);
            return newData;
        } catch (error) {
            throw new Error(error)
        }
    }
    async update(id, reqBody, loggedUser) {
        try {
            delete reqBody.created_at;
            delete reqBody.created_by;
            reqBody.modified_At = new Date();

            const crieteria = { _id: ObjectId(id) };
            const doc = { $set: reqBody };
            const result = await DataAccess.UpdateOne(Modules().dealer, crieteria, doc);
            saveActivity({
                module: Modules().dealer,
                action: auditActions.update,
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: reqBody,
                message: `updated a ${Modules().dealer} `
            });
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error)
        }
    }
    async delete(id, loggedUser) {
        try {
            console.log('222222222222222222');

            const crieteria = { _id: ObjectId(id) };
            const result = await DataAccess.DeleteOne(Modules().dealer, crieteria);
            saveActivity({
                module: Modules().dealer,
                action: auditActions().Delete,
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: {},
                message: `deleted a ${Modules().dealer} `
            });
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error)
        }

    }

    setCustomerData(doc) {
        doc.customer_name = doc.name;
        doc.customer_phoe = doc.phone;
        doc.customer_email = doc.email;
        doc.customer_city = doc.city;
        doc.customer_region = doc.region;
        doc.customer_area = doc.area;
        doc.customer_zone = doc.zone;

        delete doc.name;
        delete doc.phone;
        delete doc.email;
        delete doc.city;
        delete doc.region
        delete doc.area;
        delete doc.zone;
    }
}


let dealerModel = new model()
module.exports = dealerModel;

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