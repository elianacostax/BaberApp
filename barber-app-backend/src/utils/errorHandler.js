
//Imprime errores en la consola
 const handleError = (res, message= 'Error del servidor', statusCode = 500, error = null) => {
    console.error('Error:', error || message);
    return res.status(statusCode).json({
        message,
        error: process.env.NODE_ENV === 'development' ? error?.message || error : undefined,
    });
};

module.exports = { handleError}