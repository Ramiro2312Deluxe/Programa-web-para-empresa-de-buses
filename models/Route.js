/**
 * @fileoverview Modelo de datos para rutas de autobuses
 * @author TransBus Team
 * @version 1.0.0
 */

/**
 * Modelo para el manejo de rutas de autobuses
 * @class RouteModel
 */
class RouteModel {
    /**
     * Datos estáticos de rutas disponibles
     * En una aplicación real, esto vendría de una base de datos
     * @private
     * @static
     */
    static routesData = {
        "Ciudad de México-Guadalajara": {
            id: 1,
            origen: "Ciudad de México",
            destino: "Guadalajara",
            distancia: "460 km",
            duration: "7h 30m",
            price_range: { min: 25.00, max: 35.00 },
            schedules: [
                { 
                    id: 1, 
                    time: "06:00", 
                    arrival: "13:30", 
                    type: "Ejecutivo", 
                    price: 25.00,
                    seats_total: 48,
                    amenities: ["WiFi", "Aire acondicionado", "Baño", "Asientos reclinables"]
                },
                { 
                    id: 2, 
                    time: "10:00", 
                    arrival: "17:30", 
                    type: "Primera Clase", 
                    price: 30.00,
                    seats_total: 42,
                    amenities: ["WiFi", "Aire acondicionado", "Baño", "Asientos reclinables", "Snacks"]
                },
                { 
                    id: 3, 
                    time: "14:00", 
                    arrival: "21:30", 
                    type: "Ejecutivo", 
                    price: 25.00,
                    seats_total: 48,
                    amenities: ["WiFi", "Aire acondicionado", "Baño", "Asientos reclinables"]
                }
            ]
        },
        "Guadalajara-Ciudad de México": {
            id: 2,
            origen: "Guadalajara",
            destino: "Ciudad de México",
            distancia: "460 km",
            duration: "7h 30m",
            price_range: { min: 25.00, max: 30.00 },
            schedules: [
                { 
                    id: 4, 
                    time: "07:00", 
                    arrival: "14:30", 
                    type: "Primera Clase", 
                    price: 30.00,
                    seats_total: 42,
                    amenities: ["WiFi", "Aire acondicionado", "Baño", "Asientos reclinables", "Snacks"]
                },
                { 
                    id: 5, 
                    time: "15:00", 
                    arrival: "22:30", 
                    type: "Ejecutivo", 
                    price: 25.00,
                    seats_total: 48,
                    amenities: ["WiFi", "Aire acondicionado", "Baño", "Asientos reclinables"]
                }
            ]
        },
        "Ciudad de México-Monterrey": {
            id: 3,
            origen: "Ciudad de México",
            destino: "Monterrey",
            distancia: "923 km",
            duration: "9h 15m",
            price_range: { min: 35.00, max: 45.00 },
            schedules: [
                { 
                    id: 6, 
                    time: "08:00", 
                    arrival: "17:15", 
                    type: "Ejecutivo", 
                    price: 35.00,
                    seats_total: 48,
                    amenities: ["WiFi", "Aire acondicionado", "Baño", "Asientos reclinables"]
                },
                { 
                    id: 7, 
                    time: "20:00", 
                    arrival: "05:15+1", 
                    type: "Primera Clase", 
                    price: 40.00,
                    seats_total: 42,
                    amenities: ["WiFi", "Aire acondicionado", "Baño", "Asientos reclinables", "Snacks", "Mantas"]
                }
            ]
        },
        "Monterrey-Ciudad de México": {
            id: 4,
            origen: "Monterrey",
            destino: "Ciudad de México",
            distancia: "923 km",
            duration: "9h 15m",
            price_range: { min: 35.00, max: 40.00 },
            schedules: [
                { 
                    id: 8, 
                    time: "09:00", 
                    arrival: "18:15", 
                    type: "Ejecutivo", 
                    price: 35.00,
                    seats_total: 48,
                    amenities: ["WiFi", "Aire acondicionado", "Baño", "Asientos reclinables"]
                },
                { 
                    id: 9, 
                    time: "21:00", 
                    arrival: "06:15+1", 
                    type: "Primera Clase", 
                    price: 40.00,
                    seats_total: 42,
                    amenities: ["WiFi", "Aire acondicionado", "Baño", "Asientos reclinables", "Snacks", "Mantas"]
                }
            ]
        }
    };

    /**
     * Obtiene todas las rutas disponibles
     * @returns {Object} Todas las rutas con sus horarios
     */
    static getAllRoutes() {
        return RouteModel.routesData;
    }

    /**
     * Busca rutas por origen y destino
     * @param {string} origen - Ciudad de origen
     * @param {string} destino - Ciudad de destino
     * @param {string} fecha - Fecha del viaje (YYYY-MM-DD)
     * @returns {Object|null} Datos de la ruta encontrada o null
     */
    static searchRoutes(origen, destino, fecha) {
        const routeKey = `${origen}-${destino}`;
        const route = RouteModel.routesData[routeKey];
        
        if (!route) {
            return null;
        }

        // Agregar información de fecha a la respuesta
        return {
            ...route,
            fechaViaje: fecha,
            rutaKey: routeKey
        };
    }

    /**
     * Obtiene una ruta por su ID de horario
     * @param {number} scheduleId - ID del horario
     * @returns {Object|null} Datos del horario encontrado o null
     */
    static getRouteById(scheduleId) {
        for (const [routeKey, routeData] of Object.entries(RouteModel.routesData)) {
            const schedule = routeData.schedules.find(s => s.id === scheduleId);
            if (schedule) {
                return {
                    routeKey,
                    routeInfo: {
                        origen: routeData.origen,
                        destino: routeData.destino,
                        distancia: routeData.distancia,
                        duration: routeData.duration
                    },
                    schedule
                };
            }
        }
        return null;
    }

    /**
     * Obtiene un horario específico por su ID
     * @param {number} scheduleId - ID del horario
     * @returns {Object|null} Datos del horario o null
     */
    static getScheduleById(scheduleId) {
        for (const routeData of Object.values(RouteModel.routesData)) {
            const schedule = routeData.schedules.find(s => s.id === scheduleId);
            if (schedule) {
                return schedule;
            }
        }
        return null;
    }

    /**
     * Obtiene todas las ciudades disponibles
     * @returns {Array} Lista de ciudades únicas
     */
    static getAvailableCities() {
        const cities = new Set();
        
        Object.values(RouteModel.routesData).forEach(route => {
            cities.add(route.origen);
            cities.add(route.destino);
        });
        
        return Array.from(cities).sort();
    }

    /**
     * Obtiene rutas desde una ciudad específica
     * @param {string} ciudad - Nombre de la ciudad
     * @returns {Array} Lista de destinos disponibles desde esa ciudad
     */
    static getDestinationsFrom(ciudad) {
        const destinations = [];
        
        Object.values(RouteModel.routesData).forEach(route => {
            if (route.origen === ciudad) {
                destinations.push({
                    destino: route.destino,
                    duration: route.duration,
                    distancia: route.distancia,
                    priceRange: route.price_range,
                    schedules: route.schedules.length
                });
            }
        });
        
        return destinations;
    }

    /**
     * Obtiene información estadística de las rutas
     * @returns {Object} Estadísticas de las rutas
     */
    static getRouteStats() {
        const stats = {
            totalRoutes: Object.keys(RouteModel.routesData).length,
            totalSchedules: 0,
            totalSeats: 0,
            avgPrice: 0,
            cities: RouteModel.getAvailableCities().length,
            serviceTypes: new Set()
        };

        let totalPrice = 0;
        let scheduleCount = 0;

        Object.values(RouteModel.routesData).forEach(route => {
            route.schedules.forEach(schedule => {
                stats.totalSchedules++;
                stats.totalSeats += schedule.seats_total;
                totalPrice += schedule.price;
                scheduleCount++;
                stats.serviceTypes.add(schedule.type);
            });
        });

        stats.avgPrice = totalPrice / scheduleCount;
        stats.serviceTypes = Array.from(stats.serviceTypes);

        return stats;
    }

    /**
     * Valida si una ruta existe
     * @param {string} origen - Ciudad de origen
     * @param {string} destino - Ciudad de destino
     * @returns {boolean} True si la ruta existe
     */
    static routeExists(origen, destino) {
        const routeKey = `${origen}-${destino}`;
        return RouteModel.routesData.hasOwnProperty(routeKey);
    }

    /**
     * Obtiene horarios disponibles para una fecha específica
     * @param {string} origen - Ciudad de origen
     * @param {string} destino - Ciudad de destino
     * @param {string} fecha - Fecha del viaje
     * @returns {Array} Lista de horarios disponibles
     */
    static getAvailableSchedules(origen, destino, fecha) {
        const route = RouteModel.searchRoutes(origen, destino, fecha);
        
        if (!route) {
            return [];
        }

        // En una implementación real, aquí se verificaría la disponibilidad
        // por fecha, considerando días de la semana, feriados, etc.
        return route.schedules.map(schedule => ({
            ...schedule,
            fecha: fecha,
            available: true, // En una DB real, esto se calcularía
            seatsAvailable: schedule.seats_total - this.getOccupiedSeatsCount(schedule.id, fecha)
        }));
    }

    /**
     * Método auxiliar para obtener cantidad de asientos ocupados
     * @param {number} scheduleId - ID del horario
     * @param {string} fecha - Fecha del viaje
     * @returns {number} Cantidad de asientos ocupados
     * @private
     */
    static getOccupiedSeatsCount(scheduleId, fecha) {
        // Este método se implementaría con acceso a la base de datos de reservas
        // Por ahora retorna un número simulado
        return Math.floor(Math.random() * 10);
    }
}

module.exports = RouteModel;