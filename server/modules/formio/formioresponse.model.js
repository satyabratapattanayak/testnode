const ObjectId = require('mongodb').ObjectID;
const DataAccess = require('../../helpers/DataAccess');
const database = require('../../service/database');

let mydb;
const collection_name = 'formioResponse';
database.getDb().then(res => { mydb = res; });

const checkFormConfigAlreadyExist = async (query) => {
    try {
        return DataAccess.findOne(collection_name, query);
    } catch (error) {
        throw new Error(error);
    }
};

const model = {
    findOne: async (code) => {
        try {
            return DataAccess.findOne(collection_name, { _id: ObjectId(code) });
        } catch (error) {
            throw new Error(error);
        }
    },
    filterAll: (query) => {

        return DataAccess.findAll(collection_name, query);
    },
    all: async (params) => {
        try {
            let query = params || {};
            query.deleted = { $ne: 1 }
           
            const criteria = [
                { $match: query },
            ];
            console.log("criteria",JSON.stringify(criteria));
            return DataAccess.aggregate(collection_name, criteria);
        } catch (error) {
            throw new Error(error);
        }
    },
    create: async (doc) => {
        try {
            doc.modified_At = new Date();
            const found = await checkFormConfigAlreadyExist({ _id: ObjectId(doc._id)  });
            return found ? 0 : DataAccess.InsertOne(collection_name, doc);
        } catch (error) {
            throw new Error(error);
        }
    },
    update: async (code, body) => {
        try {
           
            const crieteria = { _id: ObjectId(code)  };
            delete body._id;
            const doc = { $set: body };
            const exists=  await DataAccess.findOne(collection_name, { _id: ObjectId(code) });
            console.log("exists",exists); 
            // return found ? 0 : DataAccess.UpdateOne(collection_name, crieteria, doc);
            return DataAccess.UpdateOne(collection_name, crieteria, doc,{upsert:true});
        } catch (error) {
            throw new Error(error);
        }
    },
    delete: async (code) => {
        try {
            const crieteria = { _id: ObjectId(code) };
            return DataAccess.DeleteOne(collection_name, crieteria);
        } catch (error) {
            throw new Error(error);
        }
    },
};

module.exports = model;