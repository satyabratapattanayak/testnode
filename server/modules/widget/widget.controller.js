const { isEmpty, } = require('lodash');
const Moment = require('moment');

const Config = require('../../config/config');
const Model = require('./widget.model');
const { getCurrentUserInfo } = require('../shared/shared.controller');


const cardsCount = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.cardsCount(loggedUser);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

const bdActivity = async (req, res, next) => {
    await getCurrentUserInfo(req.headers.authorization)
        .then((CurrentUserInfo) => {
            return Model.bdActivity(req.query, CurrentUserInfo);
        })
        .then((result) => {
            if (isEmpty(result)) {
                res.status(404).json({ message: 'No data found', status: 404 });
            } else {
                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};

const bdWaitingForApproval = async (req, res, next) => {
    await getCurrentUserInfo(req.headers.authorization)
        .then((CurrentUserInfo) => {
            return Model.bdWaitingForApproval(req.query, CurrentUserInfo);
        })
        .then((result) => {
            if (isEmpty(result)) {
                res.status(404).json({ message: 'No data found', status: 404 });
            } else {
                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};

const CMR_WaitingForApproval = async (req, res, next) => {
    try {
        const CurrentUserInfo = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.CMR_WaitingForApproval(req.query, CurrentUserInfo);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

const CMR_SampleSentToCustomer = async (req, res, next) => {
    try {
        const CurrentUserInfo = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.CMR_SampleSentToCustomer(req.query, CurrentUserInfo);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

const MapOverStayedBD = async (data) => {
    return new Promise((resolve, reject) => {
        try {
            let response = {};
            // let bdCanStay = 13;

            let s1CanStay = Config.overStayedDays.s1[0];
            let s2CanStay = Config.overStayedDays.s2[0];
            let s3CanStay = Config.overStayedDays.s3[0];
            let s4CanStay = Config.overStayedDays.s4[0];
            let s5CanStay = Config.overStayedDays.s5[0];
            let s6CanStay = Config.overStayedDays.s6[0];
            let s7CanStay = Config.overStayedDays.s7[0];
            let s8CanStay = Config.overStayedDays.s8[0];
            let s1Count = 0, s2Count = 0, s3Count = 0, s4Count = 0;
            let s1overStayed = 0, s2overStayed = 0, s3overStayed = 0, s4overStayed = 0;
            let s5overStayed = 0,s6overStayed = 0,s7overStayed = 0,s8overStayed = 0;
            if (isEmpty(data)) {
                response.s1 = { total: s1Count, overStayed: s1overStayed };
                response.s2 = { total: s2Count, overStayed: s2overStayed };
                response.s3 = { total: s3Count, overStayed: s3overStayed };
                response.s4 = { total: s4Count, overStayed: s4overStayed };
                response.s5 = { total: s4Count, overStayed: s5overStayed };
                response.s6 = { total: s4Count, overStayed: s6overStayed };
                response.s7a = { total: s4Count, overStayed: s7overStayed };
                response.s7b = { total: s4Count, overStayed: s8overStayed };
                resolve(response);
            } else {
                data.forEach(element => {
                    if (element.bdStage == 's1') {
                        s1Count++;
                    } else if (element.bdStage == 's2') {
                        s2Count++;
                    } else if (element.bdStage == 's3') {
                        s3Count++;
                    } else if (element.bdStage == 's4') {
                        s4Count++;
                    }

                    if (element.bd_activity) {
                        const stage = element.bd_activity.find((ele) => {
                            if (element.bdStage == 's1' && ele.bdStage == 's1') {
                                let now = Moment();
                                let bdStageDate = Moment(ele.moved_date);
                                let diff = now.diff(bdStageDate, 'days');
                                if (diff > s1CanStay) { s1overStayed++; }
                            } else if (element.bdStage == 's2' && ele.bdStage == 's2') {
                                let now = Moment();
                                let bdStageDate = Moment(ele.moved_date);
                                let diff = now.diff(bdStageDate, 'days');
                                if (diff > s2CanStay) {
                                    s2overStayed++;
                                }
                            } else if (element.bdStage == 's3' && ele.bdStage == 's3') {
                                let now = Moment();
                                let bdStageDate = Moment(ele.moved_date);
                                let diff = now.diff(bdStageDate, 'days');
                                if (diff > s3CanStay) {
                                    s3overStayed++;
                                }
                            } else if (element.bdStage == 's4' && ele.bdStage == 's4') {
                                let now = Moment();
                                let bdStageDate = Moment(ele.moved_date);
                                let diff = now.diff(bdStageDate, 'days');
                                if (diff > s4CanStay) {
                                    s4overStayed++;
                                }
                            }
                        });
                    }
                });
                response.s1 = { total: s1Count, overStayed: s1overStayed };
                response.s2 = { total: s2Count, overStayed: s2overStayed };
                response.s3 = { total: s3Count, overStayed: s3overStayed };
                response.s4 = { total: s4Count, overStayed: s4overStayed };
                response.s5 = { total: s4Count, overStayed: s5overStayed };
                response.s6 = { total: s4Count, overStayed: s6overStayed };
                response.s7 = { total: s4Count, overStayed: s7overStayed };
                response.s8 = { total: s4Count, overStayed: s8overStayed };
                resolve(response);
            }
        } catch (error) {
            reject(error);
        }
    });
};

const bdBucket = async (req, res, next) => {
    try {
        const CurrentUserInfo = await getCurrentUserInfo(req.headers.authorization);
        const result = await Model.bdBucket(CurrentUserInfo);
        const response = await MapOverStayedBD(result);
        res.json(response, 200, next);
    } catch (error) {
        console.log("error", error);
        next(error);
    }
};


const lead = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.lead(loggedUser);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

const schedule = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.schedule(loggedUser);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            result.forEach(element => {
                element.start_date = element.start_date || element.meeting_date || element.due_date || element.visit_date || element.call_start_date;
            });

            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};
const upcomingSchedule = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.upcomingSchedule(loggedUser);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};
const todayStats = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.todayStats(loggedUser);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

const weekStats = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.weekStats(loggedUser);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

const monthStats = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.monthStats(loggedUser);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

const QuarterlyStats = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.quarterlyStats(loggedUser);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

const YearlyStats = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.YearlyStats(loggedUser);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

const leadRegistrationHistory = async (req, res, next) => {
    try {
        const CurrentUserInfo = await getCurrentUserInfo(req.headers.authorization);
        const result = await Model.leadRegistrationHistory(CurrentUserInfo);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error);
    }
};

const customerRegistrationHistory = async (req, res, next) => {
    try {
        const CurrentUserInfo = await getCurrentUserInfo(req.headers.authorization);
        const result = await Model.customerRegistrationHistory(CurrentUserInfo);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error);
    }
};

const mobileDashboard = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.getMobileDashboardDetails(loggedUser);
        // console.log("checking result: ", result);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

module.exports = {
    cardsCount,
    bdActivity,
    bdBucket,
    bdWaitingForApproval,
    CMR_WaitingForApproval,
    CMR_SampleSentToCustomer,
    lead,
    schedule,
    upcomingSchedule,
    todayStats,
    weekStats,
    monthStats,
    QuarterlyStats,
    YearlyStats,
    leadRegistrationHistory,
    customerRegistrationHistory,
    mobileDashboard
};