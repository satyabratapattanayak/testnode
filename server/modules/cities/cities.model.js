const mongodb = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const httpStatus = require('http-status');
const DataAccess = require('../../helpers/DataAccess');

let mydb;
const collection_name = 'city';
const database = require('../../service/database');
database.getDb().then(res => { mydb = res; });


const checkCityAlreadyExist = async (collectionName, query) => {
    try {
        return DataAccess.findOne(collectionName, query);
    } catch (error) {
        throw new Error(error)
    }
}

const model = {

    findOne: async (code) => {
        try {
            // return DataAccess.findOne(collection_name, { city: code });

            const criteria = [
                { $match: { city: code } },
                { $lookup: { from: 'state', localField: 'state', foreignField: 'stateCode', as: 'stateDetails' } },
                { $addFields: { state_name: { $arrayElemAt: ['$stateDetails.state', 0] } } },
                { $project: { stateDetails: 0 } }

            ];
            const result = await DataAccess.aggregate(collection_name, criteria);
            return result[0];

        } catch (error) {
            throw new Error(error);
        }
    },


    filterAll: (params) => {
        let query = {};

        if (params && params.state) {
            query['state'] = { $eq: params.state };
        } else if (params && params.postcode) {
            query['postCode'] = { $in: [params.postcode] };
        }
        if (params && params.modified_At) {
            query['modified_At'] = params.modified_At;
        }

        return DataAccess.findAll('city', query);
    },
    all: (params) => {
        let query = { deleted: { $ne: 1 } };

        if (params && params.state) {
            query['state'] = { $eq: params.state };
        } else if (params && params.postcode) {
            query['postCode'] = { $in: [params.postcode] };
        }
        if (params && params.modified_At) {
            query['modified_At'] = params.modified_At;
        }
        const criteria = [
            { $match: query },
            // { $project: { _id: 0, postCode: 0 } }
            { $project: { _id: 0 } } // sending postcode for mobile purpose
        ];
        return DataAccess.aggregate('city', criteria);
    },
    listPostCode: (params) => {
        let query = { deleted: { $ne: 1 } };
        if (params && params.city) {
            query['city'] = { $eq: params.city };
        } else if (params && params.postcode) {
            let postCode = params.postcode;
            let regex = new RegExp(postCode, 'g');
            query['postCode'] = regex;
        }
        if (params && params.modified_At) {
            query['modified_At'] = params.modified_At;
        }
        const criteria = [
            { $match: query },
            { $project: { _id: 0, } }
        ];
        return DataAccess.aggregate('postCode', criteria);
    },
    create: async (doc) => {
        try {
            const found = await checkCityAlreadyExist(collection_name, { city: doc.city });
            doc.modified_At = new Date();
            doc.uniqueId = doc.city;
            return found ? 0 : DataAccess.InsertOne(collection_name, doc);
        } catch (error) {
            throw new Error(error)
        }
    },
    createPostCode: async (doc) => {
        try {
            const found = await checkCityAlreadyExist('postCode', { postCode: doc.postCode });
            doc.modified_At = new Date();
            return found ? 0 : DataAccess.InsertOne('postCode', doc);
        } catch (error) {
            throw new Error(error);
        }
    },
    update: async (id, body) => {
        try {
            const found = await checkCityAlreadyExist(collection_name, {
                $and: [
                    { city: body.city },
                    { _id: { $ne: ObjectId(id) } },
                    { deleted: { $ne: 1 } }
                ]
            });
            body.modified_At = new Date();
            const crieteria = { _id: ObjectId(id) };
            const doc = { $set: body };
            return found ? 0 : DataAccess.UpdateOne(collection_name, crieteria, doc);
        } catch (error) {
            throw new Error(error);
        }
    },

    updatePostCode: async (id, body) => {
        try {
            body.modified_At = new Date();
            const crieteria = { postCode: id };
            const doc = { $set: body };
            return DataAccess.UpdateOne('postCode', crieteria, doc);
        } catch (error) {
            throw new Error(error)
        }
    },
    delete: async (id) => {
        try {
            const crieteria = { city: id };
            return DataAccess.DeleteOne(collection_name, crieteria);
        } catch (error) {
            throw new Error(error);
        }
    },
    deletePostCode: async (id) => {
        try {
            const crieteria = { postCode: id };
            return DataAccess.DeleteOne('postCode', crieteria);
        } catch (error) {
            throw new Error(error);
        }
    },

    updateMany: (collectionName, query, doc) => {
        DataAccess.UpdateMany(collectionName, query, doc)
    },
    findOnePostCode: async (code) => {
        try {
            return DataAccess.findOne('postCode', { postCode: code });
        } catch (error) {
            throw new Error(error);
        }
    },

};

module.exports = model;