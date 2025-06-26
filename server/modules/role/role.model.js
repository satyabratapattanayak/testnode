const ObjectId = require('mongodb').ObjectID;
const { isEmpty } = require('lodash');

const APIError = require('../../helpers/APIError');
const DataAccess = require('../../helpers/DataAccess');
const config = require('../../config/config');


let mydb;
const database = require('../../service/database');
database.getDb().then(res => { mydb = res; });

const collection_name = 'role';

const collection = (collectionName) => {
    return mydb.collection(collectionName);
};


const checkRoleAlreadyExist = async (query) => {
    try {
        return DataAccess.findOne(collection_name, query);
    } catch (error) {
        throw new Error(error);
    }
};

const checkHierarchyAlreadyExist = async (query) => {
    try {
        return DataAccess.findOne(collection_name, query);
    } catch (error) {
        throw new Error(error);
    }
};

const model = {
    findByName: (userRole) => {

        if (!isEmpty(userRole)) {
            if (mydb) {
                const collections = collection(collection_name);
                return collections
                    // .find({ $text: { $search: userRole } })
                    .findOne({ role: userRole })
                    // .toArray()
                    .then((result) => {
                        return result._id;
                    });
            }
        } else {
            if (mydb) {
                const collections = collection(collection_name);
                return collections
                    .find()
                    .toArray()
                    .then((result) => {
                        return;
                    });
            }
        }
    },
    findACL: (userACL) => {
        if (!isEmpty(userACL)) {
            if (mydb) {
                const collections = collection('access_level');
                return collections
                    .find({ $text: { $search: userACL } })
                    .toArray()
                    .then((result) => {
                        return result[0]._id;
                    });
            }

        } else {
            if (mydb) {
                const collections = collection(collection_name);
                return collections
                    .find()
                    .toArray()
                    .then((result) => {
                        return;
                    });
            }
        }
    },
    findById: (id) => {
        const crieteria = [
            { $match: { _id: parseInt(id) } },
            { $lookup: { from: 'access_level', localField: '_id', foreignField: 'roles', as: 'access_levels_details' } },
            {
                $project: {
                    _id: 1, role: 1, hierarchy: 1, access_levels_details: { _id: 1, access_level: 1 }
                }
            }
        ];
        return DataAccess.aggregate('role', crieteria);
    },
    all: () => {
        const crieteria = [
            // { $match: { _id: { $nin: [1] } } },
            { $match: {} },
            { $lookup: { from: 'access_level', localField: '_id', foreignField: 'roles', as: 'access_levels_details' } },
            {
                $project: {
                    _id: 1, role: 1, hierarchy: 1, access_levels_details: { _id: 1, access_level: 1 }
                }
            }
        ];
        return DataAccess.aggregate('role', crieteria);
    },
    create: async (doc) => {
        try {
            const found = await checkRoleAlreadyExist({ role: doc.role });
            const foundHierarchy = await checkHierarchyAlreadyExist({ hierarchy: doc.hierarchy });
            if (found) {
                return 0;
            } else if (foundHierarchy) {
                return 1;
            } else {
                await addNewRole(doc);
            }
        } catch (error) {
            throw new Error(error);
        }
    },
    update: async (id, body) => {
        try {
            delete body._id;
            const found = await checkRoleAlreadyExist({
                $and: [
                    { role: body.role },
                    { _id: { $ne: id } },
                ]
            });
            const foundHierarchy = await checkHierarchyAlreadyExist({
                $and: [
                    { hierarchy: body.hierarchy },
                    { _id: { $ne: id } },
                ]
            });
            const crieteria = { _id: id };
            const doc = { $set: body };

            if (found) {
                return 0;
            } else if (foundHierarchy) {
                return 1;
            } else {
                return DataAccess.UpdateOne(collection_name, crieteria, doc);
            }

            // return found ? 0 : DataAccess.UpdateOne(collection_name, crieteria, doc);
        } catch (error) {
            throw new Error(error);
        }
    },
    delete: async (id) => {
        try {
            const crieteria = { _id: ObjectId(id) };
            return DataAccess.DeleteOne(collection_name, crieteria);
        } catch (error) {
            throw new Error(error);
        }
    },
};

module.exports = model;

async function addNewRole(doc) {
    const nextSeqId = await DataAccess.findOneAndUpdate('counters', { _id: 'role' }, { $inc: { seq: 1 } });
    doc._id = nextSeqId.value.seq; // nextSeqId.seq;
    await DataAccess.InsertOne(collection_name, doc);
    DataAccess.UpdateMany('access_level', { _id: { $in: [9, 10, 11, 12] } }, { $push: { roles: doc._id } });
}
