const { isEmpty } = require('lodash');
const ObjectId = require('mongodb').ObjectID;

const Countries = require('../countries/countries.model.js');


const listAll = async (req, res, next) => {
    try {
        const result = await Countries.all(req.query);
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
        const result = await Countries.findOne(req.params.countryCode);
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

        let international = 'international';
        let IN = 'national';
        if (
            (JSON.stringify(req.body.type) !== JSON.stringify(IN)) &&
            (JSON.stringify(req.body.type) !== JSON.stringify(international))
        ) {
            res.status(400).json({
                message: 'Invalid "type". Please enter "IN" or "international"',
                status: 400,
            });
        } else {
            const result = await Countries.create(req.body);
            if (result == 0) {
                res.status(400).json({
                    message: 'Country already exist',
                    status: 400,
                });
            } else {
                res.json({
                    message: 'new country created ',
                    status: 200,
                    data: result
                });
            }
        }

    } catch (error) {
        next(error)
    }
};

const update = async (req, res, next) => {
    try {
        let international = 'international';
        let IN = 'national';
        if (
            (JSON.stringify(req.body.type) !== JSON.stringify(IN)) &&
            (JSON.stringify(req.body.type) !== JSON.stringify(international))
        ) {
            res.status(400).json({
                message: 'Invalid "type". Please enter "IN" or "international"',
                status: 400,
            });
        } else {
            const result = await Countries.update(req.params.countryCode, req.body);
            if (result == 0) {
                res.status(400).json({
                    message: 'Country already exist',
                    status: 400,
                });
            } else {
                res.json({
                    message: 'Country has been updated ',
                    status: 200,
                    data: result
                });
            }
        }
    } catch (error) {
        next(error)
    }
};

const Delete = async (req, res, next) => {
    try {
        const result = await Countries.delete(req.params.countryCode);
        res.json({
            message: 'Country has been deleted ',
            status: 200,
            data: result
        });
    } catch (error) {
        next(error)
    }
};

module.exports = { listAll, Details, create, update, Delete };

function checkCountryType(req, res) {
    console.log('type: ', req.body.type);
    if ((JSON.stringify(req.body.type) !== 'IN' || JSON.stringify(req.body.type) !== 'international')) {
        res.status(400).json({
            message: 'Invalid "type". Please enter "IN" or "international"',
            status: 400,
        });
    }
}
