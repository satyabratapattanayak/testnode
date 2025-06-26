const DataAccess = require('../../helpers/DataAccess');
const database = require('../../service/database');
const collection_name = 'products';
let mydb;
database.getDb().then(res => { mydb = res; });

const productKeyMapper = {
    "product_industry": "PRODUCT INDUSTRY",
    "end_product": "END PRODUCT",
    "product_application": "PRODUCT APPLICATION",
    "product_segment": "PRODUCT SEGMENT",
    "branded_product": "BRANDED PRODUCT"
};

const model = {
    listAll: (searchTerm, filterDetails) => {
        try {
            let matchCriteria = {};
            /*if (itemNo) {
                const itemNumberPattern = new RegExp(itemNo.toString(), 'i');
                matchCriteria.item_no = { $regex: itemNumberPattern.source };
            }*/

            // Match criteria for item number, category code, and description
            if (searchTerm) {
                const searchTermPattern = new RegExp(searchTerm.toString(), 'i');
                matchCriteria.$or = [
                    { 'item_no': { $regex: searchTermPattern, $options: 'i' } }, // Case-insensitive search
                    { 'itemcategorycode': { $regex: searchTermPattern, $options: 'i' } },
                    { 'description': { $regex: searchTermPattern, $options: 'i' } },
                    { 'productdimensions.dimensionvaluecode': { $regex: searchTermPattern, $options: 'i' } }
                  ];
            }

            /*if (filterDetails && filterDetails.itemcategorycode && Array.isArray(filterDetails.itemcategorycode)) {
                matchCriteria.itemcategorycode = { $in: filterDetails.itemcategorycode };
                delete filterDetails.itemcategorycode;
            }

            if (filterDetails) {
                let filterConditions = [];
                for (const dimension in filterDetails) {
                    if (Array.isArray(filterDetails[dimension])) {
                        filterConditions.push({
                            'productdimensions': {
                                $elemMatch: {
                                    'dimensioncode': productKeyMapper[dimension],
                                    'dimensionvaluecode': { $in: filterDetails[dimension] }
                                }
                            }
                        });
                    }
                }
                if (filterConditions.length > 0) {
                    matchCriteria.$and = filterConditions;
                }
            }*/

            const criteria = [
                { $match: matchCriteria },
                { $limit: 100 }
            ];

            return DataAccess.aggregate(collection_name, criteria);
        } catch (error) {
            throw new Error(error);
        }
    }
};

module.exports = model;
