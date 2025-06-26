// @ts-check
const ObjectId = require("mongodb").ObjectID;
const { isEmpty, sortBy, isUndefined } = require("lodash");
const CronJob = require("cron").CronJob;
const Moment = require("moment");

const Audit = require("../modules/audit/audit.model");
const Config = require("../../server/config/config");
const { getWeekFirstDay, getWeekLastDay, getTimeDiff } = require("../../server/config/dateutil");
const Scheduler = require("../../server/modules/schedule/schedule.model");
const DataAccess = require("../../server/helpers/DataAccess");
const { auditActions, Modules } = require("../../server/modules/shared/shared.model");
const CMRRejectionFromLab = require("../../server/modules/customers/cmr_details.model");

const overStayedDays = Config.overStayedDays;

const reminder = {
  'OnTime': '5d764990732b6eb29fb32af8',
  '5m': '5d764990732b6eb29fb32af9',
  '15m': '5d764990732b6eb29fb32afa',
  '30m': '5d764990732b6eb29fb32afb',
  '1h': '5d764990732b6eb29fb32afc',
  '2h': '5d764990732b6eb29fb32afd',
  '12h': '5d764990732b6eb29fb32afe',
  '1d': '5d764990732b6eb29fb32aff',
  '2d': '5d764990732b6eb29fb32b00',
  '3d': '5d764990732b6eb29fb32b01',
  '1w': '5d764990732b6eb29fb32b02',
  'custom': '5dfef3f15d78d31d721de89c',
};

const schedulerTypes = {
  Meeting: '5afbd730fc9609813663b0c2',
  fieldActivity: '5a93a2c4152426c79f4bbdc5',
  Task: '5aab8d4a9eaf9bce829b5c3c',
};

let addLog = (module, action, id, userId, doc, msg, archived = 0, subModule) => {
  try {
    let data = {
      module: module,
      action: action,
      documentId: ObjectId.isValid(id) ? ObjectId(id) : id,
      userId: ObjectId.isValid(userId) ? ObjectId(userId) : userId,
      data: doc,
      message: msg,
      date: new Date(),
      isArchived: archived
    };

    if (subModule) {
      data.subModule = subModule;
    }
    Audit.addLog(data);
  } catch (error) {
    console.log('CRON JOB::audit log error: ', error);
  }
};

const startJobs = () => {
  checkFieldActivityStatus.start();
  checkBD.start();
  checkOpportunityJob.start();
  checkCMR_Sync_Failure.start();
  check_Sync_Stopped.start();
  checkCMR_SampleSentToCustomer.start();
  checkCMR_Sync_Failure_FIxed.start();
  checkForReminderNotification_Scheduler.start();
  sendRejectionEmailForCMRFromLab.start();
  console.log("All cron jobs started!");
};




let checkCMR_SampleSentToCustomer = new CronJob('* * * * * *', () => {
  check_CMR_SampleSentToCustomer();
});


let checkFieldActivityStatus = new CronJob('* * * * * *', () => {
  Scheduler.updateStatusToOverdue();
});

let checkBD = new CronJob('0 0 9 * * *', () => {
  checkBDStageElapsed();
});

let checkOpportunityJob = new CronJob('0 0 9 * * *', () => {
  OpportunityStageElapsed();
});

let checkCMR_Sync_Failure = new CronJob('* * * * * *', () => {
  check_CMR_Sync_Failed();
});
let check_Sync_Stopped = new CronJob('0 * * * *', () => {
  console.log('run sync stopped check');
  CheckSyncStopped();
});

let checkCMR_Sync_Failure_FIxed = new CronJob('* * * * *', () => {
  checkCMRsyncFailFixed();
});

let checkForReminderNotification_Scheduler = new CronJob('* * * * *', () => {
  console.log('run reminder check');
  getSchedulerData()
});

// New Cron Job for CMR Rejection Email
const checkRejectionStatusFromCMR = async () => {
  try {
    CMRRejectionFromLab.getDetailsForRejectionFromLab();
    // console.log('Rejection emails sent successfully');
  } catch (error) {
    console.error('Error while sending rejection emails:', error);
  }
};

let sendRejectionEmailForCMRFromLab = new CronJob('*/15 * * * *', () => {
  checkRejectionStatusFromCMR();
});

const checkBDStageElapsed = async () => {
  try {
    console.log('start lead elapsed cron');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    let allCustomer = await DataAccess.findAll(Modules().customer, { dataType: 'lead', customer_code: "", approvalComplete: { $ne: 1 }, modified_At: { $gt: startDate } });
    console.log('found leads', allCustomer.length);
    for (const customer of allCustomer) {
      await checkCustomerData(customer);
    }
  } catch (error) {
    console.log('checkBD error: ', error);
  }
};

const OpportunityStageElapsed = async () => {
  try {
    console.log('start opportunity elapsed cron');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    let allOpportunity = await DataAccess.findAll(Modules().cmr, { modified_At: { $gt: startDate }, opportunityStage: { $exists: true }, opportunityComplete: { $ne: 1 } });
    console.log('found Opportunity', allOpportunity.length);
    for (const customer of allOpportunity) {
      await checkOpportunityData(customer);
    }
  } catch (error) {
    console.log('checkBD error: ', error);
  }
};

const audit_CMR_SampleSentToCustomer = cmr => {
  addLog(Modules().customer, auditActions().change_status, cmr.customer_id, 'cron', cmr, `${cmr.CRM_CMR_No}:Sample Sent to Customer`, 0, Modules().cmr);
  DataAccess.UpdateOne(Modules().cmr, { _id: ObjectId(cmr._id) }, { $set: { alertSentOnSampleSentToCustomer: 1 } });
};

const check_CMR_SampleSentToCustomer = async () => {
  try {
    let allCMR = await DataAccess.findAll(Modules().cmr, { CMR_Status: 18, alertSentOnSampleSentToCustomer: { $ne: 1 } });
    for (const cmr of allCMR) {
      audit_CMR_SampleSentToCustomer(cmr);
    }
  } catch (error) {
    console.log('check_CMR_SampleSentToCustomer error: ', error);
  }
};

const audit_Sync_Stopped = doc => addLog(null, auditActions().sync, null, 'cron', doc, 'Sync stopped');


const CheckSyncStopped = async () => {
  try {
    let found = await DataAccess.findOne(Modules().cmr, { approvalStage: { $gte: 4 }, "RBU": { $regex: /.{24,}/ }, crm_sync: 1 });
    if (found) {
      const finalApproval = found.approvals[found.approvals.length - 1]
      const cmrApprovedDate = finalApproval.approved_date;
      let actual_diff = getTimeDiff(new Date(), cmrApprovedDate, 'minutes')
      if (actual_diff >= 45) {
        audit_Sync_Stopped({ CRM_CMR_No: found.CRM_CMR_No, approvalStage: found.approvalStage, approvals: found.approvals, sync_stopped: 1 });
      }
    }
  } catch (error) {
    console.log('check_Sync_Stopped error: ', error);
  }
};

const audit_CMR_SyncFailed = cmr => {
  addLog(Modules().cmr, auditActions().sync, cmr._id, 'cron', cmr, 'CMR sync failed');
  DataAccess.UpdateOne(Modules().cmr, { _id: ObjectId(cmr._id) }, { $set: { synFailureAlertSent: 1 } });
};

const check_CMR_Sync_Failed = async () => {
  try {
    let allCMR = await DataAccess.findAll(Modules().cmr, { crm_sync: 99, synFailureAlertSent: { $ne: 1 } });
    for (const cmr of allCMR) {
      audit_CMR_SyncFailed(cmr);
    }
  } catch (error) {
    console.log('check_CMR_Sync_Failed error: ', error);
  }
};

const checkCMRsyncFailFixed = async () => {
  try {
    let allCMR = await DataAccess.findAll(Modules().cmr, { crm_sync: 2, synFailureAlertSent: 1 });
    for (const cmr of allCMR) {
      DataAccess.UpdateOne(Modules().cmr, { _id: ObjectId(cmr._id) }, { $set: { synFailureAlertSent: 0 } });
    }
  } catch (error) {
    console.log('checkCMRsyncFailFixed :: error: ', error);
  }
};

const getSchedulerData = async () => {
  try {
    const data = await DataAccess.findAll(Modules().shceduler,
      {
        deleted: { $ne: 1 },
        '$or': [
          { meeting_date: { $gte: getWeekFirstDay(), $lt: getWeekLastDay() } },
          { due_date: { $gte: getWeekFirstDay(), $lt: getWeekLastDay() } },
          { start_date: { $gte: getWeekFirstDay(), $lt: getWeekLastDay() } },
          { visit_date: { $gte: getWeekFirstDay(), $lt: getWeekLastDay() } },
          { call_start_date: { $gte: getWeekFirstDay(), $lt: getWeekLastDay() } },
        ]
      }
    );
    let diffTime;
    for (let scheduler of data) {
      switch (scheduler.reminder) {
        case reminder['OnTime']: {
          diffTime = -1;
          checkShedulertType(scheduler, diffTime)
          break;
        }
        case reminder['5m']: {
          diffTime = -6;
          checkShedulertType(scheduler, diffTime)
          break;
        }
        case reminder['15m']: {
          diffTime = -16;
          checkShedulertType(scheduler, diffTime)
          break;
        }
        case reminder['30m']: {
          diffTime = -31;
          checkShedulertType(scheduler, diffTime)
          break;
        }
        case reminder['1h']: {
          diffTime = -61;
          checkShedulertType(scheduler, diffTime)
          break;
        }
        case reminder['2h']: {
          diffTime = -121;
          checkShedulertType(scheduler, diffTime)
          break;
        }
        case reminder['12h']: {
          diffTime = -721;
          checkShedulertType(scheduler, diffTime)
          break;
        }
        case reminder['1d']: {
          diffTime = -1441;
          checkShedulertType(scheduler, diffTime)
          break;
        }
        case reminder['2d']: {
          diffTime = -2881;
          checkShedulertType(scheduler, diffTime)
          break;
        }
        case reminder['3d']: {
          diffTime = -4321;
          checkShedulertType(scheduler, diffTime)
          break;
        }
        case reminder['1w']: {
          diffTime = -100801;
          checkShedulertType(scheduler, diffTime)
          break;
        }
        case reminder['custom']: {
          diffTime = null;
          checkShedulertType(scheduler, diffTime)
          break;
        }
        default: {
          break;
        }
      }

    }
  } catch (error) {
    console.log('CRON::getSchedulerData Error: ', error);

  }
}


const checkShedulertType = (doc, diff) => {
  const now = new Date();
  try {
    if (doc.type == schedulerTypes.Meeting) {
      let eventDate = Moment(doc.meeting_date)
      let actual_diff = getTimeDiff(new Date(), eventDate, 'minutes')
      if (diff && (actual_diff >= diff) && (actual_diff <= 0)) {
        if (!doc.reminderNotificationSent) {
          console.log('MAATCHED!!! MEETING TIME: ', actual_diff, ' :: ', diff, ' :: ', doc.reminderNotificationSent);
          triggerReminderNotification_Scheduler(doc);
        }
      } else {
        if (doc && doc.reminder_settings && doc.reminder_settings.length > 0) {
          for (const iterator of doc.reminder_settings) {
            if (
              now.getFullYear() === new Date(iterator.reminder_date).getFullYear() &&
              now.getMonth() === new Date(iterator.reminder_date).getMonth() &&
              now.getDate() === new Date(iterator.reminder_date).getDate() &&
              now.getHours() === new Date(iterator.reminder_date).getHours() &&
              now.getMinutes() === new Date(iterator.reminder_date).getMinutes()
            ) {
              console.log('CUSTOM REMINDER MEETING');
              triggerReminderNotification_Scheduler(doc);
            }
          }
        }
      }
    } else if (doc.type == schedulerTypes.fieldActivity) {
      let eventDate = doc.start_date ? Moment(doc.start_date) : doc.visit_date ? Moment(doc.visit_date) : null
      let actual_diff = getTimeDiff(new Date(), eventDate, 'minutes')
      if (diff && (actual_diff >= diff) && (actual_diff <= 0)) {
        if (!doc.reminderNotificationSent) {
          console.log('MAATCHED!!! FA TIME: ', actual_diff, ' :: ', diff, ' :: ', doc.reminderNotificationSent);
          triggerReminderNotification_Scheduler(doc);
        }
      } else {
        if (doc && doc.reminder_settings && doc.reminder_settings.length > 0) {
          for (const iterator of doc.reminder_settings) {
            if (
              now.getFullYear() === new Date(iterator.reminder_date).getFullYear() &&
              now.getMonth() === new Date(iterator.reminder_date).getMonth() &&
              now.getDate() === new Date(iterator.reminder_date).getDate() &&
              now.getHours() === new Date(iterator.reminder_date).getHours() &&
              now.getMinutes() === new Date(iterator.reminder_date).getMinutes()
            ) {
              console.log('CUSTOM REMINDER FA');
              triggerReminderNotification_Scheduler(doc);
            }
          }
        }
      }
    } else if (doc.type == schedulerTypes.Task) {
      let eventDate = doc.due_date ? Moment(doc.due_date) : doc.call_start_date ? Moment(doc.call_start_date) : null
      let actual_diff = getTimeDiff(new Date(), eventDate, 'minutes')
      if (diff && (actual_diff >= diff) && (actual_diff <= 0)) {
        if (!doc.reminderNotificationSent) {
          console.log('MAATCHED!!! TASK TIME: ', actual_diff, ' :: ', diff, ' :: ', doc.reminderNotificationSent);
          triggerReminderNotification_Scheduler(doc);
        }
      } else {
        if (doc && doc.reminder_settings && doc.reminder_settings.length > 0) {
          for (const iterator of doc.reminder_settings) {
            if (
              now.getFullYear() === new Date(iterator.reminder_date).getFullYear() &&
              now.getMonth() === new Date(iterator.reminder_date).getMonth() &&
              now.getDate() === new Date(iterator.reminder_date).getDate() &&
              now.getHours() === new Date(iterator.reminder_date).getHours() &&
              now.getMinutes() === new Date(iterator.reminder_date).getMinutes()
            ) {
              console.log('CUSTOM REMINDER TASK');
              triggerReminderNotification_Scheduler(doc);
            }
          }
        }
      }
    }
  } catch (error) {
    console.log('CRON JOB::reminder notify Error: ', error);
  }
}


const checkOpportunityStageTimeElapsed = async (opportunity = {}, opportunityStage, date = new Date()) => {
  try {
    opportunityStage=opportunityStage.toUpperCase();
    let opportunityStageDate = Moment(date);
    opportunityStageDate.set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
    let today = new Date();
    today.setHours(0, 0, 0);
    let diff = getTimeDiff(today, opportunityStageDate, 'days');
    const stayedDays = overStayedDays[opportunityStage];
    console.log("diff",opportunityStage, diff, opportunity._id);
    if (diff && stayedDays && stayedDays.includes(diff)) {
      opportunity.elapsedStage = stayedDays.indexOf(diff)+1;
      opportunity.elapsed = {
        day: diff,
        opportunityStage: opportunityStage,
        moved_date: date,
        current_date: new Date()
      };
      let customer = await DataAccess.findOne(Modules().customer, { _id:new ObjectId(opportunity.customer_id)});
      opportunity.customer_region= customer.customer_region;
      opportunity.customer_area= customer.customer_area;
      opportunity.customer_zone= customer.customer_zone;

      // diff++;
      // `Elapsed the time on ${customer.bdStage}. Currently statying on ${diff}th day on ${customer.bdStage}`
      const auditMessage = `Opportunity has overstayed in ${opportunity.opportunityStage}. Overstayed by ${diff} days`
      addLog(Modules().cmr, auditActions().elapse, opportunity._id, 'cron', opportunity, auditMessage);
    }
  } catch (error) {
    console.log('CRON JOB::checkOpportunityStageTimeElapsed error: ', error);
  }
};
const checkBDStageTimeElapsed = (customer = {}, bdStage, date = new Date()) => {
  try {
    let bdStageDate = Moment(date).set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
    let today = new Date();
    today.setHours(0, 0, 0);
    let diff = getTimeDiff(today, bdStageDate, 'days')
    const stayedDays = overStayedDays[bdStage];
    if (diff && stayedDays && stayedDays.includes(diff)) {
      customer.elapsedStage = stayedDays.indexOf(diff)+1;
      customer.elapsed = {
        day: diff,
        bdStage: bdStage,
        moved_date: date,
        current_date: new Date()
      };

      // diff++;
      // `Elapsed the time on ${customer.bdStage}. Currently statying on ${diff}th day on ${customer.bdStage}`
      const auditMessage = `Lead has overstayed in ${customer.bdStage}. Overstayed by ${diff} days`
      addLog(Modules().customer, auditActions().elapse, customer._id, 'cron', customer, auditMessage);
    }
  } catch (error) {
    console.log('CRON JOB::checkBDStageTimeElapsed error: ', error);
  }
};

function triggerReminderNotification_Scheduler(doc) {
  let auditMessage = 'reminder notification sent';
  let audit_data = {
    type: doc.type,
    notify_by_email: doc.notify_by_email,
  };

  addLog(Modules().shceduler, auditActions().reminder, doc._id, 'cron', audit_data, auditMessage, 1);
  DataAccess.UpdateOne(Modules().shceduler, { _id: ObjectId(doc._id) }, { $set: { reminderNotificationSent: new Date() } });
  // DataAccess.UpdateOne(Modules().shceduler, { _id: ObjectId(doc._id) }, { $set: { "reminderNotification.lastSent": new Date(), $inc: { "reminderNotification.sent": 1 } } })

}

async function checkCustomerData(customer) {
  if (customer.bd_activity && customer.bd_activity.length > 0) {
    const bdActivity = customer.bd_activity[customer.bd_activity.length - 1];
    checkBDStageTimeElapsed(customer, customer.bdStage, bdActivity.moved_date);
  }
}
async function checkOpportunityData(opportunity) {
  if (opportunity.bd_activity && opportunity.bd_activity.length > 0) {
    const bdActivity = opportunity.bd_activity[opportunity.bd_activity.length - 1];
    checkOpportunityStageTimeElapsed(opportunity, opportunity.opportunityStage, bdActivity.moved_date);
  }
}

const jobs = {
  init: () => {
    if(process.env.DISABLE_CRON != '1'){
      startJobs();
    }
  },
  checkBDStageElapsed: checkBDStageElapsed,
  OpportunityStageElapsed: OpportunityStageElapsed
};

module.exports = jobs;
