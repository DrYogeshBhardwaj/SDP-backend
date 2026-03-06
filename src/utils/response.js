const successResponse = (res, statusCode = 200, message = 'Success', data = null) => {
    const response = {
        success: true,
        message
    };
    if (data) response.data = data;
    return res.status(statusCode).json(response);
};

const errorResponse = (res, statusCode = 500, message = 'Internal Server Error', error = null) => {
    const response = {
        success: false,
        message
    };
    if (process.env.NODE_ENV === 'development' && error) {
        response.error = error.message || error;
    }
    return res.status(statusCode).json(response);
};

module.exports = {
    successResponse,
    errorResponse
};
