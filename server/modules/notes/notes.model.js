const ObjectId = require('mongodb').ObjectID;
const { isEmpty, sortBy, isUndefined } = require('lodash');
const PubSub = require('pubsub-js');

const { getDateFormat } = require('../../config/dateutil');
const DataAccess = require('../../helpers/DataAccess');
const Audit = require('../audit/audit.model.js');
const { auditActions, Modules, formatDate } = require('../shared/shared.model');

const collection_name = 'notes';
let mydb;
const database = require('../../service/database');
database.getDb().then(res => { mydb = res; });

const collection = (collectionName) => { return mydb.collection(collectionName); };

const audit = (body) => { Audit.addLog(body); };

const addLog = (module, id, loggedUser, body, msg) => {
    audit({
        module: module,
        action: auditActions().AddNotes,
        documentId: ObjectId(id),
        userId: ObjectId(loggedUser._id),
        data: body,
        message: msg,
        date: new Date()
    });
};

const replicateCMRnotesToCustomer = (id, body, loggedUser, module) => {

    console.log('CMR notes added');
    try {
        let query = ([
            { $match: { _id: ObjectId(id) } },
            { $project: { customer_id: 1 } }
        ]);
        DataAccess.aggregate('customer_cmr_details', query).then((data) => {
            if (data && data[0] && !isUndefined(data[0].customer_id)) {
                addLog(module, data[0].customer_id, loggedUser, body, 'added a note on CMR');
                // DataAccess.UpdateOne(collection_name, { documentId: ObjectId(data[0].customer_id) }, { $push: { notes: body } });
            }
        });
    } catch (error) {
        console.log('catch : ', error);

    }
};

const model = {

    /* findById: async (id, params) => {
        try {
            let query = { documentId: ObjectId(id) }
            let notesFilterQuery = {};
            if (params && !isEmpty(params)) {
                if (params.type && params.type.length > 0) {
                    notesFilterQuery['notes.type'] = { $in: params.type }
                }
            }
            let crieteria = [
                { $match: query },
                { $lookup: { from: 'files_storage', localField: 'notes.files', foreignField: '_id', as: 'file_details' } },
                { $lookup: { from: 'users', localField: 'notes.userId', foreignField: '_id', as: 'notes_user_details' } },
                { $unwind: { path: "$notes", preserveNullAndEmptyArrays: true } },
                { $match: notesFilterQuery },
                {
                    $group: {
                        _id: {
                            _id: "$_id",
                            module: '$module',
                            documentId: '$documentId',
                            date: '$date',
                            file_details: '$file_details',
                            notes_user_details: '$notes_user_details',
                        },
                        notes: { $push: '$notes' },
                    }
                },
                {
                    $project: {
                        _id: '$_id._id',
                        module: '$_id.module',
                        documentId: '$_id.documentId',
                        date: '$_id.date',
                        file_details: '$_id.file_details',
                        notes_user_details: '$_id.notes_user_details',
                        notes: 1,
                    }
                }
            ]
            const resp = await DataAccess.aggregate(collection_name, crieteria)
            return resp

        } catch (error) {
            throw new Error(error)
        }
    }, */



    findById: async (id, params) => {
        try {
            let query = { documentId: ObjectId(id) }
            let notesFilterQuery = {};

            let crieteria = [
                { $match: query },
                { $lookup: { from: 'files_storage', localField: 'notes.files', foreignField: '_id', as: 'file_details' } },
                { $lookup: { from: 'users', localField: 'notes.userId', foreignField: '_id', as: 'notes_user_details' } },

                // {
                //     $project: {
                //         _id: '$_id._id',
                //         module: '$_id.module',
                //         documentId: '$_id.documentId',
                //         date: formatDate('$_id.date'),
                //         file_details: '$_id.file_details',
                //         notes_user_details: '$_id.notes_user_details',
                //         notes: 1,
                //     }
                // },
            ]

            if (params && !isEmpty(params) && params.type && params.type.length > 0) {

                const scheduler = await DataAccess.findAll('scheduler', { associated_with: ObjectId(id) })

                const allSchedulerId = scheduler.map(i => i._id)
                allSchedulerId.push(ObjectId(id));
                if (params.type && params.type.length > 0) {
                    notesFilterQuery['notes.type'] = { $in: params.type }
                } else {
                    // Not sending the visit reports untill requested. 
                    notesFilterQuery['notes.type'] = { $nin: [11] }
                }

                crieteria = [
                    { $match: { documentId: { $in: allSchedulerId } } },
                    { $lookup: { from: 'files_storage', localField: 'notes.files', foreignField: '_id', as: 'file_details' } },
                    { $lookup: { from: 'users', localField: 'notes.userId', foreignField: '_id', as: 'notes_user_details' } },
                    { $unwind: { path: "$notes", preserveNullAndEmptyArrays: true } },
                    { $match: notesFilterQuery },
                    {
                        $group: {
                            _id: {
                                _id: "$_id",
                                module: '$module',
                                documentId: '$documentId',
                                date: '$date',
                                file_details: '$file_details',
                                notes_user_details: '$notes_user_details',
                            },
                            notes: { $push: '$notes' },
                        }
                    },
                    {
                        $project: {
                            _id: '$_id._id',
                            module: '$_id.module',
                            documentId: '$_id.documentId',
                            date: '$_id.date',
                            file_details: '$_id.file_details',
                            notes_user_details: '$_id.notes_user_details',
                            notes: 1,
                        }
                    },
                ]

            }

            const resp = await DataAccess.aggregate(collection_name, crieteria)
            for (const iterator of resp) {
                for (const i of iterator.notes) {
                    i.date = getDateFormat(i.date)
                }
            }
            return resp
        } catch (error) {
            throw new Error(error)
        }
    },
    // Note details by note id
    noteById: async (id, params) => {
        try {
            console.log("query: ", { _id: id });
            return DataAccess.findOne(collection_name, { _id: ObjectId(id) });
        } catch (error) {
            throw new Error(error);
        }
    },
    all: async (loggedUser, filter) => {
        try {
            let query = { deleted: { $ne: 1 }, module: "notes", created_by: ObjectId(loggedUser._id) }
            let crieteria = [
                { $match: query },
                { $sort: { created_at: -1 } },
                { $project: { _id: 1, note: 1, created_at: { $arrayElemAt: [formatDate('$created_at'), 0] }, deleted: 1 } }
            ]
            const resp = await DataAccess.aggregate(collection_name, crieteria)
            return resp
        } catch (error) {
            throw new Error(error)
        }
    },
    create: async (doc, loggedUser) => {
        try {
            console.log('notes create req: ', doc);
            if (doc._id) {
                doc.offlineSyncId = doc._id;
                delete doc._id;
            }
            doc.created_at = new Date();
            doc.modified_At = new Date();
            doc.created_by = loggedUser ? ObjectId(loggedUser._id) : null

            if (!doc.module) doc.module = 'notes'
            const newData = await DataAccess.InsertOne(collection_name, doc);
            if (doc.module === 'notes') {
                PubSub.publishSync('DBUpdates', { change: 'notes', data: newData[0] });
            }
            if (doc.offlineSyncId) {
                const deleteDupData = {
                    delete: true,
                    deleted: 1,
                    _id: doc.offlineSyncId
                };
                PubSub.publishSync('DBDelete', { change: 'notes', data: deleteDupData });
            }
            return newData;
        } catch (error) {
            throw new Error(error)
        }
    },

    update: async (id, reqBody, isMobileRequest, loggedUser) => {
        try {
            reqBody.modified_At = new Date();
            let crieteria;
            if (isMobileRequest && !ObjectId.isValid(id)) {
                crieteria = { offlineSyncId: id };
            } else {
                crieteria = { _id: ObjectId(id) };
            }
            const doc = { $set: reqBody };
            const result = await DataAccess.UpdateOne(collection_name, crieteria, doc);

            DataAccess.findOne(collection_name, crieteria).then((data) => {
                PubSub.publishSync('DBUpdates', { change: 'notes', data: data });
            })

            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error)
        }
    },

    delete: async (id, isMobileRequest, loggedUser) => {
        try {
            let crieteria;    
            if (isMobileRequest && !ObjectId.isValid(id)) {
                crieteria = { offlineSyncId: id };
            } else {
                crieteria = { _id: ObjectId(id) };
            }
            const result = await DataAccess.DeleteOne(collection_name, crieteria);
            return result.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error);
        }
    },

    addNotes: async (id, body, loggedUser, module) => {
        try {
            console.log('notes model: ', id, ' :: ', body, ' :: ', module);
            if (body.convertNotes) {
                let oid = []
                for (let iterator of body.convertTo) {
                    oid.push(ObjectId(iterator))
                }
                delete body.convertNotes; delete body.convertTo;
                const notesData = await DataAccess.findAll(collection_name, { documentId: { $in: oid } }, { documentId: 1 });

                let newNotesData
                if (notesData && notesData.length > 0) {
                    newNotesData = oid.filter(i => JSON.stringify(i) !== JSON.stringify(notesData[0].documentId))
                }

                if (newNotesData && newNotesData.length > 0) {
                    await createNewNote(module, id, body, loggedUser);
                } else if (isUndefined(newNotesData)) {
                    for (const i of oid) {
                        await createNewNote(module, i, body, loggedUser);
                    }
                } else {
                    await DataAccess.UpdateMany(collection_name, { documentId: { $in: oid } }, { $push: { notes: body } });
                }

                for (const iterator of oid) {
                    addLog(module, iterator, loggedUser, body, 'added a note');
                }

                if (module == 'customer') {
                    replicateCMRnotesToCustomer(id, body, loggedUser, module);
                }
                const result = await model.findById(id, {});
                return result;
            } else {
                const found = await DataAccess.findOne(collection_name, { documentId: ObjectId(id) });
                if (found) {
                    await DataAccess.UpdateOne(collection_name, { documentId: ObjectId(id) }, { $push: { notes: body } });
                    addLog(module, id, loggedUser, body, 'added a note');
                    if (module == 'customer') {
                        replicateCMRnotesToCustomer(id, body, loggedUser, module);
                    }
                    if (module == 'scheduler') {
                        await DataAccess.UpdateOne('scheduler', {_id: ObjectId(id)}, {$set:{ status: ObjectId(body.status)}});
                    }
                    const result = await model.findById(id, {});
                    return result;
                } else {
                    await createNewNote(module, id, body, loggedUser);
                    return model.findById(id, {});
                }
            }
        } catch (error) {
            throw new Error(error);
        }
    },

    updateMany: (crieteria, doc) => {
        return DataAccess.UpdateMany(collection_name, crieteria, doc);
    },

    deleteNotes: (crieteria, doc) => DataAccess.UpdateOne(collection_name, crieteria, doc),

    NotesTypes: async (loggedUser, filter) => {
        try {
            let query = { deleted: { $ne: 1 }, }
            let crieteria = [
                { $match: query },
                { $sort: { name: 1 } },
                { $project: { _id: 0, id: 1, name: 1 } }
            ]
            const resp = await DataAccess.aggregate('notes_types', crieteria)
            return resp
        } catch (error) {
            throw new Error(error)
        }
    },
};




module.exports = model;

async function createNewNote(module, id, body, loggedUser) {
    const dataToCreate = {
        module: module,
        documentId: ObjectId(id),
        notes: [body]
    };
    await DataAccess.InsertOne(collection_name, dataToCreate);
    addLog(module, id, loggedUser, body, 'added a note');
}
