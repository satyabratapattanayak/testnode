// @ts-check
const ObjectId = require('mongodb').ObjectID;
const { isEmpty, first, isArray } = require('lodash');
const PubSub = require('pubsub-js');
const DataAccess = require('../../helpers/DataAccess');


const { Modules, } = require('../shared/shared.model');

const database = require('../../service/database');
const collection_name = Modules().deals;
let mydb;
database.getDb().then(res => { mydb = res; ensureIndex(); });
const collection = (collectionName) => { return mydb.collection(collectionName); };
const ensureIndex = () => {
    let locCollection = collection(collection_name);
    locCollection.ensureIndex("deal_name", (err, name) => {
        console.log("ensureIndex read ", err, name);
    });
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const pageOrDefault = (page) => {
    const result = !page ? DEFAULT_PAGE : parseInt(page);
    return result;
};

const limitOrDefault = (limit) => {
    return !limit ? DEFAULT_LIMIT : parseInt(limit);
};

class model {
    constructor() {
        console.log(Modules().deals + ' module constructor');
        this.common_query = {
            List: {
                data: [
                    {
                        $project: {
                            _id: 1,
                        }
                    },
                    { $sort: { '_id': -1 } },
                ],
            },
            Details: [
                { $lookup: { from: 'customer', localField: 'customer_id', foreignField: '_id', as: 'customer_details' } },
                {
                    $lookup: {
                        from: 'customer_cmr_details',
                        let: { customer_id: "$_id" },
                        "pipeline": [
                            { "$match": { deleted: { $ne: true } } },
                            { "$match": { "$expr": { "$eq": ["$customer_id", "$$customer_id"] } } },
                            { $sort: { created_at: -1 } }
                        ],
                        as: 'linked_cmr_details_data'
                    }
                },

                {
                    $project: {
                        _id: 1,
                    }
                },
            ]
        }
    }


    async details(user, id) {
        console.log('deal details');
        try {
            const crieteria = [
                { $match: { _id: ObjectId(id) } },
                ...this.common_query.Details
            ];
            const data = await DataAccess.aggregate(collection_name, crieteria);
            return data
        } catch (error) {
            throw new Error(error);
        }
    }


    async listAll(loggedUser, params) {
        try {
            let matchQuery = { deleted: { $ne: 1 } };

            console.log('QUERY: ', matchQuery);
            const crieteria = [
                {
                    "$facet": {
                        "data": [
                            { $match: matchQuery },
                            ...this.common_query.List.data
                        ],
                        "totalCount": [
                            { $match: matchQuery },
                        ],
                    }
                }
            ];
            if (params && !isEmpty(params)) {

                if (params.filters && Object.keys(params.filters).length > 0) {
                    let filterKeys = Object.keys(params.filters)
                    let filter = {};
                    filter[filterKeys[i]] = { "$regex": params.filters[filterKeys[i]].value, "$options": "i" }
                    crieteria[0]["$facet"]["data"].push({ "$match": filter });
                    // crieteria[0]["$facet"]["totalCount"].push({ "$match": filter });
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
            const data = await DataAccess.aggregate(collection_name, crieteria);
            return data
        } catch (error) {
            throw new Error(error)
        }
    }

    async create(loggedUser, reqBody, ) {
        try {
            reqBody.created_by = loggedUser._id;
            reqBody.created_at = new Date();
            reqBody.modified_At = new Date();
            reqBody.bdStage = 's3';
            const newData = await DataAccess.InsertOne(collection_name, reqBody);
            return newData;
        } catch (error) {
            throw new Error(error)
        }
    }

    async update(id, reqBody, loggedUser) {
        try {
            delete reqBody.created_at;
            reqBody.modified_At = new Date();
            const crieteria = { _id: ObjectId(id) };
            const doc = { $set: reqBody };
            const result = await DataAccess.UpdateOne(collection_name, crieteria, doc);
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error)
        }
    }

    async delete(id, reqBody, loggedUser) {
        try {
            const crieteria = { _id: ObjectId(id) };
            const result = await DataAccess.DeleteOne(collection_name, crieteria);
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error)
        }
    }
}


let dealerModel = new model()
module.exports = dealerModel;



