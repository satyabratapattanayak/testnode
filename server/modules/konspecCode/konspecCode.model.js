const mongodb = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const httpStatus = require('http-status');
const { isEmpty, first, isArray } = require('lodash');

const DataAccess = require('../../helpers/DataAccess');
const config = require('../../config/config');
const Audit = require('../audit/audit.model');
const { getActionName, getModuleName } = require('../shared/shared.controller');


const database = require('../../service/database');
const collection_name = 'konspecCode';
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
                message: 'created a ' + collection_name
            });
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
                message: 'updated a ' + collection_name
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
                message: 'deleted a ' + collection_name
            });
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }

    },

};

module.exports = model;