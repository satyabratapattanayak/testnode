const ObjectId = require('mongodb').ObjectID;
const DataAccess = require('../../helpers/DataAccess');
const database = require('../../service/database');

let mydb;
const collection_name = 'country';
database.getDb().then(res => { mydb = res; });

const checkCountryAlreadyExist = async (query) => {
    try {
        return DataAccess.findOne(collection_name, query);
    } catch (error) {
        throw new Error(error);
    }
};

const model = {
    findOne: async (code) => {
        try {
            return DataAccess.findOne(collection_name, { countryCode: code });
        } catch (error) {
            throw new Error(error);
        }
    },
    filterAll: (query) => {

        return DataAccess.findAll(collection_name, query);
    },
    all: async (params) => {
        try {
            let query = { deleted: { $ne: 1 } };
            if (params && params.type) {
                query['type'] = { $eq: params.type.toLowerCase() };
            } else if (params && params.countryCode) {
                query['countryCode'] = { $eq: params.countryCode };
            }
            if (params && params.modified_At) {
                query['modified_At'] = params.modified_At;
            }
            const criteria = [
                { $match: query },
                { $sort: { countryName: 1 } },
                { $project: { _id: 0 } }
            ];
            return DataAccess.aggregate(collection_name, criteria);
        } catch (error) {
            throw new Error(error);
        }
    },
    create: async (doc) => {
        try {
            doc.modified_At = new Date();
            const found = await checkCountryAlreadyExist({ countryCode: doc.countryCode });
            return found ? 0 : DataAccess.InsertOne(collection_name, doc);
        } catch (error) {
            throw new Error(error);
        }
    },
    update: async (code, body) => {
        try {
            // const found = await checkCountryAlreadyExist({
            //     $and: [
            //         { countryCode: body.countryCode },
            //         { deleted: { $ne: 1 } }
            //     ]
            // });
            const crieteria = { countryCode: code };
            delete body.countryCode;
            const doc = { $set: body };
            // return found ? 0 : DataAccess.UpdateOne(collection_name, crieteria, doc);
            return DataAccess.UpdateOne(collection_name, crieteria, doc);
        } catch (error) {
            throw new Error(error);
        }
    },
    delete: async (code) => {
        try {
            const crieteria = { countryCode: code };
            return DataAccess.DeleteOne(collection_name, crieteria);
        } catch (error) {
            throw new Error(error);
        }
    },
};

module.exports = model;