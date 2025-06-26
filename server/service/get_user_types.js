const database = require('./database');
const objectid = require('mongodb').ObjectID;
const { isArray, isEmpty } = require('lodash');
const DataAccess = require('../helpers/DataAccess');

let db;
database.getDb().then(res => {
    db = res;
});

const UserTypesService = {

    findOneByQuery: async (module, query) => {
        try {
            const data = await DataAccess.findOne(module, query);
            return data;
        } catch (error) {
            throw new Error(error);
        }
    },

    findAll: async (module, query) => {
        try {
            const data = await DataAccess.findAll(module, query);
            return data;
        } catch (error) {
            throw new Error(error);
        }
    },

    findAllByAggregate: async (module, query) => {
        try {
            const data = await DataAccess.aggregate(module, query);
            return data;
        } catch (error) {
            throw new Error(error);
        }
    },

    getUsers: (uids) => {
        let query;
        if (isArray(uids)) {
            query = { $in: uids };
        } else {
            query = { $in: [uids] };
        }
        console.log('query: ', query);
        return new Promise((resolve, reject) => {
            console.log('uids: ', uids);
            db.collection('users').find({ _id: query }).toArray(function (err, docs) {
                if (err) {
                    reject(err);
                } else {
                    resolve(docs);
                }

            });
        });
    },

    getAllUsersOfLeadRegion: (collection_name, id) => {
        const criteria = [
            { $match: { region: { $in: [objectid(id)] } } }
        ]
        return DataAccess.aggregate(collection_name, criteria)
    },
    getAllUsersFromQuery: (collection_name, query) => {
        const criteria = [
            { $match: query }
        ]
        return DataAccess.aggregate(collection_name, criteria)
    },

    getDocumentById: (collection_name, id) => {
        return new Promise((resolve, reject) => {
            if (!isEmpty(id)) {
                db.collection(collection_name).findOne({ _id: objectid(id) }, (err, docs) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(docs);
                    }
                });
            } else {
                resolve();
            }
        });
    },
    getAssociatedWith: (collection_name, id) => {
        let collectionName;
        if (collection_name == 'customer') {
            collectionName = 'customer';
        } else if (collection_name == 'contact') {
            collectionName = 'contacts';
        } else if (collection_name == 'custom') {
            collectionName = 'scheduler';
        } else if (collection_name == 'lead') {
            collectionName = 'lead';
        } else if (collection_name == 'dealer') {
            collectionName = 'scheduler';
        } else if (collection_name == 'meeting' || collection_name == 'Meeting') {
            collectionName = 'scheduler';
        } else {
            collectionName = 'scheduler';
        }
        console.log('collection: ', collectionName);

        if (!isEmpty(id)) {
            return new Promise((resolve, reject) => {
                db.collection(collectionName)
                    .findOne({ _id: objectid(id) }, (err, docs) => {
                        // console.log('LOG: ', docs);
                        if (err) {
                            reject(err);
                        } else {
                            resolve(docs);
                        }

                    });
            });
        } else {
            return new Promise((resolve, reject) => {
                resolve();
            });
        }
    },
    getTaggedUsers: (collection_name, id) => {
        if (!isEmpty(id)) {
            return new Promise((resolve, reject) => {
                db.collection(collection_name)
                    .aggregate([
                        { $match: { documentId: objectid(id) } },
                        { $lookup: { from: 'users', localField: 'notes.tagged_users', foreignField: '_id', as: 'notes_user_details' } },
                        {
                            $project: {
                                /* 'notes.tagged_users': 1, */
                                'notes_user_details.email': 1,
                                'notes_user_details._id': 1,
                                'notes_user_details.first_name': 1,
                                'notes_user_details.last_name': 1
                            }
                        }])
                    .toArray()
                    .then((data) => {
                        let taggedUsersArray = [];
                        if (!isEmpty(data)) {
                            data.forEach(element => {
                                if (!isEmpty(data)) {
                                    element.notes_user_details.forEach(t_user => {
                                        taggedUsersArray.push(t_user);
                                    });
                                }
                            });
                            resolve(taggedUsersArray);
                        }
                    })
                    .catch(e => e);
            });
        } else {
            return new Promise((resolve, reject) => {
                // console.log('444444: ', resolve());
                resolve();
                // return 'empty';
                // reject();
            });
        }
    },
    getTaskType: (id) => {
        return new Promise((resolve, reject) => {
            db.collection('task_types').findOne({ _id: id }, function (err, docs) {
                if (err) {
                    reject(err);
                } else {
                    resolve(docs);
                }

            });
        });
    },
    getUsersFCMToken: (users) => {
        let tokens = [];
        if (users) {
            users.forEach(user => {
                if (user.token) {
                    if (user.token.forEach) {
                        user.token.forEach(t => {
                            tokens.push(t);
                        });
                    } else {
                        tokens.push(user.token);
                    }
                }
            });
        }
        return tokens;

    }

};
module.exports = UserTypesService;