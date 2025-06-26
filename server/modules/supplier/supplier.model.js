const mongodb = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const httpStatus = require('http-status');
const { isEmpty, first, isArray } = require('lodash');

const DataAccess = require('../../helpers/DataAccess');
const config = require('../../config/config');
const Audit = require('../audit/audit.model');
const acl = require('../../service/acl');
const { mapSupplierQuery, formatDate } = require('../shared/shared.model');


let mydb;
const database = require('../../service/database');
database.getDb().then(res => { mydb = res; });

const collection_name = 'supplier';


let saveActivity = (body) => {
    body.date = new Date();
    Audit.addLog(body);
};

const model = {
    details: (id) => {
        try {
            const crieteria = [
                { $match: { _id: ObjectId(id) } },
                // { $addFields: { 'state': { $toObjectId: '$supplier_state' } } },
                {
                    $addFields: {
                        state: {
                            $convert: {
                                input: '$supplier_state',
                                to: 'objectId',
                                onError: 0
                            }
                        }
                    }
                },

                {
                    '$lookup': {
                        from: 'state',
                        let: { state: '$supplier_state', },
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

                { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'creator_details' } },
                {
                    $addFields: {
                        'supplier_state_name': { $arrayElemAt: ['$state_details.state', 0] },
                        created_by: '$creator_details.first_name'
                    }
                },
                {
                    $project: {
                        creator_details: 0,
                        state_details: 0
                    }
                }

            ];
            return DataAccess.aggregate(collection_name, crieteria);
        } catch (error) {
            throw new Error(error);
        }
    },

    listAll: async (loggedUser, params) => {
        try {
            let query = { deleted: { $ne: 1 } };
            let supplier_query = await mapSupplierQuery(loggedUser, query);
            console.log('supplier list QUERY: ', JSON.stringify(supplier_query));

            const crieteria = [
                {
                    "$facet": {
                        "data": [
                            { $match: supplier_query },
                            { $sort: { created_at: -1 } },
                            {
                                $project: {
                                    _id: 1,
                                    supplier_name: 1,
                                    supplier_address: 1,
                                    supplier_city: 1,
                                    supplier_code: 1,
                                    supplier_phone: 1,
                                    supplier_postCode: 1,
                                    supplier_country: 1,
                                    created_at: formatDate('$created_at'),
                                }
                            }
                        ],
                        "totalCount": [
                            { $match: supplier_query },
                            {
                                $project: {
                                    _id: 1,
                                    supplier_name: 1,
                                    supplier_address: 1,
                                    supplier_city: 1,
                                    supplier_code: 1,
                                    supplier_phone: 1,
                                    supplier_postCode: 1,
                                    supplier_country: 1,
                                    created_at: formatDate('$created_at'),
                                }
                            },
                            { "$count": "count" }
                        ]
                    }
                }];
            if (params && !isEmpty(params)) {

                if (params.filters && Object.keys(params.filters).length > 0) {
                    let filterKeys = Object.keys(params.filters)
                    let filter = {

                    };
                    let totalMatch = crieteria[0]["$facet"]["totalCount"][0]["$match"];
                    for (let i = 0; i < filterKeys.length; i++) {
                        filter[filterKeys[i]] = { "$regex": params.filters[filterKeys[i]].value, "$options": "i" }
                        totalMatch[filterKeys[i]] = { "$regex": params.filters[filterKeys[i]].value, "$options": "i" }
                    }
                    crieteria[0]["$facet"]["data"].push({ "$match": filter });

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
            return DataAccess.aggregate(collection_name, crieteria);
        } catch (error) {
            throw new Error(error);
        }
    },

    create: async (reqBody, loggedUser) => {
        try {
            acl.allowUser('supplier', loggedUser, reqBody);
            reqBody.created_at = new Date();
            reqBody.modified_At = new Date();
            reqBody.created_by = loggedUser._id;

            const newData = await DataAccess.InsertOne(collection_name, reqBody);
            saveActivity({
                module: collection_name,
                action: 'create',
                documentId: ObjectId(first(newData)._id),
                userId: ObjectId(loggedUser._id),
                data: newData[0],
                message: 'created a Supplier'
            });
            return newData;
        } catch (error) {
            throw new Error(error);
        }
    },

    update: async (id, reqBody, loggedUser) => {
        try {
            delete reqBody._id;
            delete reqBody.created_at;
            delete reqBody.created_by;
            reqBody.modified_At = new Date();

            const crieteria = { _id: ObjectId(id) };
            const doc = { $set: reqBody };
            const result = await DataAccess.UpdateOne(collection_name, crieteria, doc);
            saveActivity({
                module: collection_name,
                action: 'update',
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: reqBody,
                message: 'updated a Supplier'
            });
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }
    },

    delete: async (id, reqBody, loggedUser) => {
        try {
            const crieteria = { _id: ObjectId(id) };
            const result = await DataAccess.DeleteOne(collection_name, crieteria);
            saveActivity({
                module: collection_name,
                action: 'update',
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: reqBody,
                message: 'deleted a Supplier'
            });
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }

    },

};

module.exports = model;