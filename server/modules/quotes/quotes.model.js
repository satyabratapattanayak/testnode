const mongodb = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const httpStatus = require('http-status');
const { isEmpty, first } = require('lodash');

const DataAccess = require('../../helpers/DataAccess');
const config = require('../../config/config');
const Audit = require('../audit/audit.model');

let mydb;
const collection_name = 'quotes';
const database = require('../../service/database');
database.getDb().then(res => { mydb = res; });

const collection = (collectionName) => { return mydb.collection(collectionName); };


const model = {
    findById: (id) => {
        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .aggregate([
                    { $match: { _id: ObjectId(id) } },
                    { $lookup: { from: 'files_storage', localField: 'files', foreignField: '_id', as: 'quotes_file_details' } },
                    { $sort: { 'created_at': -1 } }
                ])
                .toArray()
                .then((result) => {
                    return result;
                });
        }
    },
    all: () => {
        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .aggregate([
                    { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'created_by_details' } },
                    { $sort: { 'created_at': -1 } }
                ])
                .toArray()
                .then((result) => {
                    return result;
                });
        }
    },
    create: (body, currentLoggedUser) => {
        if (body.files) {
            let uploadedFile = [];
            body.files.forEach(element => {
                uploadedFile.push(ObjectId(element.id));
            });
            body.files = uploadedFile;
        }
        return DataAccess.InsertOne(collection_name, body).then((result) => {
            Audit.addLog({
                module: 'quotes',
                action: 'create',
                documentId: first(result).documentId,
                userId: ObjectId(currentLoggedUser._id),
                message: 'created a quote',
                date: new Date()
            });
        });
    },
    update: (id, body, currentLoggedUser) => {
        if (body.files) {
            let uploadedFile = [];
            body.files.forEach(element => {
                uploadedFile.push(ObjectId(element.id));
            });
            body.files = uploadedFile;
        }
        return DataAccess.UpdateOne(collection_name, { _id: ObjectId(id) }, { $set: body }).then((resp) => {
            if (resp.modifiedCount > 0) {
                Audit.addLog({
                    module: 'quotes',
                    action: 'update',
                    documentId: ObjectId(body.documentId),
                    userId: ObjectId(currentLoggedUser._id),
                    message: 'updated a quote',
                    date: new Date()
                });
                console.log('777');
            }
            return resp.modifiedCount > 0 ? 1 : 0;
        });
    },
    deleteById: (id, body, currentLoggedUser) => {
        if (mydb) {
            const collections = collection(collection_name);
            return collections.deleteOne({ _id: ObjectId(id) })
                .then((result) => {
                    if (result.deletedCount > 0) {
                        Audit.addLog({
                            module: 'quotes',
                            action: 'delete',
                            documentId: ObjectId(body.documentId),
                            userId: ObjectId(currentLoggedUser._id),
                            message: 'deleted a quote',
                            date: new Date()
                        });
                        return 1;
                    } else {
                        return 0;
                    }
                });
        }
    },
};

module.exports = model;