const { isEmpty } = require('lodash');
const Model = require('./product.model');

const listAll = async (req, res, next) => {
    try {
        let itemNo = "";
        let filterDetails = [];
        if(req.query.item_no) {
            itemNo = req.query.item_no;
        }
        if(req.body) {
            filterDetails = req.body;
        }

        const result = await Model.listAll(itemNo, filterDetails)
        if (isEmpty(result)) {
            res.json([], 200, next);
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

module.exports = {
    listAll
};