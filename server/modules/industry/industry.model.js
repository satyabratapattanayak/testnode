// @ts-check
const PubSub = require('pubsub-js');
const ObjectId = require('mongodb').ObjectID;
const { isEmpty, first, isArray } = require('lodash');

const acl = require('../../service/acl');
const DataAccess = require('../../helpers/DataAccess');
const config = require('../../config/config');
const Audit = require('../../modules/audit/audit.model');


const database = require('../../service/database');
const collection_name = 'industry';
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
                        from: 'subIndustry',
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
                                                { $in: ['$$img', '$industry'] }
                                            ]
                                    }
                                }
                            }
                        ],
                        as: 'subIndustry_Details'
                    }
                },
                {
                    $addFields: {
                        subIndustry: '$subIndustry_Details',
                    }
                },
                {
                    $project: {
                        subIndustry_Details: 0,
                        'subIndustry.industry': 0,
                        'subIndustry.created_at': 0,
                        'subIndustry.modified_At': 0,
                        'subIndustry.created_by': 0,
                    }
                },
                { $sort: { created_at: -1 } }
            ];
            return DataAccess.aggregate(collection_name, crieteria);
        } catch (error) {
            throw new Error(error);
        }
    },

    listAll: (query) => {
        try {
            if (!query) {
                query = { deleted: { $ne: 1 } };
            }
            const crieteria = [
                { $match: query },
                { $addFields: { '_id': { '$toString': '$_id' } } },
                {
                    $lookup: {
                        from: 'subIndustry',
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
                                                { $in: ['$$img', '$industry'] }
                                            ]
                                    }
                                }
                            }
                        ],
                        as: 'subIndustry_Details'
                    }
                },
                {
                    $addFields: {
                        subIndustry: '$subIndustry_Details',
                    }
                },
                {
                    $project: {
                        subIndustry_Details: 0,
                        'subIndustry.industry': 0,
                        'subIndustry.created_at': 0,
                        'subIndustry.modified_At': 0,
                        'subIndustry.created_by': 0,
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
            acl.allowUser('industry', loggedUser, reqBody);
            reqBody.created_at = new Date();
            reqBody.modified_At = new Date();
            reqBody.created_by = loggedUser._id;
            const newData = await DataAccess.InsertOne(collection_name, reqBody);
            saveActivity({
                module: 'industry',
                action: 'create',
                documentId: ObjectId(first(newData)._id),
                userId: ObjectId(loggedUser._id),
                data: newData,
                message: 'created a Industry'
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
            acl.allowUser('industry', loggedUser, reqBody);
            delete reqBody.created_at;
            delete reqBody.created_by;
            reqBody.modified_At = new Date();
            const crieteria = { _id: ObjectId(id) };
            const doc = { $set: reqBody };
            const result = await DataAccess.UpdateOne(collection_name, crieteria, doc);
            saveActivity({
                module: 'industry',
                action: 'update',
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: reqBody,
                message: 'updated a Industry'
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
                    message: 'deleted a Industry'
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