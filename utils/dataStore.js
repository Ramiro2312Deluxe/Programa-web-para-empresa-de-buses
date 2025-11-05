/**
 * @fileoverview Sistema de persistencia de datos para TransBus
 * Maneja el almacenamiento y recuperación de rutas, boletos y configuración
 * @author TransBus Team
 * @version 1.0.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolver __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Directorio de datos
 */
const DATA_DIR = path.join(__dirname, '../data');
const ROUTES_FILE = path.join(DATA_DIR, 'routes.json');
const TICKETS_FILE = path.join(DATA_DIR, 'tickets.json');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');

/**
 * Crear directorio de datos si no existe
 */
function ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        console.log('📁 Directorio de datos creado:', DATA_DIR);
    }
}

/**
 * Rutas iniciales por defecto (para inicialización)
 */
const DEFAULT_ROUTES = {
    "Ciudad de México-Guadalajara": {
        duration: "7h 30m",
        distance: "550 km",
        basePrice: 450.00,
        schedules: [
            { id: 1, time: "06:00", arrival: "13:30", type: "Ejecutivo", price: 450.00 },
            { id: 2, time: "10:00", arrival: "17:30", type: "Primera Clase", price: 550.00 },
            { id: 3, time: "14:00", arrival: "21:30", type: "Ejecutivo", price: 450.00 },
            { id: 4, time: "20:00", arrival: "03:30+1", type: "Primera Clase", price: 550.00 }
        ]
    },
    "Ciudad de México-Monterrey": {
        duration: "9h 15m",
        distance: "920 km",
        basePrice: 650.00,
        schedules: [
            { id: 5, time: "08:00", arrival: "17:15", type: "Ejecutivo", price: 650.00 },
            { id: 6, time: "16:00", arrival: "01:15+1", type: "Primera Clase", price: 750.00 },
            { id: 7, time: "22:00", arrival: "07:15+1", type: "Ejecutivo", price: 650.00 }
        ]
    },
    "Guadalajara-Ciudad de México": {
        duration: "7h 30m",
        distance: "550 km",
        basePrice: 450.00,
        schedules: [
            { id: 8, time: "07:00", arrival: "14:30", type: "Primera Clase", price: 550.00 },
            { id: 9, time: "11:00", arrival: "18:30", type: "Ejecutivo", price: 450.00 },
            { id: 10, time: "19:00", arrival: "02:30+1", type: "Primera Clase", price: 550.00 }
        ]
    },
    "Ciudad de México-Puebla": {
        duration: "2h 30m",
        distance: "130 km",
        basePrice: 180.00,
        schedules: [
            { id: 11, time: "06:00", arrival: "08:30", type: "Ejecutivo", price: 180.00 },
            { id: 12, time: "09:00", arrival: "11:30", type: "Primera Clase", price: 220.00 },
            { id: 13, time: "14:00", arrival: "16:30", type: "Ejecutivo", price: 180.00 },
            { id: 14, time: "18:00", arrival: "20:30", type: "Primera Clase", price: 220.00 }
        ]
    },
    "Puebla-Ciudad de México": {
        duration: "2h 30m",
        distance: "130 km",
        basePrice: 180.00,
        schedules: [
            { id: 15, time: "07:00", arrival: "09:30", type: "Ejecutivo", price: 180.00 },
            { id: 16, time: "12:00", arrival: "14:30", type: "Primera Clase", price: 220.00 },
            { id: 17, time: "16:00", arrival: "18:30", type: "Ejecutivo", price: 180.00 },
            { id: 18, time: "20:00", arrival: "22:30", type: "Primera Clase", price: 220.00 }
        ]
    },
    "Monterrey-Ciudad de México": {
        duration: "9h 15m",
        distance: "920 km",
        basePrice: 650.00,
        schedules: [
            { id: 19, time: "09:00", arrival: "18:15", type: "Ejecutivo", price: 650.00 },
            { id: 20, time: "17:00", arrival: "02:15+1", type: "Primera Clase", price: 750.00 },
            { id: 21, time: "23:00", arrival: "08:15+1", type: "Ejecutivo", price: 650.00 }
        ]
    },
    "Guadalajara-Monterrey": {
        duration: "8h 45m",
        distance: "830 km",
        basePrice: 600.00,
        schedules: [
            { id: 22, time: "08:00", arrival: "16:45", type: "Ejecutivo", price: 600.00 },
            { id: 23, time: "15:00", arrival: "23:45", type: "Primera Clase", price: 700.00 },
            { id: 24, time: "21:00", arrival: "05:45+1", type: "Ejecutivo", price: 600.00 }
        ]
    },
    "Monterrey-Guadalajara": {
        duration: "8h 45m",
        distance: "830 km",
        basePrice: 600.00,
        schedules: [
            { id: 25, time: "09:00", arrival: "17:45", type: "Ejecutivo", price: 600.00 },
            { id: 26, time: "16:00", arrival: "00:45+1", type: "Primera Clase", price: 700.00 },
            { id: 27, time: "22:00", arrival: "06:45+1", type: "Ejecutivo", price: 600.00 }
        ]
    }
};

/**
 * Cargar rutas desde archivo JSON
 * @returns {Object} Objeto con todas las rutas
 */
function loadRoutes() {
    try {
        ensureDataDirectory();
        
        if (!fs.existsSync(ROUTES_FILE)) {
            // Si no existe el archivo, crear con rutas por defecto
            console.log('📝 Archivo de rutas no encontrado, creando con datos iniciales...');
            saveRoutes(DEFAULT_ROUTES);
            return DEFAULT_ROUTES;
        }
        
        const data = fs.readFileSync(ROUTES_FILE, 'utf8');
        const routes = JSON.parse(data);
        console.log(`✅ Rutas cargadas desde archivo: ${Object.keys(routes).length} rutas`);
        return routes;
        
    } catch (error) {
        console.error('❌ Error cargando rutas:', error.message);
        console.log('🔄 Usando rutas por defecto...');
        return DEFAULT_ROUTES;
    }
}

/**
 * Guardar rutas en archivo JSON
 * @param {Object} routes - Objeto con todas las rutas
 * @returns {boolean} True si se guardó correctamente
 */
function saveRoutes(routes) {
    try {
        ensureDataDirectory();
        
        const data = JSON.stringify(routes, null, 2);
        fs.writeFileSync(ROUTES_FILE, data, 'utf8');
        console.log(`💾 Rutas guardadas: ${Object.keys(routes).length} rutas`);
        return true;
        
    } catch (error) {
        console.error('❌ Error guardando rutas:', error.message);
        return false;
    }
}

/**
 * Cargar boletos desde archivo JSON
 * @returns {Map} Map con todos los boletos
 */
function loadTickets() {
    try {
        ensureDataDirectory();
        
        if (!fs.existsSync(TICKETS_FILE)) {
            console.log('📝 Archivo de boletos no encontrado, creando nuevo...');
            saveTickets(new Map());
            return new Map();
        }
        
        const data = fs.readFileSync(TICKETS_FILE, 'utf8');
        const ticketsArray = JSON.parse(data);
        const ticketsMap = new Map(ticketsArray);
        console.log(`✅ Boletos cargados desde archivo: ${ticketsMap.size} boletos`);
        return ticketsMap;
        
    } catch (error) {
        console.error('❌ Error cargando boletos:', error.message);
        return new Map();
    }
}

/**
 * Guardar boletos en archivo JSON
 * @param {Map} ticketsMap - Map con todos los boletos
 * @returns {boolean} True si se guardó correctamente
 */
function saveTickets(ticketsMap) {
    try {
        ensureDataDirectory();
        
        const ticketsArray = Array.from(ticketsMap.entries());
        const data = JSON.stringify(ticketsArray, null, 2);
        fs.writeFileSync(TICKETS_FILE, data, 'utf8');
        console.log(`💾 Boletos guardados: ${ticketsMap.size} boletos`);
        return true;
        
    } catch (error) {
        console.error('❌ Error guardando boletos:', error.message);
        return false;
    }
}

/**
 * Cargar reservas (asientos ocupados) desde archivo JSON
 * @returns {Map} Map con todas las reservas
 */
function loadBookings() {
    try {
        ensureDataDirectory();
        
        if (!fs.existsSync(BOOKINGS_FILE)) {
            console.log('📝 Archivo de reservas no encontrado, creando nuevo...');
            saveBookings(new Map());
            return new Map();
        }
        
        const data = fs.readFileSync(BOOKINGS_FILE, 'utf8');
        const bookingsArray = JSON.parse(data);
        
        // Reconstruir los Sets dentro del Map
        const bookingsMap = new Map();
        bookingsArray.forEach(([key, value]) => {
            bookingsMap.set(key, new Set(value));
        });
        
        console.log(`✅ Reservas cargadas desde archivo: ${bookingsMap.size} rutas con reservas`);
        return bookingsMap;
        
    } catch (error) {
        console.error('❌ Error cargando reservas:', error.message);
        return new Map();
    }
}

/**
 * Guardar reservas en archivo JSON
 * @param {Map} bookingsMap - Map con todas las reservas
 * @returns {boolean} True si se guardó correctamente
 */
function saveBookings(bookingsMap) {
    try {
        ensureDataDirectory();
        
        // Convertir Sets a Arrays para serialización
        const bookingsArray = Array.from(bookingsMap.entries()).map(([key, set]) => [
            key,
            Array.from(set)
        ]);
        
        const data = JSON.stringify(bookingsArray, null, 2);
        fs.writeFileSync(BOOKINGS_FILE, data, 'utf8');
        console.log(`💾 Reservas guardadas: ${bookingsMap.size} rutas con reservas`);
        return true;
        
    } catch (error) {
        console.error('❌ Error guardando reservas:', error.message);
        return false;
    }
}

/**
 * Obtener lista de ciudades únicas desde las rutas
 * @param {Object} routes - Objeto con todas las rutas
 * @returns {Array} Array de ciudades únicas
 */
function getUniqueCities(routes) {
    const cities = new Set();
    
    Object.keys(routes).forEach(routeKey => {
        const [origin, destination] = routeKey.split('-');
        cities.add(origin.trim());
        cities.add(destination.trim());
    });
    
    return Array.from(cities).sort();
}

/**
 * Obtener estadísticas de las rutas
 * @param {Object} routes - Objeto con todas las rutas
 * @returns {Object} Estadísticas
 */
function getRoutesStats(routes) {
    const totalRoutes = Object.keys(routes).length;
    let totalSchedules = 0;
    let minPrice = Infinity;
    let maxPrice = 0;
    
    Object.values(routes).forEach(route => {
        totalSchedules += route.schedules.length;
        
        route.schedules.forEach(schedule => {
            if (schedule.price < minPrice) minPrice = schedule.price;
            if (schedule.price > maxPrice) maxPrice = schedule.price;
        });
    });
    
    return {
        totalRoutes,
        totalSchedules,
        minPrice: minPrice === Infinity ? 0 : minPrice,
        maxPrice
    };
}

export {
    loadRoutes,
    saveRoutes,
    loadTickets,
    saveTickets,
    loadBookings,
    saveBookings,
    getUniqueCities,
    getRoutesStats,
    DEFAULT_ROUTES,
    DATA_DIR,
    ROUTES_FILE
};
