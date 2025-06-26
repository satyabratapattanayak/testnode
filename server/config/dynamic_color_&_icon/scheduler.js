// color code of schedule list based on type (mobile app)
const color_code_based_on_type = {
    FA: '#9c27b0', // '#5d6d7e'; //'#ff9800';
    TASK: '#ff9800', // '#2196f3'; //'#2196f3';
    MEETING: '#4caf50' // '#FA8072';
}

// mobile list: icons based on category
const schedule_FA_icon = 'map';
const schedule_email_icon = 'mail';
const schedule_meeting_icon = 'people';
const schedule_TODO_icon = 'clipboard';
const schedule_call_icon = 'call';


class color_code_functions {
    constructor() { }
    getCardColor(type) {
        let card_color;
        if (type == '5a93a2c4152426c79f4bbdc5') {
            card_color = color_code_based_on_type.FA;
        } else if (type == '5aab8d4a9eaf9bce829b5c3c') {
            card_color = color_code_based_on_type.TASK;
        } else if (type == '5afbd730fc9609813663b0c2') {
            card_color = color_code_based_on_type.MEETING;
        }
        return card_color;
    }

    getCardIcon(key) {
        let card_icon;
        if (key == '5addcaeb4a3802c94e2fba60') {
            card_icon = schedule_FA_icon;
        } else if (key == '5addcb084a3802c94e2fba62') {
            card_icon = schedule_call_icon;
        } else if (key == '5addcb0d4a3802c94e2fba63') {
            card_icon = schedule_email_icon;
        } else if (key == '5addcb184a3802c94e2fba64') {
            card_icon = schedule_TODO_icon;
        } else if (key == '5afa9c9a68062170124f93d6') {
            card_icon = schedule_meeting_icon;
        } else if (key == '5afa9ca368062170124f93d7') {
            card_icon = schedule_meeting_icon;
        } else if (key == '5addcb014a3802c94e2fba61') {
            card_icon = schedule_FA_icon;
        } else if (key == '5b3d9db215789cbb6768175c') {
            card_icon = schedule_FA_icon;
        } else if (key == '5b3d9dc615789cbb6768175d') {
            card_icon = schedule_FA_icon;
        } else if (key == '5a8eb11662a646e65f27a500' || key == '5b6184d9c60a5e49ade7ef1b') {
            card_icon = schedule_completed_Icon;
        } else if (key == '5a8eb10b62a646e65f27a4ff') {
            card_icon = schedule_inProgress_Icon;
        } else if (key == '5a8eb11e62a646e65f27a501') {
            card_icon = schedule_not_started_Icon;
        } else if (key == '5af09ba1c94cc441b55524f2') {
            card_icon = schedule_overDue_Icon;
        }
        return card_icon;
    }

    getCardIconColor(key) {
        let card_icon_color;
        if (key == '5a8eb11662a646e65f27a500' || key == '5b6184d9c60a5e49ade7ef1b') {
            card_icon_color = schedule_completed_Icon_color;
        } else if (key == '5a8eb10b62a646e65f27a4ff') {
            card_icon_color = schedule_inProgress_Icon_color;
        } else if (key == '5a8eb11e62a646e65f27a501') {
            card_icon_color = schedule_not_started_Icon_color;
        } else if (key == '5af09ba1c94cc441b55524f2') {
            card_icon_color = schedule_overDue_Icon_color;
        }
        return card_icon_color;
    }

    getStatusIcon(status) {
        let status_icon;
        if (status == '5a8eb11662a646e65f27a500' || status == '5b6184d9c60a5e49ade7ef1b') {
            status_icon = schedule_completed_Icon;
        } else if (status == '5a8eb10b62a646e65f27a4ff') {
            status_icon = schedule_inProgress_Icon;
        } else if (status == '5a8eb11e62a646e65f27a501') {
            status_icon = schedule_not_started_Icon;
        } else if (status == '5af09ba1c94cc441b55524f2') {
            status_icon = schedule_overDue_Icon;
        }
        return status_icon;
    }

    getStatusIcon_MobileApp(status) {
        let status_icon_mobile;
        if (status == '5a8eb11662a646e65f27a500' || status == '5b6184d9c60a5e49ade7ef1b') {
            status_icon_mobile = schedule_completed_Icon_mobile;
        } else if (status == '5a8eb10b62a646e65f27a4ff') {
            status_icon_mobile = schedule_inProgress_Icon_mobile;
        } else if (status == '5a8eb11e62a646e65f27a501') {
            status_icon_mobile = schedule_not_started_Icon_mobile;
        } else if (status == '5af09ba1c94cc441b55524f2') {
            status_icon_mobile = schedule_overDue_Icon_mobile;
        }
        return status_icon_mobile;
    }

    getCardPriority(priority) {
        let card_priority;
        if (!isEmpty(priority)) {
            if (priority == '5a8eb09762a646e65f27a4fb') {
                card_priority = 'H';
            } else if (priority == '5a8eb0a262a646e65f27a4fc') {
                card_priority = 'M';
            } else if (priority == '5a8eb0ab62a646e65f27a4fd') {
                card_priority = 'L';
            }
        } else {
            card_priority = '';
        }
        return card_priority;
    }

}

module.exports = new color_code_functions();

