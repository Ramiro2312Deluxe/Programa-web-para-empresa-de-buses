/**
 * @fileoverview Middleware de validación para requests
 * @author TransBus Team
 * @version 1.0.0
 */

/**
 * Valida parámetros de búsqueda de rutas
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const validateRouteQuery = (req, res, next) => {
    const { origen, destino, fecha } = req.query;
    const errors = [];

    // Validar origen
    if (!origen || typeof origen !== 'string' || origen.trim().length < 2) {
        errors.push('Origen debe ser una cadena válida con al menos 2 caracteres');
    }

    // Validar destino
    if (!destino || typeof destino !== 'string' || destino.trim().length < 2) {
        errors.push('Destino debe ser una cadena válida con al menos 2 caracteres');
    }

    // Validar que origen y destino sean diferentes
    if (origen && destino && origen.trim().toLowerCase() === destino.trim().toLowerCase()) {
        errors.push('Origen y destino deben ser diferentes');
    }

    // Validar fecha
    if (!fecha) {
        errors.push('Fecha es requerida');
    } else {
        const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!fechaRegex.test(fecha)) {
            errors.push('Fecha debe tener formato YYYY-MM-DD');
        } else {
            const fechaObj = new Date(fecha);
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            
            if (isNaN(fechaObj.getTime())) {
                errors.push('Fecha inválida');
            } else if (fechaObj < hoy) {
                errors.push('La fecha no puede ser anterior a hoy');
            }
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Parámetros de búsqueda inválidos',
            errors
        });
    }

    next();
};

/**
 * Valida datos de reserva
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const validateBookingData = (req, res, next) => {
    const {
        nombre,
        email,
        telefono,
        origen,
        destino,
        asiento,
        horario,
        fecha,
        precio
    } = req.body;

    const errors = [];

    // Validar nombre
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
        errors.push('Nombre debe tener al menos 2 caracteres');
    } else if (nombre.trim().length > 100) {
        errors.push('Nombre no debe exceder 100 caracteres');
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        errors.push('Email inválido');
    }

    // Validar teléfono
    const telefonoRegex = /^[\+]?[\d\s\-\(\)]{8,20}$/;
    if (!telefono || !telefonoRegex.test(telefono)) {
        errors.push('Teléfono inválido (8-20 caracteres, puede incluir +, espacios, guiones y paréntesis)');
    }

    // Validar origen y destino
    if (!origen || typeof origen !== 'string' || origen.trim().length < 2) {
        errors.push('Origen inválido');
    }
    if (!destino || typeof destino !== 'string' || destino.trim().length < 2) {
        errors.push('Destino inválido');
    }
    if (origen && destino && origen.trim().toLowerCase() === destino.trim().toLowerCase()) {
        errors.push('Origen y destino deben ser diferentes');
    }

    // Validar asiento
    if (!asiento || !Number.isInteger(asiento) || asiento < 1 || asiento > 48) {
        errors.push('Asiento debe ser un número entero entre 1 y 48');
    }

    // Validar horario
    const horarioRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!horario || !horarioRegex.test(horario)) {
        errors.push('Horario debe tener formato HH:MM (24 horas)');
    }

    // Validar fecha
    if (!fecha) {
        errors.push('Fecha es requerida');
    } else {
        const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!fechaRegex.test(fecha)) {
            errors.push('Fecha debe tener formato YYYY-MM-DD');
        } else {
            const fechaObj = new Date(fecha);
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            
            if (isNaN(fechaObj.getTime())) {
                errors.push('Fecha inválida');
            } else if (fechaObj < hoy) {
                errors.push('La fecha no puede ser anterior a hoy');
            }
        }
    }

    // Validar precio
    if (!precio || typeof precio !== 'number' || precio <= 0 || precio > 1000) {
        errors.push('Precio debe ser un número entre 0 y 1000');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Datos de reserva inválidos',
            errors
        });
    }

    // Limpiar y normalizar datos
    req.body.nombre = nombre.trim();
    req.body.email = email.trim().toLowerCase();
    req.body.telefono = telefono.trim();
    req.body.origen = origen.trim();
    req.body.destino = destino.trim();

    next();
};

/**
 * Valida datos de pago
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const validatePaymentData = (req, res, next) => {
    const {
        nombre,
        email,
        origen,
        destino,
        asiento,
        horario,
        fecha,
        precio
    } = req.body;

    const errors = [];

    // Validar nombre
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
        errors.push('Nombre del pasajero requerido');
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        errors.push('Email válido requerido');
    }

    // Validar origen y destino
    if (!origen || !destino) {
        errors.push('Origen y destino requeridos');
    }

    // Validar asiento
    if (!asiento || !Number.isInteger(asiento) || asiento < 1 || asiento > 48) {
        errors.push('Número de asiento inválido');
    }

    // Validar horario
    const horarioRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!horario || !horarioRegex.test(horario)) {
        errors.push('Horario inválido');
    }

    // Validar fecha
    if (!fecha) {
        errors.push('Fecha requerida');
    } else {
        const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!fechaRegex.test(fecha)) {
            errors.push('Formato de fecha inválido');
        }
    }

    // Validar precio
    if (!precio || typeof precio !== 'number' || precio <= 0) {
        errors.push('Precio inválido');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Datos de pago inválidos',
            errors
        });
    }

    next();
};

/**
 * Valida parámetros de referencia de reserva
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const validateBookingReference = (req, res, next) => {
    const { referencia } = req.params;

    if (!referencia || typeof referencia !== 'string') {
        return res.status(400).json({
            success: false,
            message: 'Referencia de reserva requerida'
        });
    }

    // Validar formato de referencia (TB + 10-15 caracteres alfanuméricos)
    const referenciaRegex = /^TB[A-Z0-9]{8,13}$/;
    if (!referenciaRegex.test(referencia)) {
        return res.status(400).json({
            success: false,
            message: 'Formato de referencia inválido'
        });
    }

    next();
};

/**
 * Valida parámetros de paginación
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const validatePagination = (req, res, next) => {
    let { page, limit } = req.query;

    // Convertir a números enteros
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    // Validar rangos
    if (page < 1) {
        page = 1;
    }
    if (limit < 1) {
        limit = 10;
    }
    if (limit > 100) {
        limit = 100;
    }

    // Actualizar los query params
    req.query.page = page;
    req.query.limit = limit;

    next();
};

/**
 * Valida formato de ID numérico
 * @param {string} paramName - Nombre del parámetro a validar
 * @returns {Function} Middleware function
 */
const validateNumericId = (paramName) => {
    return (req, res, next) => {
        const id = req.params[paramName];
        
        if (!id || isNaN(id) || parseInt(id) < 1) {
            return res.status(400).json({
                success: false,
                message: `${paramName} debe ser un número entero positivo`
            });
        }

        req.params[paramName] = parseInt(id);
        next();
    };
};

/**
 * Valida formato de fecha en query params
 * @param {string} paramName - Nombre del parámetro a validar
 * @param {boolean} required - Si el parámetro es requerido
 * @returns {Function} Middleware function
 */
const validateDateParam = (paramName, required = false) => {
    return (req, res, next) => {
        const fecha = req.query[paramName];
        
        if (!fecha) {
            if (required) {
                return res.status(400).json({
                    success: false,
                    message: `Parámetro ${paramName} es requerido`
                });
            }
            return next();
        }

        const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!fechaRegex.test(fecha)) {
            return res.status(400).json({
                success: false,
                message: `${paramName} debe tener formato YYYY-MM-DD`
            });
        }

        const fechaObj = new Date(fecha);
        if (isNaN(fechaObj.getTime())) {
            return res.status(400).json({
                success: false,
                message: `${paramName} contiene una fecha inválida`
            });
        }

        next();
    };
};

/**
 * Sanitiza strings para prevenir XSS
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const sanitizeInput = (req, res, next) => {
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        
        return str
            .replace(/[<>]/g, '') // Remover < y >
            .replace(/javascript:/gi, '') // Remover javascript:
            .replace(/on\w+=/gi, '') // Remover event handlers
            .trim();
    };

    const sanitizeObject = (obj) => {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                obj[key] = sanitizeString(obj[key]);
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitizeObject(obj[key]);
            }
        }
    };

    if (req.body && typeof req.body === 'object') {
        sanitizeObject(req.body);
    }
    
    if (req.query && typeof req.query === 'object') {
        sanitizeObject(req.query);
    }

    next();
};

module.exports = {
    validateRouteQuery,
    validateBookingData,
    validatePaymentData,
    validateBookingReference,
    validatePagination,
    validateNumericId,
    validateDateParam,
    sanitizeInput
};