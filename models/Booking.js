/**
 * @fileoverview Modelo de datos para reservas de boletos
 * @author TransBus Team
 * @version 1.0.0
 */

/**
 * Modelo para el manejo de reservas de boletos
 * @class BookingModel
 */
class BookingModel {
    /**
     * Almacén en memoria para las reservas
     * En una aplicación real, esto sería una base de datos
     * @private
     * @static
     */
    static bookings = new Map();

    /**
     * Contador para generar IDs únicos
     * @private
     * @static
     */
    static nextId = 1;

    /**
     * Crea una nueva reserva
     * @param {Object} bookingData - Datos de la reserva
     * @param {string} bookingData.nombre - Nombre del pasajero
     * @param {string} bookingData.email - Email del pasajero
     * @param {string} bookingData.telefono - Teléfono del pasajero
     * @param {string} bookingData.origen - Ciudad de origen
     * @param {string} bookingData.destino - Ciudad de destino
     * @param {number} bookingData.asiento - Número de asiento
     * @param {string} bookingData.horario - Horario del viaje
     * @param {string} bookingData.fecha - Fecha del viaje
     * @param {number} bookingData.precio - Precio del boleto
     * @param {string} [bookingData.estado='pendiente'] - Estado de la reserva
     * @returns {Object} Reserva creada
     */
    static createBooking(bookingData) {
        const bookingId = BookingModel.nextId++;
        const referencia = BookingModel.generateReference();
        
        const booking = {
            id: bookingId,
            referencia,
            ...bookingData,
            estado: bookingData.estado || 'pendiente',
            fechaCreacion: new Date().toISOString(),
            fechaActualizacion: new Date().toISOString(),
            version: 1
        };

        BookingModel.bookings.set(referencia, booking);
        
        return booking;
    }

    /**
     * Obtiene una reserva por su referencia
     * @param {string} referencia - Referencia de la reserva
     * @returns {Object|null} Reserva encontrada o null
     */
    static getBookingByReference(referencia) {
        return BookingModel.bookings.get(referencia) || null;
    }

    /**
     * Obtiene una reserva por su ID
     * @param {number} id - ID de la reserva
     * @returns {Object|null} Reserva encontrada o null
     */
    static getBookingById(id) {
        for (const booking of BookingModel.bookings.values()) {
            if (booking.id === id) {
                return booking;
            }
        }
        return null;
    }

    /**
     * Actualiza una reserva existente
     * @param {string} referencia - Referencia de la reserva
     * @param {Object} updateData - Datos a actualizar
     * @returns {Object|null} Reserva actualizada o null si no existe
     */
    static updateBooking(referencia, updateData) {
        const booking = BookingModel.bookings.get(referencia);
        
        if (!booking) {
            return null;
        }

        const updatedBooking = {
            ...booking,
            ...updateData,
            fechaActualizacion: new Date().toISOString(),
            version: booking.version + 1
        };

        BookingModel.bookings.set(referencia, updatedBooking);
        
        return updatedBooking;
    }

    /**
     * Elimina una reserva
     * @param {string} referencia - Referencia de la reserva
     * @returns {boolean} True si se eliminó correctamente
     */
    static deleteBooking(referencia) {
        return BookingModel.bookings.delete(referencia);
    }

    /**
     * Verifica si un asiento está disponible
     * @param {number} routeId - ID de la ruta
     * @param {number} asiento - Número de asiento
     * @param {string} fecha - Fecha del viaje
     * @returns {boolean} True si está disponible
     */
    static isSeatAvailable(routeId, asiento, fecha) {
        for (const booking of BookingModel.bookings.values()) {
            if (booking.routeId === routeId && 
                booking.asiento === asiento && 
                booking.fecha === fecha && 
                booking.estado !== 'cancelada') {
                return false;
            }
        }
        return true;
    }

    /**
     * Obtiene los asientos ocupados para una ruta y fecha específica
     * @param {number} routeId - ID de la ruta
     * @param {string} fecha - Fecha del viaje
     * @returns {Array} Lista de números de asientos ocupados
     */
    static getOccupiedSeats(routeId, fecha) {
        const occupiedSeats = [];
        
        for (const booking of BookingModel.bookings.values()) {
            if (booking.routeId === routeId && 
                booking.fecha === fecha && 
                booking.estado !== 'cancelada') {
                occupiedSeats.push(booking.asiento);
            }
        }
        
        return occupiedSeats.sort((a, b) => a - b);
    }

    /**
     * Obtiene todas las reservas con filtros opcionales
     * @param {Object} filters - Filtros de búsqueda
     * @param {string} [filters.estado] - Estado de la reserva
     * @param {string} [filters.fecha] - Fecha del viaje
     * @param {string} [filters.email] - Email del pasajero
     * @param {number} [filters.page=1] - Página para paginación
     * @param {number} [filters.limit=10] - Límite por página
     * @returns {Object} Objeto con data y información de paginación
     */
    static getBookings(filters = {}) {
        let bookingsArray = Array.from(BookingModel.bookings.values());
        
        // Aplicar filtros
        if (filters.estado) {
            bookingsArray = bookingsArray.filter(b => b.estado === filters.estado);
        }
        
        if (filters.fecha) {
            bookingsArray = bookingsArray.filter(b => b.fecha === filters.fecha);
        }
        
        if (filters.email) {
            bookingsArray = bookingsArray.filter(b => 
                b.email && b.email.toLowerCase().includes(filters.email.toLowerCase())
            );
        }

        // Ordenar por fecha de creación (más recientes primero)
        bookingsArray.sort((a, b) => 
            new Date(b.fechaCreacion) - new Date(a.fechaCreacion)
        );

        // Paginación
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        
        const paginatedData = bookingsArray.slice(startIndex, endIndex);
        
        return {
            data: paginatedData,
            total: bookingsArray.length,
            page,
            limit,
            totalPages: Math.ceil(bookingsArray.length / limit)
        };
    }

    /**
     * Busca reservas por nombre del pasajero
     * @param {string} nombre - Nombre a buscar
     * @returns {Array} Lista de reservas encontradas
     */
    static searchByPassengerName(nombre) {
        const searchTerm = nombre.toLowerCase();
        const results = [];
        
        for (const booking of BookingModel.bookings.values()) {
            if (booking.nombre && booking.nombre.toLowerCase().includes(searchTerm)) {
                results.push(booking);
            }
        }
        
        return results.sort((a, b) => 
            new Date(b.fechaCreacion) - new Date(a.fechaCreacion)
        );
    }

    /**
     * Obtiene estadísticas de las reservas
     * @returns {Object} Estadísticas de reservas
     */
    static getBookingStats() {
        const bookingsArray = Array.from(BookingModel.bookings.values());
        
        const stats = {
            total: bookingsArray.length,
            pendientes: 0,
            confirmadas: 0,
            canceladas: 0,
            completadas: 0,
            ingresoTotal: 0,
            asientosMasReservados: {},
            rutasMasPopulares: {},
            reservasPorMes: {}
        };

        bookingsArray.forEach(booking => {
            // Contar por estado
            stats[booking.estado] = (stats[booking.estado] || 0) + 1;
            
            // Calcular ingresos (solo reservas confirmadas y completadas)
            if (booking.estado === 'confirmada' || booking.estado === 'completada') {
                stats.ingresoTotal += booking.precio || 0;
            }
            
            // Asientos más reservados
            const asiento = booking.asiento;
            stats.asientosMasReservados[asiento] = 
                (stats.asientosMasReservados[asiento] || 0) + 1;
            
            // Rutas más populares
            const ruta = `${booking.origen}-${booking.destino}`;
            stats.rutasMasPopulares[ruta] = 
                (stats.rutasMasPopulares[ruta] || 0) + 1;
            
            // Reservas por mes
            const fecha = new Date(booking.fechaCreacion);
            const mesAno = `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}`;
            stats.reservasPorMes[mesAno] = 
                (stats.reservasPorMes[mesAno] || 0) + 1;
        });

        return stats;
    }

    /**
     * Cancela una reserva
     * @param {string} referencia - Referencia de la reserva
     * @param {string} motivo - Motivo de cancelación
     * @returns {Object|null} Reserva cancelada o null
     */
    static cancelBooking(referencia, motivo = 'Cancelación solicitada') {
        const booking = BookingModel.bookings.get(referencia);
        
        if (!booking || booking.estado === 'cancelada') {
            return null;
        }

        return BookingModel.updateBooking(referencia, {
            estado: 'cancelada',
            motivoCancelacion: motivo,
            fechaCancelacion: new Date().toISOString()
        });
    }

    /**
     * Confirma una reserva (después del pago exitoso)
     * @param {string} referencia - Referencia de la reserva
     * @param {string} paymentSessionId - ID de sesión de pago
     * @returns {Object|null} Reserva confirmada o null
     */
    static confirmBooking(referencia, paymentSessionId) {
        return BookingModel.updateBooking(referencia, {
            estado: 'confirmada',
            paymentSessionId,
            fechaConfirmacion: new Date().toISOString()
        });
    }

    /**
     * Marca una reserva como completada (después del viaje)
     * @param {string} referencia - Referencia de la reserva
     * @returns {Object|null} Reserva completada o null
     */
    static completeBooking(referencia) {
        return BookingModel.updateBooking(referencia, {
            estado: 'completada',
            fechaCompletada: new Date().toISOString()
        });
    }

    /**
     * Genera una referencia única para la reserva
     * @returns {string} Referencia única
     * @private
     */
    static generateReference() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `TB${timestamp}${random}`.toUpperCase();
    }

    /**
     * Valida si una reserva puede ser modificada
     * @param {string} referencia - Referencia de la reserva
     * @returns {Object} Resultado de validación
     */
    static canModifyBooking(referencia) {
        const booking = BookingModel.bookings.get(referencia);
        
        if (!booking) {
            return { canModify: false, reason: 'Reserva no encontrada' };
        }

        if (booking.estado === 'cancelada') {
            return { canModify: false, reason: 'Reserva cancelada' };
        }

        if (booking.estado === 'completada') {
            return { canModify: false, reason: 'Viaje ya completado' };
        }

        // Verificar si el viaje es en menos de 2 horas
        const now = new Date();
        const travelDateTime = new Date(`${booking.fecha}T${booking.horario}`);
        const timeDiff = travelDateTime - now;
        const hoursUntilTravel = timeDiff / (1000 * 60 * 60);

        if (hoursUntilTravel < 2) {
            return { 
                canModify: false, 
                reason: 'No se puede modificar reservas con menos de 2 horas de anticipación' 
            };
        }

        return { canModify: true };
    }

    /**
     * Obtiene reservas que vencen pronto (para recordatorios)
     * @param {number} horasAntes - Horas antes del viaje
     * @returns {Array} Lista de reservas próximas a vencer
     */
    static getUpcomingBookings(horasAntes = 24) {
        const now = new Date();
        const cutoffTime = new Date(now.getTime() + (horasAntes * 60 * 60 * 1000));
        const upcomingBookings = [];

        for (const booking of BookingModel.bookings.values()) {
            if (booking.estado === 'confirmada') {
                const travelDateTime = new Date(`${booking.fecha}T${booking.horario}`);
                
                if (travelDateTime >= now && travelDateTime <= cutoffTime) {
                    upcomingBookings.push(booking);
                }
            }
        }

        return upcomingBookings.sort((a, b) => 
            new Date(`${a.fecha}T${a.horario}`) - new Date(`${b.fecha}T${b.horario}`)
        );
    }

    /**
     * Limpia el almacén de reservas (solo para testing)
     * @static
     */
    static clearAll() {
        BookingModel.bookings.clear();
        BookingModel.nextId = 1;
    }
}

module.exports = BookingModel;