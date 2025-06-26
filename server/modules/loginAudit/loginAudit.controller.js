const Model = require("./loginAudit.model");

const list = async (req, res, next) => {
  try {
    let params = req.body;
    const result = await Model.list(params);
    let response = {
      data: result[0].data,
      total: result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
};

module.exports = { list };
