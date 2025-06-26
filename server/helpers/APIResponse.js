
class HelperService {
    constructor() { }
    formatSucessMessage(res, message, data) {
        return res
            .status(200)
            .json({
                status: 200,
                message: message,
                data: data
            });
    }

    formatFailureMessage(res, err, code) {
        console.log('code: ', code);
        let statusCode = code ? code : 500;
        return res
            .status(statusCode)
            .json({
                status: statusCode,
                message: err
            });
    }

    formatUnAuthecticatedError(res, err) {
        return res
            .status(401)
            .json({
                status: 401,
                error: {
                    message: err
                }
            });
    }

    sendDataNotFound(res, err) {
        return res
            .status(404)
            .json({
                message: 'No data found',
                status: 404
            });
    }

    sendTokenNotProvided(res) {
        return res
            .status(499)
            .json({ message: 'Token not provided', status: 499 });
    }

    sendUnAuthorized(res) {
        return res
            .status(498)
            .json({ message: 'UnAuthorized/Failed to authenticate token.', status: 498 });
    }

    sendLinkingSuccessfulResponse(res, err) {
        return res
            .status(200)
            .json({
                message: 'Linked successfully',
                status: 200
            });

    }
    sendUnLinkingSuccessfulResponse(res, err) {
        return res
            .status(200)
            .json({
                message: 'UnLinked successfully',
                status: 200
            });
    }

}

module.exports = new HelperService();