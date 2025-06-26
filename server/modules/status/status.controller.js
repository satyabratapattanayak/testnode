const { isEmpty } = require('lodash');

const Status = require('../status/status.model.js');
const { getCurrentUserInfo } = require('../shared/shared.controller');


const listAll = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization);
        const result = await Status.all(loggedUser, req.query)
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error);
    }
};

// Lead details
const details = (req, res, next) => {
    Status.findById(req.params.id)
        .then((result) => {
            if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else {
                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};



module.exports = { listAll, details, };