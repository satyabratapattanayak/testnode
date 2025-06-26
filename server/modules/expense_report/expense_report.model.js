const { isEmpty } = require('lodash');
const ObjectId = require('mongodb').ObjectID;

const DataAccess = require('../../helpers/DataAccess');

let mydb;
const database = require('../../service/database');
database.getDb().then(res => { mydb = res; });
const collection_name = 'expense_report';


const model = {
    all: (body) => {
        let query;
        if (!body || isEmpty(body)) {
            query = {};
        } else if (body.awaiting_approval == 1 || body.awaiting_approval == '1') {
            query = { status: { $ne: '' } };
        } else if (body.awaiting_payment == 1 || body.awaiting_payment == '1') {
            query = { status: { $ne: 'id' } };
        }

        const crieteria = [
            { $match: query },
            { $lookup: { from: 'customer', localField: 'customer', foreignField: '_id', as: 'customer_details' } },
            { $lookup: { from: 'users', localField: 'uploaded_by', foreignField: '_id', as: 'uploadedBy_details' } },
            { $addFields: { customer_name: '$customer_details.customer_name', uploaded_by: '$uploadedBy_details.first_name' } },
            // {$project:{staff_name:1,"expense_report_ref_no":1,"Date_of_submission":1"total_amount":1}}
        ];
        return DataAccess.aggregate(collection_name, crieteria);
    },

    findById: (id) => {
        const crieteria = [
            { $match: { _id: ObjectId(id) } },
            { $lookup: { from: 'customer', localField: 'customer', foreignField: '_id', as: 'customer_details' } },
            { $lookup: { from: 'users', localField: 'uploaded_by', foreignField: '_id', as: 'uploadedBy_details' } },
            { $addFields: { customer_name: '$customer_details.customer_name', uploaded_by: '$uploadedBy_details.first_name' } },
        ];
        return DataAccess.aggregate(collection_name, crieteria);
    },

    create: (body, currentLoggedUser) => {
        body.expense_report_ref_no = Math.floor(1000 + Math.random() * 9000);
        body.customer = ObjectId(body.customer);
        body.date_from = new Date(body.date_from);
        body.date_to = new Date(body.date_to);
        body.uploaded_by = ObjectId(currentLoggedUser._id);
        body.Date_of_submission = new Date();

        return DataAccess.InsertOne(collection_name, body);
    },

    update: (id, body) => {
        if (body.customer) { body.customer = ObjectId(body.customer); }
        body.date_from = new Date(body.date_from);
        body.date_to = new Date(body.date_to);
        console.log('EXPENSE REPORT UPDATE :: MODEL: ', body);

        return DataAccess.UpdateOne(collection_name, { _id: ObjectId(id) }, { $set: body })
            .then((resp) => {
                return resp.modifiedCount > 0 ? 1 : 0;
            });
    }
};

module.exports = model;