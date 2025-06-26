// @ts-check
const PubSub = require('pubsub-js');
const ObjectId = require('mongodb').ObjectID;
const httpStatus = require('http-status');
const { isEmpty, first, isArray } = require('lodash');

const APIError = require('../../helpers/APIError');
const DataAccess = require('../../helpers/DataAccess');
const config = require('../../config/config');
const Audit = require('../../modules/audit/audit.model');
const acl = require('../../service/acl');
const { getActionName, getModuleName } = require('../../modules/shared/shared.controller');


const database = require('../../service/database');
const collection_name = 'category';
let mydb;
database.getDb().then(res => { mydb = res; });



let saveActivity = (body) => {
    body.date = new Date();
    Audit.addLog(body);
};

const model = {
    details: (id) => {
        try {
            const crieteria = [
                { $match: { _id: ObjectId(id) } },
                { $addFields: { '_id': { '$toString': '$_id' } } },
                {
                    $lookup: {
                        from: 'subCategory',
                        let: {
                            img: '$_id'
                        },
                        pipeline: [
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $in: ['$$img', '$category'] }
                                            ]
                                    }
                                }
                            }
                        ],
                        as: 'subCategory_Details'
                    }
                },
                {
                    $addFields: {
                        subCategory: '$subCategory_Details',
                    }
                },
                {
                    $project: {
                        subCategory_Details: 0,
                        'subCategory.category': 0,
                        'subCategory.created_at': 0,
                        'subCategory.modified_At': 0,
                        'subCategory.created_by': 0,
                    }
                },
            ];
            return DataAccess.aggregate(collection_name, crieteria);
        } catch (error) {
            throw new Error(error)
        }
    },
    flatList: (filter) => { return DataAccess.findAll(collection_name, filter); },
    listAll: (filter) => {
        let query;
        if (filter) {
            query = filter;
        } else {
            query = {

            };
        }
        query.deleted = { $ne: 1 }
        try {
            const crieteria = [
                { $match: query },
                { $addFields: { '_id': { '$toString': '$_id' } } },
                {
                    $lookup: {
                        from: 'subCategory',
                        let: {
                            img: '$_id'
                        },
                        pipeline: [
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $in: ['$$img', '$category'] }
                                            ]
                                    }
                                }
                            }
                        ],
                        as: 'subCategory_Details'
                    }
                },
                {
                    $addFields: {
                        subCategory: '$subCategory_Details',
                    }
                },
                {
                    $project: {
                        subCategory_Details: 0,
                        'subCategory.category': 0,
                        'subCategory.created_at': 0,
                        'subCategory.modified_At': 0,
                        'subCategory.created_by': 0,
                    }
                },
                { $sort: { created_at: -1 } }
            ];
            return DataAccess.aggregate(collection_name, crieteria);
        } catch (error) {
            throw new Error(error);
        }
    },

    create: async (reqBody, loggedUser) => {
        try {
            reqBody.created_at = new Date();
            reqBody.modified_At = new Date();
            reqBody.created_by = loggedUser._id;
            acl.allowUser('category', loggedUser, reqBody);
            const newData = await DataAccess.InsertOne(collection_name, reqBody);
            saveActivity({
                module: collection_name,
                action: 'create',
                documentId: ObjectId(first(newData)._id),
                userId: ObjectId(loggedUser._id),
                data: newData,
                message: 'created a Category'
            });
            PubSub.publishSync('DBUpdates', { change: collection_name, data: newData[0] });
            if (reqBody.offlineSyncId) {
                const deleteDupData = {
                    delete: true,
                    deleted: 1,
                    _id: reqBody.offlineSyncId
                };
                PubSub.publishSync('DBDelete', { change: collection_name, data: deleteDupData });
            }
            return newData;
        } catch (error) {
            throw new Error(error);
        }
    },

    update: async (id, reqBody, loggedUser) => {
        try {
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
                message: 'updated a Category'
            });
            DataAccess.findOne(collection_name, { _id: ObjectId(id) }).then((data) => {
                PubSub.publishSync('DBUpdates', { change: collection_name, data: data });
            })

            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }
    },

    delete: async (id, loggedUser) => {
        return new Promise(async (resolve, reject) => {
            try {
                const crieteria = { _id: ObjectId(id) };
                const result = await DataAccess.DeleteOne(collection_name, crieteria);
                saveActivity({
                    module: collection_name,
                    action: 'delete',
                    documentId: ObjectId(id),
                    userId: ObjectId(loggedUser._id),
                    data: { id: id },
                    message: 'deleted a Category'
                });
                if (result.matchedCount > 0) {
                    const deleteDupData = {
                        deleted: 1,
                        delete: true,
                        _id: id
                    };
                    PubSub.publishSync('DBDelete', { change: collection_name, data: deleteDupData });
                }
                resolve(result.matchedCount > 0 ? 1 : 0);
            } catch (error) {
                reject(error);
            }
        })
    },

};

module.exports = model;