const matches = {
    always: (params, doc) => {
        return true;
    },
    filterBy: (params, doc) => {
        // console.log("filterBy", params, doc);
        var result;

        if (params && params.rule) {
            eval(params.rule);
            // console.log("filterBy result", result);
            return result;
        }
        return true;
    }
}
module.exports = matches; 