const ObjectId = require("mongodb").ObjectID;
const { isEmpty, sortBy } = require("lodash");
const Moment = require("moment");

const DataAccess = require("../../helpers/DataAccess");
const { auditActions, Modules, formatDate } = require("../shared/shared.model");
const {
  getTodayStartTime,
  getTodayEndTime,
  getMonthFirstDay,
  getMonthLastDay,
  getPrevDate
} = require("../../config/dateutil");

const collection_name = Modules().audit;
let mydb;
const database = require("../../service/database");
database.getDb().then(res => {
  mydb = res;
});



const model = {
  list: (params) => {
    console.log('params: ', params);

    let query = { action: { $in: ["login", "logout"] } };

    if (params && !isEmpty(params)) {
      if (params && params.user && params.user.length > 0) {
        query["userId"] = { $in: params.user };
      }

      if (params && params.date && !isEmpty(params.date)) {
        query["$and"] = [
          { date: { $gte: getTodayStartTime(params.date) } },
          { date: { $lte: getTodayEndTime(params.date) } }
        ];
      } else {
        query["$and"] = [
          { date: { $gte: getPrevDate(null, 30, 'd') } },
          // { date: { $lte: new Date(now) } }
        ];
      }
    } else {

    }


    console.log('login Audit query: ', JSON.stringify(query));



    let crieteria = [
      {
        $facet: {
          data: [
            {
              $addFields: {
                userId: {
                  $convert: {
                    input: '$userId',
                    to: 'string',
                    onError: 0
                  }
                },
              }
            },
            { $match: query },
            ...common_queries.list
          ],
          totalCount: [
            {
              $addFields: {
                userId: {
                  $convert: {
                    input: '$userId',
                    to: 'string',
                    onError: 0
                  }
                },
              }
            },
            { $match: query },
            ...common_queries.list
          ]
        }
      }
    ];


    if (params && !isEmpty(params) && params.options && !isEmpty(params.options)) {
      let options = params.options;
      if (options.filters && Object.keys(options.filters).length > 0) {
        let filterKeys = Object.keys(options.filters);
        let filter = {};
        let totalMatch = crieteria[0]["$facet"]["totalCount"][0]["$match"];
        for (let i = 0; i < filterKeys.length; i++) {
          filter[filterKeys[i]] = {
            $regex: options.filters[filterKeys[i]].value, $options: "i"
          };
        }
        crieteria[0]["$facet"]["data"].push({ $match: filter });
        crieteria[0]["$facet"]["totalCount"].push({ $match: filter });
      }

      if (options.sortField) {
        let sort = {};
        sort[options.sortField] = options.sortOrder;
        crieteria[0]["$facet"]["data"].push({ $sort: sort });
      }

      if (options && options.first >= 0) {
        crieteria[0]["$facet"]["data"].push({ $limit: options.first + options.rows });
        crieteria[0]["$facet"]["data"].push({ $skip: options.first });
      }
    }
    crieteria[0]["$facet"]["totalCount"].push({ $count: 'count' });

    return DataAccess.aggregate(collection_name, crieteria);
  }
};

module.exports = model;

const common_queries = {
  list: [
    {
      $addFields: {
        userId: {
          $convert: {
            input: '$userId',
            to: 'objectId',
            onError: 0
          }
        },
      }
    },
    { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user_details" } },
    {
      $addFields: {
        userObject: { $arrayElemAt: ["$user_details", 0] },
      }
    },
    { $sort: { date: -1 } },
    {
      $project: {
        module: {
          $switch: {
            branches: [
              { case: { $eq: ['$module', 'web_app'] }, then: 'Web App' },
              { case: { $eq: ['$module', 'mobile_app'] }, then: 'Mobile App' }
            ],
            default: "App"
          }
        },
        app_version: {
          $cond: {
            if: {
              $and: [
                { $eq: ['$module', 'mobile_app'] },
                { $gte: ["$date", new Date("2024-09-11T00:00:00Z")] }
              ]
            },
            then: '2.0.2',
            else: {
              $cond: {
                if: { $eq: ['$module', 'mobile_app'] },
                then: '2.0.1',
                else: 'NA'
              }
            }
          }
        },
        action: 1,
        userName: { $concat: ["$userObject.first_name", " ", "$userObject.last_name"] },
        message: 1,
        date: formatDate('$date'),
        ipAdds: "$data.ipAdds",
        browser: "$data.browser"
      }
    }
  ]
}