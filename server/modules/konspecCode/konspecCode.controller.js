const { isEmpty, } = require('lodash');

const Model = require('./konspecCode.model');
const { getCurrentUserInfo } = require('../shared/shared.controller');

const listAll = async (req, res, next) => {
    await Model.listAll()
        .then((result) => {
            if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else {
                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};

const Details = async (req, res, next) => {
    const id = req.params.id;
    await Model.details(id)
        .then((result) => {
            if (isEmpty(result)) {
                res.status(404).json({ message: 'No data found', status: 404 });
            } else {
                res.json(result[0], 200, next);
            }
        })
        .catch((e) => next(e));
};



const create = async (req, res, next) => {
    await getCurrentUserInfo(req.headers.authorization)
        .then((getCurrentUserInfo) => {
            return Model.create(req.body, getCurrentUserInfo);
        })
        .then((result) => {
            res.json({ message: 'successfully created!', status: 200, data: result });
        })
        .catch((e) => next(e));
};



const update = async (req, res, next) => {
    await getCurrentUserInfo(req.headers.authorization)
        .then((getCurrentUserInfo) => {
            return Model.update(req.params.id, req.body, getCurrentUserInfo);
        })
        .then((result) => {
            if (result === 0) {
                res.status(409).json({ message: 'update failed', status: 409 });
            } else {
                res.json({ message: 'update successful', status: 200, data: result });
            }
        })
        .catch((e) => next(e));
};

const Delete = async (req, res, next) => {
    await getCurrentUserInfo(req.headers.authorization)
        .then((getCurrentUserInfo) => {
            return Model.delete(req.params.id, getCurrentUserInfo);
        })
        .then((result) => {
            if (result === 0) {
                res.status(409).json({ message: 'update failed', status: 409 });
            } else {
                res.json({ message: 'delete successfull', status: 200, data: result });
            }
        })
        .catch((e) => next(e));
};

module.exports = {
    listAll,
    Details,
    create,
    update,
    Delete
};