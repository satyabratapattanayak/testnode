const ObjectId = require('mongodb').ObjectID;
const DataAccess = require('../../helpers/DataAccess');

let mydb;
const collection_name = 'state';
const database = require('../../service/database');
database.getDb().then(res => { mydb = res; });

const collection = (collectionName) => {
    return mydb.collection(collectionName);
};


const checkStateAlreadyExist = async (query) => {
    try {
        return DataAccess.findOne(collection_name, query);
    } catch (error) {
        throw new Error(error);
    }
}

const model = {
    findOne: async (code) => {
        try {
            // return DataAccess.findOne(collection_name, { stateCode: code });

            const criteria = [
                { $match: { stateCode: code } },
                { $lookup: { from: 'country', localField: 'country', foreignField: 'countryCode', as: 'countryDetails' } },
                { $addFields: { country_name: { $arrayElemAt: ['$countryDetails.country', 0] } } },
                { $project: { countryDetails: 0 } }

            ];
            const result = await DataAccess.aggregate(collection_name, criteria);
            return result[0];

        } catch (error) {
            throw new Error(error);
        }
    },
    filterAll: (query) => {
        return DataAccess.findAll(collection_name, query);
    },
    all: (params, body) => {

        let query = { deleted: { $ne: 1 } };
        if (params && params.country) {
            if (params.country != 'IN') {
                params.country = 'NA'; // todo: remove this later when all international city loaded on app
            }
            query['country'] = { $eq: params.country };
        } else if ((params && params.statecode) || (body && body.statecode)) {
            query['stateCode'] = { $in: [params.statecode, body.statecode] };
        } else if ((params && params.city) || (body && body.city)) {
            query['city'] = { $in: [params.city, body.city] };
        }
        if (params && params.modified_At) {
            query['modified_At'] = params.modified_At;
        }
        const criteria = [
            { $match: query },
            // { $project: { _id: 0, city: 0 } }
            { $project: { _id: 0, } } // sending city for mobile purpose
        ];
        return DataAccess.aggregate(collection_name, criteria);
    },
    create: async (doc) => {
        try {
            const found = await checkStateAlreadyExist({ stateCode: doc.stateCode });
            return found ? 0 : DataAccess.InsertOne(collection_name, doc);
        } catch (error) {
            throw new Error(error)
        }
    },
    update: async (code, body) => {
        try {
            const found = await checkStateAlreadyExist({
                $and: [
                    { stateCode: body.stateCode },
                    { deleted: { $ne: 1 } },
                    { stateCode: { $ne: code } },
                ]
            });
            const crieteria = { stateCode: code };
            // delete body.stateCode;
            const doc = { $set: body };
            return found ? 0 : DataAccess.UpdateOne(collection_name, crieteria, doc);
            // return DataAccess.UpdateOne(collection_name, crieteria, doc);
        } catch (error) {
            throw new Error(error);
        }
    },
    delete: async (id) => {
        try {
            const crieteria = { stateCode: id };
            return DataAccess.DeleteOne(collection_name, crieteria);
        } catch (error) {
            throw new Error(error)
        }
    },
    updateOne: async (collectionName, condition, doc) => {
        try {
            return DataAccess.UpdateOne(collection_name, condition, doc);
        } catch (error) {
            throw new Error(error)
        }
    },
};

module.exports = model;