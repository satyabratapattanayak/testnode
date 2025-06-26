const color_code_for_bd_activity_stage = {
    s1_Color: 'red', //'#7FB3D5',
    s2_Color: '#5499C7',
    s3_Color: '#2980B9',
    s4_Color: '#2471A3',
    s5_Color: '#1F618D',
    s6_Color: '#1A5276',
    s7_Color: '#154360',
};

const customer_category_colors = {
    GOLD: '#D4AF37', // '#D4AF37',
    BLUE: '#21618C', // '#21618C',
    RED: '#E74C3C',
    SILVER: '#4caf50', //'#C0C0C0',
    PLATINUM: '#401318', // '#401318',
    PALLADIUM: '#f44336', // '#F4E1D3'
};

class color_code_functions {
    constructor() { }

    customer_category_color(customerCategory) {
        let color;
        switch (customerCategory) {
            case 'GOLD': color = customer_category_colors.GOLD;
                break;
            case 'BLUE': color = customer_category_colors.BLUE;
                break;
            case 'PLATINUM': color = customer_category_colors.PLATINUM;
                break;
            case 'PALLADIUM': color = customer_category_colors.PALLADIUM;
                break;
            case 'SILVER': color = customer_category_colors.SILVER;
                break;
            default:
                break;
        }
        return color;
    }

    bd_stage_color(data) {
        let colorCode;
        if (data == '5bc820d910f21460f4978a8d' || data._id == '5bc820d910f21460f4978a8d') {
            colorCode = color_code_for_bd_activity_stage.s1_Color;
        } else if (data == '5bc820d910f21460f4978a8e' || data._id == '5bc820d910f21460f4978a8e') {
            colorCode = color_code_for_bd_activity_stage.s2_Color;
        } else if (data == '5bc820d910f21460f4978a8f' || data._id == '5bc820d910f21460f4978a8f') {
            colorCode = color_code_for_bd_activity_stage.s3_Color;
        } else if (data == '5bc820d910f21460f4978a90' || data._id == '5bc820d910f21460f4978a90') {
            colorCode = color_code_for_bd_activity_stage.s4_Color;
        } else if (data == '5bc820d910f21460f4978a91' || data._id == '5bc820d910f21460f4978a91') {
            colorCode = color_code_for_bd_activity_stage.s5_Color;
        } else if (data == '5bc820d910f21460f4978a92' || data._id == '5bc820d910f21460f4978a92') {
            colorCode = color_code_for_bd_activity_stage.s6_Color;
        } else if (data == '5bc820d910f21460f4978a93' || data._id == '5bc820d910f21460f4978a93') {
            colorCode = color_code_for_bd_activity_stage.s7_Color;
        }
        return colorCode;
    }

}


module.exports = new color_code_functions();
