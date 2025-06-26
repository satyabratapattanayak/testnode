// @ts-check
const ObjectId = require('mongodb').ObjectID;
const { isEmpty, first, isArray } = require('lodash');
const PubSub = require('pubsub-js');
const { getTodayEndTime, getTodayStartTime, getDateFormat, getTimeAgo } = require('../../config/dateutil');
const DataAccess = require('../../helpers/DataAccess');


const { Modules, } = require('../shared/shared.model');

const database = require('../../service/database');
const collection_name = Modules().notification;
let mydb;
database.getDb().then(res => { mydb = res; ensureIndex(); });
const collection = (collectionName) => { return mydb.collection(collectionName); };
const ensureIndex = () => {
    let locCollection = collection(collection_name);
    locCollection.ensureIndex("read", (err, name) => {
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
        console.log(Modules().notification + ' module constructor');
        this.common_query = {
            List: {
                data: [
                    {
                        $project: {
                            _id: 1,
                            message: 1,
                            module: 1, //{ $toUpper: '$module' },
                            documentId: 1,
                            date: 1,
                            read: 1,
                            unReadColor: {
                                $cond: {
                                    if: { $ne: ['$read', 1] },
                                    then: '#F7F9F9', else: '#ffffff'
                                }
                            },
                        }
                    },
                    { $sort: { 'date': -1 } },
                ],
            },
            Details: [
                {
                    $project: {
                        _id: 1,
                        message: 1,
                        module: 1, //{ $toUpper: '$module' },
                        documentId: 1,
                        date: 1,
                    }
                },
            ]
        }
    }
    async details(id) {
        try {
            const crieteria = [
                { $match: { _id: ObjectId(id) } },
            ];
            const data = await DataAccess.aggregate(Modules().notification, crieteria);
            return data
        } catch (error) {
            throw new Error(error);
        }
    }

    async getNotificationUnReadCount(loggedUser, params) {
        try {
            let matchQuery = { deleted: { $ne: 1 }, type: 'notifier', read: { $ne: 1 } };

            if (params && params.userId) {
                matchQuery['reciepient_userId'] = { $in: [ObjectId(params.userId)] }
            } else {
                if (loggedUser) {
                    matchQuery['reciepient_userId'] = { $eq: ObjectId(loggedUser._id) }
                } else {
                    matchQuery['reciepient_userId'] = { $eq: 'undefined' }
                }
            }
            console.log('QUERY: ', matchQuery);
            const data = await DataAccess.count(collection_name, matchQuery)
            console.log('resp: ', data);
            return data
        } catch (error) {
            throw new Error(error)
        }
    }

    async listAll(loggedUser, params) {
        try {
            let matchQuery = { deleted: { $ne: 1 }, type: 'notifier', };

            if (params && params.userId) {
                matchQuery['reciepient_userId'] = { $in: [ObjectId(params.userId)] }
            } else {
                if (loggedUser) {
                    matchQuery['reciepient_userId'] = { $eq: ObjectId(loggedUser._id) }
                } else {
                    matchQuery['reciepient_userId'] = { $eq: 'undefined' }
                }
            }

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
                        "unReadCount": [
                            { $match: matchQuery },
                            { $match: { read: { $ne: 1 } } },
                            { "$count": "count" }
                        ],
                    }
                }
            ];
            if (params && !isEmpty(params)) {

                if (params.filters && Object.keys(params.filters).length > 0) {
                    let filterKeys = Object.keys(params.filters)
                    let filter = {};


                    for (let i = 0; i < filterKeys.length; i++) {
                        filter[filterKeys[i]] = { "$regex": params.filters[filterKeys[i]].value, "$options": "i" }
                        crieteria[0]["$facet"]["data"].push({ "$match": filter });
                        // crieteria[0]["$facet"]["totalCount"].push({ "$match": filter });
                    }
                }

                if (params.sortField) {
                    let sort = {};
                    sort[params.sortField] = params.sortOrder
                    crieteria[0]["$facet"]["data"].push({ "$sort": sort });
                }
                // crieteria[0]["$facet"]["data"].push({ "$limit": params.first + params.rows });
                // crieteria[0]["$facet"]["data"].push({ "$skip": params.first })
                crieteria[0]["$facet"]["data"].push({ "$skip": limitOrDefault(params.limit) * (pageOrDefault(params.page) - 1) })
                crieteria[0]["$facet"]["data"].push({ "$limit": limitOrDefault(params.limit) });
            }
            crieteria[0]["$facet"]["totalCount"].push({ "$count": "count" });
            const data = await DataAccess.aggregate(Modules().notification, crieteria);
            return data
        } catch (error) {
            throw new Error(error)
        }
    }

    async create(reqBody, loggedUser) {
        try {

            if (reqBody.reciepient_userId) reqBody.reciepient_userId = ObjectId(reqBody.reciepient_userId)
            if (reqBody.date) reqBody.date = new Date(reqBody.date)
            const newData = await DataAccess.InsertOne(Modules().notification, reqBody);

            if (reqBody && reqBody.type && reqBody.type === 'notifier') {
                PubSub.publishSync('notifications', { data: newData[0], loggedUser: loggedUser });
            }
            return newData;
        } catch (error) {
            throw new Error(error)
        }
    }

    async update(id, reqBody, loggedUser) {
        try {
            console.log('update api result: ', id, ' :: ', reqBody, ' :: ', loggedUser);
            delete reqBody.created_at;
            delete reqBody.modified_At;
            reqBody.modified_At = new Date();
            const crieteria = { _id: ObjectId(id) };
            const doc = { $set: reqBody };
            const result = await DataAccess.UpdateOne(Modules().notification, crieteria, doc);
            PubSub.publishSync('notifications', { loggedUser: loggedUser });
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error)
        }
    }

    async markAllAsRead(loggedUser) {
        try {
            const crieteria = { reciepient_userId: ObjectId(loggedUser._id) };
            const doc = { $set: { read: 1 } };
            const result = await DataAccess.UpdateMany(Modules().notification, crieteria, doc);
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error)
        }
    }
    async markAllAsDeleted(loggedUser) {
        try {
            const crieteria = { reciepient_userId: ObjectId(loggedUser._id) };
            const doc = { $set: { deleted: 1 } };
            const result = await DataAccess.UpdateMany(Modules().notification, crieteria, doc);
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error)
        }
    }
    async delete(id, reqBody, loggedUser) {
        try {
            const crieteria = { _id: ObjectId(id) };
            const result = await DataAccess.DeleteOne(Modules().notification, crieteria);
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error)
        }

    }
}


let dealerModel = new model()
module.exports = dealerModel;



