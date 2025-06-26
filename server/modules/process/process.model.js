// @ts-check
const ObjectId = require('mongodb').ObjectID;
const httpStatus = require('http-status');
const { isEmpty, first, isArray } = require('lodash');
const PubSub = require('pubsub-js');

const acl = require('../../service/acl');
const APIError = require('../../helpers/APIError');
const DataAccess = require('../../helpers/DataAccess');
const config = require('../../config/config');
const Audit = require('../../modules/audit/audit.model');
const { getActionName, getModuleName } = require('../../modules/shared/shared.controller');


const database = require('../../service/database');
const collection_name = 'process';
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
                        from: 'subProcess',
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
                                                { $in: ['$$img', '$process'] }
                                            ]
                                    }
                                }
                            }
                        ],
                        as: 'SubProcess_Details'
                    }
                },
                {
                    $addFields: {
                        subProcess: '$SubProcess_Details',
                    }
                },
                {
                    $project: {
                        'subProcess.process': 0,
                        SubProcess_Details: 0,
                        'subProcess.created_at': 0,
                        'subProcess.modified_At': 0,
                        'subProcess.created_by': 0,
                    }
                }
            ];
            return DataAccess.aggregate(collection_name, crieteria);
        } catch (error) {
            throw new Error(error);
        }
    },
    flatList: (filter) => {
        return DataAccess.findAll(collection_name, filter);
    },
    listAll: (query) => {
        try {
            if (!query) {
                query = {};
            }
            query.deleted = { $ne: 1 }
            const crieteria = [
                { $match: query },
                { $addFields: { '_id': { '$toString': '$_id' } } },
                {
                    $lookup: {
                        from: 'subProcess',
                        let: {
                            img: '$_id'
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and:
                                            [
                                                { $in: ['$$img', '$process'] },
                                                { $ne: ['$deleted', 1] }
                                            ]
                                    }
                                }
                            }
                        ],
                        as: 'SubProcess_Details'
                    }
                },
                {
                    $addFields: {
                        subProcess: '$SubProcess_Details',
                    }
                },
                {
                    $project: {
                        SubProcess_Details: 0,
                        'subProcess.process': 0,
                        'subProcess.created_at': 0,
                        'subProcess.modified_At': 0,
                        'subProcess.created_by': 0,
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
            acl.allowUser('process', loggedUser, reqBody);
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
                message: 'created a Process'
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
            acl.allowUser('process', loggedUser, reqBody);

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
                message: 'updated a Process'
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
                    message: 'deleted a Process'
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