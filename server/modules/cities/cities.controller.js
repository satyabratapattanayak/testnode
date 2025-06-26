const { isEmpty, head } = require('lodash');
const ObjectId = require('mongodb').ObjectID;
const jwt = require('jsonwebtoken');

const City = require('../cities/cities.model.js');
const State = require('../state/state.model');

const linkCityToState = (doc) => {
    State.updateOne('state', { stateCode: doc.state }, { $push: { city: doc.city } })
};

const linkPostCodeToCity = (data, city) => {
    City.updateMany('city', { city: { $in: city } }, { $addToSet: { postCode: data.postCode } })
};

const listAll = (req, res, next) => {
    City.all(req.query)
        .then((result) => {
            if (isEmpty(result)) {
                res.status(404).json({ message: 'No data found', status: 404 });
            } else {
                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};

const Details = async (req, res, next) => {
    try {
        const result = await City.findOne(req.params.cityname);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error);
    }
};

const postCodeDetails = async (req, res, next) => {
    try {
        const result = await City.findOnePostCode(req.params.postCode);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

const listPostCode = async (req, res, next) => {
    try {
        const result = await City.listPostCode(req.query)
        res.json(result)
    } catch (error) {
        next(error)
    }
};

const create = async (req, res, next) => {
    try {
        const result = await City.create(req.body);
        if (result == 0) {
            res.status(400).json({
                message: 'City already exist',
                status: 400,
            });
        } else {
            res.json({
                message: 'City State created ',
                status: 200,
                data: result
            });

            // linkCityToPostCode(result[0])

        }
    } catch (error) {
        next(error)
    }
};

const createPostCode = async (req, res, next) => {
    try {
        console.log('req: ', req.body);

        const result = await City.createPostCode(req.body);
        console.log('result: ', result);

        if (result == 0) {
            res.status(400).json({
                message: 'PostCode already exist',
                status: 400,
            });
        } else {
            res.json({
                message: 'PostCode created ',
                status: 200,
                data: result
            });

            if (result[0].city && result[0].city.length > 0) {
                linkPostCodeToCity(result[0], result[0].city)
            }

        }
    } catch (error) {
        next(error)
    }
};

const update = async (req, res, next) => {
    try {
        const result = await City.update(req.params.id, req.body);
        if (result == 0) {
            res.status(400).json({
                message: 'City already exist',
                status: 400,
            });
        } else {
            res.json({
                message: 'City has been updated ',
                status: 200,
                data: result
            });
            linkCityToState(req.body);
        }
    } catch (error) {
        next(error)
    }
};

const updatePostCode = async (req, res, next) => {
    try {
        const result = await City.updatePostCode(req.params.postcode, req.body);
        if (result == 0) {
            res.status(400).json({
                message: 'Postcode already exist',
                status: 400,
            });
        } else {
            res.json({
                message: 'Postcode has been updated ',
                status: 200,
                data: result
            });

            if (req.body.city && req.body.city.length > 0) {
                linkPostCodeToCity(req.body, req.body.city)
            }
        }
    } catch (error) {
        next(error)
    }
};


const Delete = async (req, res, next) => {
    try {
        const result = await City.delete(req.params.name);
        res.json({
            message: 'City has been deleted ',
            status: 200,
            data: result
        });
    } catch (error) {
        next(error)
    }
};

const DeletePostCode = async (req, res, next) => {
    try {
        const result = await City.deletePostCode(req.params.postCode);
        res.json({
            message: 'postcode has been deleted ',
            status: 200,
            data: result
        });
    } catch (error) {
        next(error)
    }
};

module.exports = { listAll, Details, listPostCode, postCodeDetails, create, update, Delete, createPostCode, updatePostCode, DeletePostCode };

