/**
 * @fileoverview Modelo de datos para pagos
 * @author TransBus Team
 * @version 1.0.0
 */

/**
 * Modelo para el manejo de pagos
 * @class PaymentModel
 */
class PaymentModel {
    /**
     * Almacén en memoria para los pagos
     * En una aplicación real, esto sería una base de datos
     * @private
     * @static
     */
    static payments = new Map();

    /**
     * Contador para generar IDs únicos
     * @private
     * @static
     */
    static nextId = 1;

    /**
     * Estados válidos para un pago
     * @static
     * @readonly
     */
    static PAYMENT_STATES = {
        PENDING: 'pending',
        COMPLETED: 'completed',
        FAILED: 'failed',
        CANCELLED: 'cancelled',
        REFUNDED: 'refunded'
    };

    /**
     * Métodos de pago soportados
     * @static
     * @readonly
     */
    static PAYMENT_METHODS = {
        STRIPE: 'stripe',
        PAYPAL: 'paypal',
        BANK_TRANSFER: 'bank_transfer'
    };

    /**
     * Crea un nuevo registro de pago
     * @param {Object} paymentData - Datos del pago
     * @param {string} paymentData.sessionId - ID de sesión de Stripe
     * @param {number} paymentData.amount - Monto del pago
     * @param {string} paymentData.currency - Moneda del pago
     * @param {string} [paymentData.status='pending'] - Estado del pago
     * @param {Object} paymentData.passengerData - Datos del pasajero
     * @param {string} [paymentData.method='stripe'] - Método de pago
     * @returns {Object} Pago creado
     */
    static createPayment(paymentData) {
        const paymentId = PaymentModel.nextId++;
        
        const payment = {
            id: paymentId,
            ...paymentData,
            status: paymentData.status || PaymentModel.PAYMENT_STATES.PENDING,
            method: paymentData.method || PaymentModel.PAYMENT_METHODS.STRIPE,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            attempts: 1,
            metadata: {
                userAgent: null,
                ipAddress: null,
                referrer: null,
                ...paymentData.metadata
            }
        };

        PaymentModel.payments.set(paymentData.sessionId, payment);
        
        return payment;
    }

    /**
     * Obtiene un pago por su ID de sesión
     * @param {string} sessionId - ID de sesión de pago
     * @returns {Object|null} Pago encontrado o null
     */
    static getPaymentBySessionId(sessionId) {
        return PaymentModel.payments.get(sessionId) || null;
    }

    /**
     * Obtiene un pago por su ID interno
     * @param {number} id - ID interno del pago
     * @returns {Object|null} Pago encontrado o null
     */
    static getPaymentById(id) {
        for (const payment of PaymentModel.payments.values()) {
            if (payment.id === id) {
                return payment;
            }
        }
        return null;
    }

    /**
     * Actualiza el estado de un pago
     * @param {string} sessionId - ID de sesión de pago
     * @param {string} newStatus - Nuevo estado del pago
     * @param {Object} [additionalData={}] - Datos adicionales a actualizar
     * @returns {Object|null} Pago actualizado o null
     */
    static updatePaymentStatus(sessionId, newStatus, additionalData = {}) {
        const payment = PaymentModel.payments.get(sessionId);
        
        if (!payment) {
            return null;
        }

        // Validar que el nuevo estado sea válido
        if (!Object.values(PaymentModel.PAYMENT_STATES).includes(newStatus)) {
            throw new Error(`Estado de pago inválido: ${newStatus}`);
        }

        const updatedPayment = {
            ...payment,
            status: newStatus,
            updatedAt: new Date().toISOString(),
            ...additionalData
        };

        // Agregar timestamps específicos según el estado
        switch (newStatus) {
            case PaymentModel.PAYMENT_STATES.COMPLETED:
                updatedPayment.completedAt = new Date().toISOString();
                break;
            case PaymentModel.PAYMENT_STATES.FAILED:
                updatedPayment.failedAt = new Date().toISOString();
                updatedPayment.attempts = (payment.attempts || 1) + 1;
                break;
            case PaymentModel.PAYMENT_STATES.CANCELLED:
                updatedPayment.cancelledAt = new Date().toISOString();
                break;
            case PaymentModel.PAYMENT_STATES.REFUNDED:
                updatedPayment.refundedAt = new Date().toISOString();
                break;
        }

        PaymentModel.payments.set(sessionId, updatedPayment);
        
        return updatedPayment;
    }

    /**
     * Obtiene todos los pagos con filtros opcionales
     * @param {Object} filters - Filtros de búsqueda
     * @param {string} [filters.status] - Estado del pago
     * @param {string} [filters.method] - Método de pago
     * @param {string} [filters.dateFrom] - Fecha desde (ISO string)
     * @param {string} [filters.dateTo] - Fecha hasta (ISO string)
     * @param {number} [filters.page=1] - Página para paginación
     * @param {number} [filters.limit=10] - Límite por página
     * @returns {Object} Objeto con data y información de paginación
     */
    static getPayments(filters = {}) {
        let paymentsArray = Array.from(PaymentModel.payments.values());
        
        // Aplicar filtros
        if (filters.status) {
            paymentsArray = paymentsArray.filter(p => p.status === filters.status);
        }
        
        if (filters.method) {
            paymentsArray = paymentsArray.filter(p => p.method === filters.method);
        }
        
        if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom);
            paymentsArray = paymentsArray.filter(p => 
                new Date(p.createdAt) >= fromDate
            );
        }
        
        if (filters.dateTo) {
            const toDate = new Date(filters.dateTo);
            paymentsArray = paymentsArray.filter(p => 
                new Date(p.createdAt) <= toDate
            );
        }

        // Ordenar por fecha de creación (más recientes primero)
        paymentsArray.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        // Paginación
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        
        const paginatedData = paymentsArray.slice(startIndex, endIndex);
        
        return {
            data: paginatedData,
            total: paymentsArray.length,
            page,
            limit,
            totalPages: Math.ceil(paymentsArray.length / limit)
        };
    }

    /**
     * Busca pagos por email del pasajero
     * @param {string} email - Email a buscar
     * @returns {Array} Lista de pagos encontrados
     */
    static searchByEmail(email) {
        const searchTerm = email.toLowerCase();
        const results = [];
        
        for (const payment of PaymentModel.payments.values()) {
            if (payment.passengerData && 
                payment.passengerData.email && 
                payment.passengerData.email.toLowerCase().includes(searchTerm)) {
                results.push(payment);
            }
        }
        
        return results.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
    }

    /**
     * Obtiene estadísticas de pagos
     * @returns {Object} Estadísticas de pagos
     */
    static getPaymentStats() {
        const paymentsArray = Array.from(PaymentModel.payments.values());
        
        const stats = {
            total: paymentsArray.length,
            pending: 0,
            completed: 0,
            failed: 0,
            cancelled: 0,
            refunded: 0,
            totalRevenue: 0,
            averageAmount: 0,
            methodStats: {},
            dailyStats: {},
            successRate: 0
        };

        let totalAmount = 0;
        let successfulPayments = 0;

        paymentsArray.forEach(payment => {
            // Contar por estado
            stats[payment.status] = (stats[payment.status] || 0) + 1;
            
            // Calcular ingresos (solo pagos completados)
            if (payment.status === PaymentModel.PAYMENT_STATES.COMPLETED) {
                stats.totalRevenue += payment.amount || 0;
                successfulPayments++;
            }
            
            totalAmount += payment.amount || 0;
            
            // Estadísticas por método
            const method = payment.method || 'unknown';
            if (!stats.methodStats[method]) {
                stats.methodStats[method] = { count: 0, revenue: 0 };
            }
            stats.methodStats[method].count++;
            if (payment.status === PaymentModel.PAYMENT_STATES.COMPLETED) {
                stats.methodStats[method].revenue += payment.amount || 0;
            }
            
            // Estadísticas diarias
            const date = new Date(payment.createdAt).toISOString().split('T')[0];
            if (!stats.dailyStats[date]) {
                stats.dailyStats[date] = { count: 0, revenue: 0 };
            }
            stats.dailyStats[date].count++;
            if (payment.status === PaymentModel.PAYMENT_STATES.COMPLETED) {
                stats.dailyStats[date].revenue += payment.amount || 0;
            }
        });

        stats.averageAmount = paymentsArray.length > 0 ? totalAmount / paymentsArray.length : 0;
        stats.successRate = paymentsArray.length > 0 ? 
            (successfulPayments / paymentsArray.length) * 100 : 0;

        return stats;
    }

    /**
     * Procesa un reembolso
     * @param {string} sessionId - ID de sesión de pago
     * @param {number} [refundAmount] - Monto a reembolsar (opcional, reembolso total por defecto)
     * @param {string} [reason='Reembolso solicitado'] - Razón del reembolso
     * @returns {Object|null} Pago con reembolso procesado o null
     */
    static processRefund(sessionId, refundAmount = null, reason = 'Reembolso solicitado') {
        const payment = PaymentModel.payments.get(sessionId);
        
        if (!payment) {
            return null;
        }

        if (payment.status !== PaymentModel.PAYMENT_STATES.COMPLETED) {
            throw new Error('Solo se pueden reembolsar pagos completados');
        }

        const refundData = {
            refundAmount: refundAmount || payment.amount,
            refundReason: reason,
            refundProcessedAt: new Date().toISOString()
        };

        return PaymentModel.updatePaymentStatus(
            sessionId, 
            PaymentModel.PAYMENT_STATES.REFUNDED, 
            refundData
        );
    }

    /**
     * Marca un pago como fallido con detalles del error
     * @param {string} sessionId - ID de sesión de pago
     * @param {string} errorMessage - Mensaje de error
     * @param {string} [errorCode] - Código de error
     * @returns {Object|null} Pago actualizado o null
     */
    static markPaymentFailed(sessionId, errorMessage, errorCode = null) {
        const additionalData = {
            lastError: {
                message: errorMessage,
                code: errorCode,
                timestamp: new Date().toISOString()
            }
        };

        return PaymentModel.updatePaymentStatus(
            sessionId, 
            PaymentModel.PAYMENT_STATES.FAILED, 
            additionalData
        );
    }

    /**
     * Obtiene pagos fallidos recientes para análisis
     * @param {number} [hoursBack=24] - Horas hacia atrás para buscar
     * @returns {Array} Lista de pagos fallidos recientes
     */
    static getRecentFailedPayments(hoursBack = 24) {
        const cutoffTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000));
        const failedPayments = [];

        for (const payment of PaymentModel.payments.values()) {
            if (payment.status === PaymentModel.PAYMENT_STATES.FAILED &&
                new Date(payment.updatedAt) >= cutoffTime) {
                failedPayments.push(payment);
            }
        }

        return failedPayments.sort((a, b) => 
            new Date(b.updatedAt) - new Date(a.updatedAt)
        );
    }

    /**
     * Obtiene pagos pendientes que han expirado
     * @param {number} [minutesTimeout=30] - Minutos de timeout para pagos pendientes
     * @returns {Array} Lista de pagos pendientes expirados
     */
    static getExpiredPendingPayments(minutesTimeout = 30) {
        const cutoffTime = new Date(Date.now() - (minutesTimeout * 60 * 1000));
        const expiredPayments = [];

        for (const payment of PaymentModel.payments.values()) {
            if (payment.status === PaymentModel.PAYMENT_STATES.PENDING &&
                new Date(payment.createdAt) <= cutoffTime) {
                expiredPayments.push(payment);
            }
        }

        return expiredPayments;
    }

    /**
     * Limpia pagos antiguos según criterios específicos
     * @param {Object} criteria - Criterios de limpieza
     * @param {number} [criteria.olderThanDays=90] - Días de antigüedad
     * @param {Array} [criteria.statuses] - Estados a limpiar
     * @returns {number} Número de pagos eliminados
     */
    static cleanupOldPayments(criteria = {}) {
        const olderThanDays = criteria.olderThanDays || 90;
        const statuses = criteria.statuses || [
            PaymentModel.PAYMENT_STATES.FAILED, 
            PaymentModel.PAYMENT_STATES.CANCELLED
        ];
        
        const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
        let deletedCount = 0;

        for (const [sessionId, payment] of PaymentModel.payments) {
            if (statuses.includes(payment.status) &&
                new Date(payment.createdAt) <= cutoffDate) {
                PaymentModel.payments.delete(sessionId);
                deletedCount++;
            }
        }

        return deletedCount;
    }

    /**
     * Valida los datos de un pago antes de crearlo
     * @param {Object} paymentData - Datos del pago a validar
     * @returns {Object} Resultado de validación
     */
    static validatePaymentData(paymentData) {
        const errors = [];

        if (!paymentData.sessionId) {
            errors.push('sessionId es requerido');
        }

        if (!paymentData.amount || paymentData.amount <= 0) {
            errors.push('amount debe ser mayor a 0');
        }

        if (!paymentData.currency) {
            errors.push('currency es requerida');
        }

        if (!paymentData.passengerData) {
            errors.push('passengerData es requerida');
        } else {
            if (!paymentData.passengerData.email) {
                errors.push('email del pasajero es requerido');
            }
            if (!paymentData.passengerData.nombre) {
                errors.push('nombre del pasajero es requerido');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Limpia el almacén de pagos (solo para testing)
     * @static
     */
    static clearAll() {
        PaymentModel.payments.clear();
        PaymentModel.nextId = 1;
    }
}

module.exports = PaymentModel;