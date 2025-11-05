/**
 * @fileoverview Middleware de logging y monitoreo
 * @author TransBus Team
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

/**
 * Middleware de logging de requests
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    // Capturar el método original de res.end para interceptar la respuesta
    const originalEnd = res.end;
    
    res.end = function(chunk, encoding) {
        // Restaurar el método original
        res.end = originalEnd;
        
        // Calcular tiempo de respuesta
        const responseTime = Date.now() - startTime;
        
        // Crear log entry
        const logEntry = {
            timestamp,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'] || 'Unknown',
            contentLength: res.get('content-length') || 0,
            referrer: req.headers['referer'] || req.headers['referrer'] || 'Direct',
            userId: req.user ? req.user.id : null,
            sessionId: req.sessionID || null
        };
        
        // Colorear output en desarrollo
        if (process.env.NODE_ENV === 'development') {
            const statusColor = getStatusColor(res.statusCode);
            const methodColor = getMethodColor(req.method);
            
            console.log(
                `${timestamp} ${methodColor}${req.method}\x1b[0m ${req.url} ` +
                `${statusColor}${res.statusCode}\x1b[0m ${responseTime}ms - ${req.ip}`
            );
        }
        
        // Log en formato JSON para producción
        if (process.env.NODE_ENV === 'production') {
            writeLogToFile('access.log', logEntry);
        }
        
        // Llamar al método original
        originalEnd.call(this, chunk, encoding);
    };
    
    next();
};

/**
 * Middleware de logging de errores
 * @param {Error} err - Error object
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const errorLogger = (err, req, res, next) => {
    const timestamp = new Date().toISOString();
    
    const errorLog = {
        timestamp,
        error: {
            message: err.message,
            stack: err.stack,
            name: err.name,
            code: err.code || 'UNKNOWN_ERROR'
        },
        request: {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: req.body,
            params: req.params,
            query: req.query,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent']
        },
        user: req.user ? {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
        } : null,
        severity: getErrorSeverity(err)
    };
    
    // Log en consola con colores en desarrollo
    if (process.env.NODE_ENV === 'development') {
        console.error(`\x1b[31m[ERROR]\x1b[0m ${timestamp}`);
        console.error(`\x1b[31m${err.stack}\x1b[0m`);
        console.error(`\x1b[33mRequest:\x1b[0m ${req.method} ${req.url}`);
        console.error(`\x1b[33mIP:\x1b[0m ${req.ip}`);
    }
    
    // Log en archivo para producción
    if (process.env.NODE_ENV === 'production') {
        writeLogToFile('error.log', errorLog);
    }
    
    // Enviar notificación para errores críticos
    if (errorLog.severity === 'critical') {
        sendCriticalErrorNotification(errorLog);
    }
    
    next(err);
};

/**
 * Middleware de logging de seguridad
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const securityLogger = (req, res, next) => {
    const securityEvents = [];
    
    // Detectar posibles ataques
    if (detectSQLInjection(req)) {
        securityEvents.push('SQL_INJECTION_ATTEMPT');
    }
    
    if (detectXSSAttempt(req)) {
        securityEvents.push('XSS_ATTEMPT');
    }
    
    if (detectBruteForce(req)) {
        securityEvents.push('BRUTE_FORCE_ATTEMPT');
    }
    
    if (detectSuspiciousUserAgent(req)) {
        securityEvents.push('SUSPICIOUS_USER_AGENT');
    }
    
    if (detectRateLimitViolation(req)) {
        securityEvents.push('RATE_LIMIT_VIOLATION');
    }
    
    // Log eventos de seguridad
    if (securityEvents.length > 0) {
        const securityLog = {
            timestamp: new Date().toISOString(),
            events: securityEvents,
            request: {
                method: req.method,
                url: req.url,
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.headers['user-agent'],
                headers: req.headers,
                body: req.body,
                params: req.params,
                query: req.query
            },
            severity: 'high',
            blocked: false // Se podría implementar bloqueo automático
        };
        
        console.warn(`\x1b[33m[SECURITY]\x1b[0m Eventos detectados: ${securityEvents.join(', ')}`);
        writeLogToFile('security.log', securityLog);
        
        // Enviar alerta inmediata
        sendSecurityAlert(securityLog);
    }
    
    next();
};

/**
 * Middleware de logging de performance
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const performanceLogger = (req, res, next) => {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    
    const originalEnd = res.end;
    
    res.end = function(chunk, encoding) {
        res.end = originalEnd;
        
        const endTime = process.hrtime.bigint();
        const endMemory = process.memoryUsage();
        
        const responseTime = Number(endTime - startTime) / 1000000; // Convertir a ms
        const memoryDelta = {
            rss: endMemory.rss - startMemory.rss,
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            heapTotal: endMemory.heapTotal - startMemory.heapTotal
        };
        
        const performanceLog = {
            timestamp: new Date().toISOString(),
            request: {
                method: req.method,
                url: req.url,
                contentLength: req.headers['content-length'] || 0
            },
            response: {
                statusCode: res.statusCode,
                contentLength: res.get('content-length') || 0,
                responseTime: `${responseTime.toFixed(2)}ms`
            },
            memory: {
                delta: memoryDelta,
                current: endMemory
            },
            cpu: process.cpuUsage()
        };
        
        // Log requests lentos
        if (responseTime > 1000) { // > 1 segundo
            console.warn(`\x1b[33m[SLOW QUERY]\x1b[0m ${req.method} ${req.url} - ${responseTime.toFixed(2)}ms`);
            writeLogToFile('performance.log', performanceLog);
        }
        
        originalEnd.call(this, chunk, encoding);
    };
    
    next();
};

/**
 * Middleware de logging personalizado
 * @param {string} logType - Tipo de log
 * @param {Function} extractData - Función para extraer datos del request
 * @returns {Function} Middleware function
 */
const customLogger = (logType, extractData) => {
    return (req, res, next) => {
        try {
            const customData = extractData(req, res);
            const logEntry = {
                timestamp: new Date().toISOString(),
                type: logType,
                data: customData
            };
            
            writeLogToFile(`${logType}.log`, logEntry);
        } catch (error) {
            console.error('Error en custom logger:', error);
        }
        
        next();
    };
};

/**
 * Obtener color para el código de estado HTTP
 * @param {number} statusCode - Código de estado HTTP
 * @returns {string} Código de color ANSI
 * @private
 */
function getStatusColor(statusCode) {
    if (statusCode >= 500) return '\x1b[31m'; // Rojo
    if (statusCode >= 400) return '\x1b[33m'; // Amarillo
    if (statusCode >= 300) return '\x1b[36m'; // Cian
    if (statusCode >= 200) return '\x1b[32m'; // Verde
    return '\x1b[0m'; // Reset
}

/**
 * Obtener color para el método HTTP
 * @param {string} method - Método HTTP
 * @returns {string} Código de color ANSI
 * @private
 */
function getMethodColor(method) {
    switch (method) {
        case 'GET': return '\x1b[32m';    // Verde
        case 'POST': return '\x1b[33m';   // Amarillo
        case 'PUT': return '\x1b[34m';    // Azul
        case 'DELETE': return '\x1b[31m'; // Rojo
        case 'PATCH': return '\x1b[35m';  // Magenta
        default: return '\x1b[0m';        // Reset
    }
}

/**
 * Escribir log a archivo
 * @param {string} filename - Nombre del archivo
 * @param {Object} logEntry - Entrada de log
 * @private
 */
function writeLogToFile(filename, logEntry) {
    try {
        const logsDir = path.join(process.cwd(), 'logs');
        
        // Crear directorio de logs si no existe
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
        const logPath = path.join(logsDir, filename);
        const logLine = JSON.stringify(logEntry) + '\n';
        
        fs.appendFileSync(logPath, logLine);
    } catch (error) {
        console.error('Error escribiendo log:', error);
    }
}

/**
 * Obtener severidad del error
 * @param {Error} err - Error object
 * @returns {string} Nivel de severidad
 * @private
 */
function getErrorSeverity(err) {
    if (err.name === 'ValidationError') return 'low';
    if (err.status && err.status < 500) return 'medium';
    if (err.name === 'MongoError' || err.name === 'SequelizeError') return 'high';
    return 'critical';
}

/**
 * Detectar intentos de inyección SQL
 * @param {Object} req - Request object
 * @returns {boolean} True si se detecta intento
 * @private
 */
function detectSQLInjection(req) {
    const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b)/i,
        /(UNION\s+SELECT)/i,
        /(';\s*(DROP|DELETE|INSERT|UPDATE))/i,
        /(OR\s+1\s*=\s*1)/i,
        /(\bOR\b.*\bAND\b)/i
    ];
    
    const checkString = JSON.stringify(req.body) + JSON.stringify(req.query) + JSON.stringify(req.params);
    
    return sqlPatterns.some(pattern => pattern.test(checkString));
}

/**
 * Detectar intentos de XSS
 * @param {Object} req - Request object
 * @returns {boolean} True si se detecta intento
 * @private
 */
function detectXSSAttempt(req) {
    const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe/i,
        /<object/i,
        /<embed/i
    ];
    
    const checkString = JSON.stringify(req.body) + JSON.stringify(req.query) + JSON.stringify(req.params);
    
    return xssPatterns.some(pattern => pattern.test(checkString));
}

/**
 * Detectar intentos de fuerza bruta
 * @param {Object} req - Request object
 * @returns {boolean} True si se detecta intento
 * @private
 */
function detectBruteForce(req) {
    // Implementación simplificada
    // En una app real, esto mantendría contadores por IP
    const suspiciousEndpoints = ['/login', '/auth', '/admin'];
    return suspiciousEndpoints.some(endpoint => req.url.includes(endpoint));
}

/**
 * Detectar User-Agent sospechoso
 * @param {Object} req - Request object
 * @returns {boolean} True si se detecta User-Agent sospechoso
 * @private
 */
function detectSuspiciousUserAgent(req) {
    const userAgent = req.headers['user-agent'] || '';
    const suspiciousPatterns = [
        /bot/i,
        /crawler/i,
        /spider/i,
        /scanner/i,
        /curl/i,
        /wget/i,
        /python/i,
        /^$/  // User-Agent vacío
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Detectar violación de rate limit
 * @param {Object} req - Request object
 * @returns {boolean} True si se detecta violación
 * @private
 */
function detectRateLimitViolation(req) {
    // Esto normalmente se integraría con el sistema de rate limiting
    return req.rateLimit && req.rateLimit.remaining === 0;
}

/**
 * Enviar notificación de error crítico
 * @param {Object} errorLog - Log del error
 * @private
 */
function sendCriticalErrorNotification(errorLog) {
    // Implementación de notificación (email, Slack, SMS, etc.)
    console.error('\x1b[41m[CRITICAL ERROR ALERT]\x1b[0m', errorLog.error.message);
}

/**
 * Enviar alerta de seguridad
 * @param {Object} securityLog - Log de seguridad
 * @private
 */
function sendSecurityAlert(securityLog) {
    // Implementación de alerta de seguridad
    console.warn('\x1b[43m[SECURITY ALERT]\x1b[0m', securityLog.events.join(', '));
}

module.exports = {
    requestLogger,
    errorLogger,
    securityLogger,
    performanceLogger,
    customLogger
};