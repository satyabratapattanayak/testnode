const PubSub = require('pubsub-js');
const ObjectId = require('mongodb').ObjectID;
const httpStatus = require('http-status');
const { isEmpty, first, isArray } = require('lodash');

const APIError = require('../../helpers/APIError');
const DataAccess = require('../../helpers/DataAccess');
const config = require('../../config/config');
const Audit = require('../../modules/audit/audit.model');
const { getActionName, getModuleName } = require('../../modules/shared/shared.controller');


const database = require('../../service/database');
const collection_name = 'subCategory';
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
                {
                    $lookup: {
                        from: 'category',
                        let: {
                            category: '$category'
                        },
                        pipeline: [
                            { $addFields: { '_id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $in: ['$_id', '$$category'] }
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
                        category: '$subCategory_Details',
                    }
                },
                {
                    $project: {
                        subCategory_Details: 0,
                        'category.created_at': 0,
                        'category.modified_At': 0,
                        'category.created_by': 0,
                    }
                }
            ];
            return DataAccess.aggregate(collection_name, crieteria);
        } catch (error) {
            throw new Error(error);
        }
    },

    listAll: () => {
        try {
            const crieteria = [
                { $match: { deleted: { $ne: 1 } } },
                {
                    $lookup: {
                        from: 'category',
                        let: {
                            category: '$category'
                        },
                        pipeline: [
                            { $addFields: { '_id': { '$toString': '$_id' } } },
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $and:
                                            [
                                                { $in: ['$_id', '$$category'] },
                                                { $ne: ['$deleted', 1] },
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
                        category: '$subCategory_Details.name',
                    }
                },
                {
                    $project: {
                        subCategory_Details: 0,
                        'category.created_at': 0,
                        'category.modified_At': 0,
                        'category.created_by': 0,
                    }
                }
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
            const newData = await DataAccess.InsertOne(collection_name, reqBody);
            saveActivity({
                module: collection_name,
                action: 'create',
                documentId: ObjectId(first(newData)._id),
                userId: ObjectId(loggedUser._id),
                data: newData,
                message: 'created a Sub Category'
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
                message: 'updated a Sub Category'
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
                    message: 'deleted a Sub Category'
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