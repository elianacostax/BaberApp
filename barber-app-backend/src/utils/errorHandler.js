
const { logError } = require('./logger');

//Imprime errores en la consola y los registra en logs
const handleError = (res, message = 'Error del servidor', statusCode = 500, error = null) => {
    // Log del error con contexto
    logError(error || new Error(message), {
        message,
        statusCode,
        url: res.req?.originalUrl,
        method: res.req?.method,
        userId: res.req?.user?.id
    });

    return res.status(statusCode).json({
        message,
        error: process.env.NODE_ENV === 'development' ? error?.message || error : undefined,
    });
};

module.exports = { handleError }