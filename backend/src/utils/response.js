const successResponse = (res, statusCode, message, data = null) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
};

const errorResponse = (res, statusCode, message, error = null) => {
    let finalMessage = message;
    const technicalTerms = ['prisma', 'database', 'foreign key', 'constraint', 'query', 'syntax', 'connect', 'table'];
    if (technicalTerms.some(term => message.toLowerCase().includes(term))) {
        finalMessage = "System syncing… please retry";
    }
    
    return res.status(statusCode).json({
        success: false,
        message: finalMessage,
        error: process.env.NODE_ENV === 'development' ? error : null
    });
};

module.exports = {
    successResponse,
    errorResponse
};
