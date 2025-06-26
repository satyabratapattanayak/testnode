const { isEmpty } = require('lodash');
const ObjectId = require('mongodb').ObjectID;

const FormConfig = require('../formio/formio.model.js');
const FormResponse = require('../formio/formioresponse.model');

const listAll = async (req, res, next) => {
    try {
        const result = await FormConfig.all(req.query);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};


const Details = async (req, res, next) => {
    try {

        const result = await FormConfig.findOne(req.params.formioCode);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

const create = async (req, res, next) => {
    try {

        const result = await FormConfig.create(req.body);
        if (result == 0) {
            res.status(400).json({
                message: 'FormConfig already exist',
                status: 400,
            });
        } else {
            res.json({
                message: 'new formio created ',
                status: 200,
                data: result
            });
        }

    } catch (error) {
        next(error)
    }
};

const update = async (req, res, next) => {
    try {

        const result = await FormConfig.update(req.body.formioCode, req.body);
        if (result == 0) {
            res.status(400).json({
                message: 'FormConfig already exist',
                status: 400,
            });
        } else {
            res.json({
                message: 'FormConfig has been updated ',
                status: 200,
                data: result
            });
        }

    } catch (error) {
        next(error)
    }
};

const Delete = async (req, res, next) => {
    try {
        const result = await FormConfig.delete(req.params.formioCode);
        res.json({
            message: 'FormConfig has been deleted ',
            status: 200,
            data: result
        });
    } catch (error) {
        next(error)
    }
};
const listResponses = async (req, res, next) => {
    try {
        const result = await FormResponse.all(req.body);
        if (isEmpty(result)) {

            res.json([], 200, next);
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};
const deleteResponse = async (req, res, next) => {
    try {
        const result = await FormResponse.delete(req.params.id);
        res.json({
            message: 'Form Response has been deleted ',
            status: 200,
            data: result
        });
    } catch (error) {
        next(error)
    }
};

const saveResponse = async (req, res, next) => {
    try {
        if (req.body._id) {

            const result = await FormResponse.update(req.body._id, req.body);
            if (result == 0) {
                res.status(400).json({
                    message: 'Form Response already exist',
                    status: 400,
                });
            } else {
                res.json({
                    message: 'Form Response has been updated ',
                    status: 200,
                    data: result
                });
            }
            return;
        }
        const result = await FormResponse.create(req.body);
        if (result == 0) {
            res.status(400).json({
                message: 'Form Response already exist',
                status: 400,
            });
        } else {
            res.json({
                message: 'new Form Response created ',
                status: 200,
                data: result
            });
        }

    } catch (error) {
        next(error)
    }
};
const responseDetail = async (req, res, next) => {
    try {
        const result = await FormResponse.findOne(req.params.id);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};
module.exports = { listAll, Details, create, update, Delete, saveResponse, deleteResponse, listResponses, responseDetail };

