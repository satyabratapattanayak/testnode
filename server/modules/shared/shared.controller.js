const jwt = require("jsonwebtoken");
const fs = require("fs");
const ObjectId = require("mongodb").ObjectID;
const { isEmpty } = require("lodash");
const Model = require("../shared/shared.model");
const Config = require("../../config/config");
const Notes = require("../notes/notes.model");
const DataAccess = require("../../helpers/DataAccess");
const acl = require("../../service/acl");
const { Parser } = require('json2csv');

const getRandomNum = () => {
  return Math.floor(1000 + Math.random() * 9000);
};

const getCurrentUserInfo = async token => {
  return new Promise((resolve, reject) => {
    if (token) {
      jwt.verify(token, Config.jwtSecretKey, async (err, decoded) => {
        if (err) {
          reject({
            message: "UnAuthorized/Failed to authenticate token.",
            status: 498
          });
        } else {
          try {
            let query = { _id: ObjectId(decoded._id) };
            const userDetails = await Model.findByQuery("users", query);
            if (!userDetails.isActive) {
              reject({
                status: 498,
                message: 'You have been DeActivated. Please contact admin.',
              });
            } else {
              resolve(userDetails);
            }
          } catch (e) {
            reject(e);
          }
        }
      });
    } else {
      reject({ status: 499, message: "token not provided" });
    }
  });
};

const deleteNotes = id => {
  Notes.deleteNotes(
    { documentId: ObjectId(id) },
    { $set: { deleted: 1, modified_At: new Date() } }
  );
};

const getUniqueNo = async (req, res, next) => {
  try {
    let docId;
    if (req.body.type == "cmr") {
      docId = "CMR-" + getRandomNum();
      // let nextSeqNo = await getNextSequenceNumber('cmr')
      // let ActualCRMNo = String(nextSeqNo).padStart(4, '0')
      // docId = `CMR-${ActualCRMNo}`
    }
    res.json({ uniqueNo: docId });
  } catch (error) {
    next(error)
  }
};

const getDefaultValue = (req, res, next) => {
  res.status(299).json("deprecated");
};

const businessUnit = (req, res, next) => {
  Model.listBD()
    .then(result => {
      if (isEmpty(result)) {
        res.status(404).json({ message: "No data found", status: 404 });
      } else {
        res.json(result, 200, next);
      }
    })
    .catch(e => next(e));
};

const businessCode = (req, res, next) => {
  Model.listBD()
    .then(result => {
      if (isEmpty(result)) {
        res.status(404).json({ message: "No data found", status: 404 });
      } else {
        res.json(result, 200, next);
      }
    })
    .catch(e => next(e));
};

const listCustomerCategory = (req, res, next) => {
  Model.listCustomerCategory()
    .then(result => {
      if (isEmpty(result)) {
        res.status(404).json({ message: "No data found", status: 404 });
      } else {
        res.json(result, 200, next);
      }
    })
    .catch(e => next(e));
};

const moveToPos = function (array, from, to) {
  array.splice(to, 0, array.splice(from, 1)[0]);
  return array;
};

const universalSearch = async (req, res, next) => {
  try {
    let searchKey = req.query.key;
    const loggedUser = await getCurrentUserInfo(req.headers.authorization);
    const result = await Model.universalSearch(searchKey, loggedUser,req.body);
    if (
      isEmpty(result.customer) &&
      isEmpty(result.lead) &&
      isEmpty(result.users) &&
      isEmpty(result.contact) &&
      isEmpty(result.scheduler) &&
      isEmpty(result.routePlan) &&
      isEmpty(result.notes)
    ) {
      res.status(404).json({ message: "No data found", status: 404 });
    } else {
      res.json(result, 200, next);
    }
  } catch (error) {
    next(error);
  }
};

const termsOfUse = async (req, res, next) => {
  try {
    const result = await Model.termsOfUse();
    res.json(result, 200, next);
  } catch (error) {
    next(error);
  }
};

const PrivacyPolicy = async (req, res, next) => {
  try {
    const result = await Model.PrivacyPolicy();
    res.json(result, 200, next);
  } catch (error) {
    next(error);
  }
};

const brandNames = async (req, res, next) => {
  try {
    const result = await Model.brands();
    res.json(result, 200, next);
  } catch (error) {
    next(error);
  }
};

const segment = async (req, res, next) => {
  try {
    const result = await Model.segment();
    res.json(result, 200, next);
  } catch (error) {
    next(error);
  }
};
const ReminderFrequency = async (req, res, next) => {
  try {
    const result = await Model.ReminderFrequency();
    res.json(result, 200, next);
  } catch (error) {
    next(error);
  }
};

const getCustomerIdsToListCMR = async (loggedUser, query = { deleted: { $ne: 1 } }) => {
  let custCrieteria = [
    {
      $match: {
        deleted: { $ne: 1 },
        $or: [
          {
            "linked_staff.staffId": ObjectId(loggedUser._id)
          },
          {
            'area_manager': loggedUser.emp_code
          },
          {
            'sales_executive': loggedUser.emp_code
          },
          {
            'rbm': loggedUser.emp_code
          },
          {
            "responsibility_matrix.primary_account_manager": loggedUser.emp_code
          },
          {
            "responsibility_matrix.primary_field_coordinator": loggedUser.emp_code
          },
          {
            "responsibility_matrix.primary_biss_development": loggedUser.emp_code
          },
          {
            "responsibility_matrix.primary_technical_services": loggedUser.emp_code
          },
          {
            "responsibility_matrix.primary_product_development": loggedUser.emp_code
          },
          {
            "responsibility_matrix.primary_door_opener": loggedUser.emp_code
          },
          {
            "responsibility_matrix.primary_salesOps": loggedUser.emp_code
          },
          {
            "responsibility_matrix.secondary_account_manager": loggedUser.emp_code
          },
          {
            "responsibility_matrix.secondary_field_coordinator": loggedUser.emp_code
          },
          {
            "responsibility_matrix.secondary_biss_development": loggedUser.emp_code
          },
          {
            "responsibility_matrix.secondary_technical_services": loggedUser.emp_code
          },
          {
            "responsibility_matrix.secondary_product_development": loggedUser.emp_code
          },
          {
            "responsibility_matrix.secondary_door_opener": loggedUser.emp_code
          },
          {
            "responsibility_matrix.secondary_salesOps": loggedUser.emp_code
          },
          {
            "responsibility_matrix.tertiary_account_manager": loggedUser.emp_code
          },
          {
            "responsibility_matrix.tertiary_field_coordinator": loggedUser.emp_code
          },
          {
            "responsibility_matrix.tertiary_biss_development": loggedUser.emp_code
          },
          {
            "responsibility_matrix.tertiary_technical_services": loggedUser.emp_code
          },
          {
            "responsibility_matrix.tertiary_product_development": loggedUser.emp_code
          },
          {
            "responsibility_matrix.tertiary_door_opener": loggedUser.emp_code
          },
          {
            "responsibility_matrix.tertiary_salesOps": loggedUser.emp_code
          }
        ]
      }
    },
    {
      $group: {
        _id: null,
        id: { $push: "$_id" }
      }
    },
    { $project: { _id: 0, id: 1 } }
  ];

  const customerId = await DataAccess.aggregate("customer", custCrieteria);
  if (customerId.length > 0) {
    query["customer_id"] = { $in: customerId[0].id };
    return customerId[0].id;
  } else {
    return [];
  }
};


const PunchIn = async (req, res, next) => {
  try {
    console.log('punch in: ', req.headers.authorization);
    const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
    const resp = await Model.punchIn(currentLoggedUser, req.body)
    res.json({ status: 200, message: 'PunchIn success', id: resp._id })
  } catch (error) {
    next(error)
  }
}

const PunchOut = async (req, res, next) => {
  try {
    const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
    const resp = await Model.punchOut(currentLoggedUser, req.params.id)
    res.json('PunchOut success')
  } catch (error) {
    next(error)
  }
}

const ListPunchInReport = async (req, res, next) => {
  try {
    console.log("req",req.body);
    
    const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
    const resp = await Model.listPunchInReport(currentLoggedUser, null,req.body)    
    res.json({ status: 200, total: resp[0].totalCount[0].count, data: resp[0].data})
  } catch (error) {
    next(error)
  }
}

const ExportPunchInReport = async (req, res, next) => {
  try {
    const token = req.headers.authorization || req.query.authorization || req.query.token
    console.log('token: ', token);
    
    const currentLoggedUser = await getCurrentUserInfo(token);
    const dataToCsv = await Model.exportPunchInReport(currentLoggedUser, null,req.body)
    if (isEmpty(dataToCsv)) {
      res.status(404).json({ status: 404, messahe: "no records", data: [] })
    } else {
      var fields = ['username', 'employeeId', 'punch_in', 'punch_out'];
      const opts = { fields };
      const parser = new Parser(opts);
      const csv = parser.parse(dataToCsv);
      // res.setHeader('Content-disposition', 'attachment; filename=PunchInReport.csv');
      // res.set('Content-Type', 'text/csv');
      // res.status(200).send(csv);
      res.json({ status: 200, data: dataToCsv })
    }

  } catch (error) {
    console.log("error",error);
    
    next(error)
    
  }
}

const testCron = async (req, res, next) => {
  try {
    console.log("testing cron");
    const { checkBDStageElapsed ,OpportunityStageElapsed} = require('../../cronjob/cronjob');
    checkBDStageElapsed();
    OpportunityStageElapsed();
    res.json({ status: 200})
  } catch (error) {
    next(error)
  }
}

module.exports = {
  testCron,
  PunchIn,
  PunchOut,
  ListPunchInReport,
  ExportPunchInReport,
  universalSearch,
  moveToPos,
  getCurrentUserInfo,
  getUniqueNo,
  getDefaultValue,
  businessUnit,
  businessCode,
  listCustomerCategory,
  termsOfUse,
  PrivacyPolicy,
  deleteNotes,
  brandNames,
  segment,
  getCustomerIdsToListCMR,
  ReminderFrequency
};
