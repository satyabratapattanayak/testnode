const database = require('../service/database');

let mydb; database.getDb().then(res => { mydb = res; });

const count = (collectionName, crieteria) => {
    return new Promise((resolve, reject) => {
        const _collection = mydb.collection(collectionName);
        return _collection
            .find(crieteria).count()
            .then((result) => { resolve(result); })
            .catch((e) => reject(e));
    });
};

const findAll = (collectionName, crieteria) => {
    return new Promise((resolve, reject) => {
        const _collection = mydb.collection(collectionName);
        return _collection
            .find(crieteria).limit(1000).sort({ created_at: -1 }).toArray()
            .then((result) => { resolve(result); })
            .catch((e) => reject(e));
    });
};

const findOne = (collectionName, crieteria) => {
    return new Promise((resolve, reject) => {
        const _collection = mydb.collection(collectionName);
        return _collection
            .findOne(crieteria)
            .then((result) => { resolve(result); })
            .catch((e) => reject(e));
    });
};

const aggregate = async (collectionName, crieteria, options) => {
    try {
        const _collection = await mydb.collection(collectionName);
        if (collectionName === "customer_cmr_details") {
            options = {
                ...options,
                allowDiskUse: true   // Adding allowDiskUse as true for MongoDB aggregation query has exceeded the memory limit for sorting
            };
        }
        const result = await _collection.aggregate(crieteria, options).toArray();
        return result;
    } catch (error) {
        throw new Error(error);
    }
};

const InsertOne = (collectionName, doc) => {
    return new Promise((resolve, reject) => {
        const _collection = mydb.collection(collectionName);
        doc.deleted = 0;
        return _collection
            .insertOne(doc)
            .then((result) => { resolve(result.ops); })
            .catch((e) => reject(e));
    });
};

const InsertMany = (collectionName, doc) => {
    return new Promise((resolve, reject) => {
        const _collection = mydb.collection(collectionName);
        return _collection
            .insertMany(doc)
            .then((result) => { resolve(result); })
            .catch((e) => reject(e));
    });
};

const UpdateOne = (collectionName, crieteria, doc,options) => {
    return new Promise((resolve, reject) => {
        const _collection = mydb.collection(collectionName);
        return _collection
            .updateOne(crieteria, doc,options)
            .then((result) => { resolve(result); })
            .catch((e) => reject(e));
    });
};

const findOneAndUpdate = (collectionName, crieteria, doc) => {
    return new Promise((resolve, reject) => {
        const _collection = mydb.collection(collectionName);
        return _collection
            .findOneAndUpdate(crieteria, doc)
            .then((result) => { resolve(result); })
            .catch((e) => reject(e));
    });
};

const UpdateMany = (collectionName, crieteria, doc) => {
    return new Promise((resolve, reject) => {
        const _collection = mydb.collection(collectionName);
        return _collection
            .updateMany(crieteria, doc)
            .then((result) => { resolve(result); })
            .catch((e) => reject(e));
    });
};

const DeleteOne = (collectionName, crieteria) => {
    return new Promise((resolve, reject) => {
        const _collection = mydb.collection(collectionName);
        return _collection
            .updateOne(crieteria, { $set: { deleted: 1, modified_At: new Date() } })
            .then((result) => { resolve(result); })
            .catch((e) => reject(e));
    });
};

const DeleteMany = (collectionName, crieteria) => {
    return new Promise((resolve, reject) => {
        const _collection = mydb.collection(collectionName);
        return _collection
            .updateMany(crieteria, { $set: { deleted: 1, modified_At: new Date() } })
            .then((result) => { resolve(result); })
            .catch((e) => reject(e));
    });
};

const RemoveOne = (collectionName, crieteria) => {
    return new Promise((resolve, reject) => {
        const _collection = mydb.collection(collectionName);
        return _collection
            .deleteOne(crieteria)
            .then((result) => { resolve(result); })
            .catch((e) => reject(e));
    });
};

const RemoveMany = (collectionName, crieteria) => {
    return new Promise((resolve, reject) => {
        const _collection = mydb.collection(collectionName);
        return _collection
            .deleteMany(crieteria)
            .then((result) => { resolve(result); })
            .catch((e) => reject(e));
    });
};

const BulkWrite = (collectionName, crieteria) => {
    return new Promise((resolve, reject) => {
        const _collection = mydb.collection(collectionName);
        return _collection
            .bulkWrite(crieteria)
            .then((result) => { resolve(result); })
            .catch((e) => reject(e));
    });
};

module.exports = {
    count,
    findAll,
    findOne,
    aggregate,
    InsertOne,
    InsertMany,
    UpdateOne,
    UpdateMany,
    DeleteOne,
    DeleteMany,
    RemoveOne,
    RemoveMany,
    findOneAndUpdate,
    BulkWrite
};