# 🗄️ Sistema de Persistencia - TransBus

## 📋 Resumen

El sistema de persistencia de TransBus permite almacenar de forma permanente todas las rutas, boletos y reservas en archivos JSON. **Ahora todas las rutas creadas desde el panel de administración se guardan automáticamente y persisten después de reiniciar el servidor.**

---

## ✅ Problema Resuelto

### ❌ **ANTES** (Sin Persistencia)
- Las rutas estaban hardcodeadas en `server.js`
- Solo 3 rutas disponibles (CDMX-Guadalajara, CDMX-Monterrey, Guadalajara-CDMX)
- Crear rutas desde admin panel no tenía efecto permanente
- Reiniciar servidor = pérdida de datos
- Boletos y reservas solo en memoria RAM

### ✅ **AHORA** (Con Persistencia)
- **8 rutas iniciales por defecto** (incluye Puebla y más conexiones)
- Todas las rutas se guardan en `Backend/data/routes.json`
- Rutas creadas en admin panel **se guardan automáticamente**
- Reiniciar servidor **mantiene todas las rutas**
- Boletos y reservas persisten en archivos JSON
- Ciudades disponibles se cargan **dinámicamente** en el frontend

---

## 📁 Estructura de Archivos

```
Backend/
├── data/                         # Directorio de persistencia (creado automáticamente)
│   ├── routes.json              # Todas las rutas disponibles
│   ├── tickets.json             # Boletos vendidos
│   └── bookings.json            # Asientos reservados
├── utils/
│   └── dataStore.js             # Módulo de persistencia
└── server.js                     # Servidor principal (actualizado)
```

---

## 🔧 Módulo `dataStore.js`

### Funciones Principales

#### 📖 **Cargar Datos**
```javascript
import { loadRoutes, loadTickets, loadBookings } from './utils/dataStore.js';

// Cargar al iniciar servidor
let availableRoutes = loadRoutes();        // Carga routes.json
let ticketDatabase = loadTickets();        // Carga tickets.json
let bookedSeatsByRoute = loadBookings();   // Carga bookings.json
```

#### 💾 **Guardar Datos**
```javascript
import { saveRoutes, saveTickets, saveBookings } from './utils/dataStore.js';

// Guardar después de cambios
saveRoutes(availableRoutes);               // Guarda routes.json
saveTickets(ticketDatabase);               // Guarda tickets.json
saveBookings(bookedSeatsByRoute);          // Guarda bookings.json
```

#### 🏙️ **Obtener Ciudades**
```javascript
import { getUniqueCities } from './utils/dataStore.js';

const cities = getUniqueCities(availableRoutes);
// Retorna: ["Ciudad de México", "Guadalajara", "Monterrey", "Puebla"]
```

---

## 🚀 Rutas Iniciales Incluidas

El sistema incluye **8 rutas bidireccionales** con múltiples horarios:

1. **Ciudad de México ↔ Guadalajara** (550 km, 7h 30m)
2. **Ciudad de México ↔ Monterrey** (920 km, 9h 15m)
3. **Ciudad de México ↔ Puebla** (130 km, 2h 30m)
4. **Guadalajara ↔ Monterrey** (830 km, 8h 45m)

Cada ruta incluye:
- ⏰ Múltiples horarios (4-6 salidas diarias)
- 🎫 Diferentes clases (Ejecutivo / Primera Clase)
- 💰 Precios en MXN (180-750 pesos)
- 🕐 Horarios de salida y llegada

---

## 🔄 Endpoints que Guardan Automáticamente

Todos los endpoints de administración ahora **guardan cambios en disco automáticamente**:

### ✅ CRUD de Rutas
- `POST /api/admin/routes` → Crea ruta y **guarda en routes.json**
- `PUT /api/admin/routes/:routeKey` → Actualiza ruta y **guarda en routes.json**
- `DELETE /api/admin/routes/:routeKey` → Elimina ruta y **guarda en routes.json**

### ✅ CRUD de Horarios
- `POST /api/admin/routes/:routeKey/schedules` → Agrega horario y **guarda**
- `PUT /api/admin/routes/:routeKey/schedules/:scheduleId` → Actualiza horario y **guarda**
- `DELETE /api/admin/routes/:routeKey/schedules/:scheduleId` → Elimina horario y **guarda**

### ✅ Reservas y Boletos
- `POST /api/create-checkout-session` → Reserva temporal
- `GET /api/checkout/session` → Confirma pago, guarda boleto en **tickets.json** y reserva en **bookings.json**

---

## 🎯 Flujo de Persistencia

### 1️⃣ **Inicio del Servidor**
```
🚀 Server inicia
    ↓
📁 Verifica directorio data/
    ↓
📖 Carga routes.json (o crea con 8 rutas por defecto)
    ↓
📖 Carga tickets.json
    ↓
📖 Carga bookings.json
    ↓
✅ Sistema listo
```

### 2️⃣ **Crear Ruta desde Admin**
```
👤 Admin crea ruta en panel
    ↓
📤 POST /api/admin/routes
    ↓
✏️ Agrega a availableRoutes
    ↓
💾 saveRoutes(availableRoutes)
    ↓
📝 Escribe en routes.json
    ↓
✅ Ruta persistida
```

### 3️⃣ **Comprar Boleto**
```
👤 Cliente completa pago
    ↓
✅ Stripe confirma pago
    ↓
📝 Guarda en ticketDatabase
    ↓
💾 saveTickets(ticketDatabase)
    ↓
🪑 Marca asiento ocupado
    ↓
💾 saveBookings(bookedSeatsByRoute)
    ↓
✅ Boleto persistido
```

---

## 🌐 Frontend Dinámico

### Selectores de Ciudades
El frontend ahora carga las ciudades dinámicamente:

```javascript
// Antes: Hardcodeadas en HTML
<option value="Ciudad de México">Ciudad de México</option>
<option value="Guadalajara">Guadalajara</option>
// ...

// Ahora: Cargadas dinámicamente desde API
fetch('/api/cities')
  .then(response => response.json())
  .then(data => {
    data.cities.forEach(city => {
      option.value = city;
      option.textContent = city;
      select.appendChild(option);
    });
  });
```

### Nuevo Endpoint
```http
GET /api/cities
```

**Respuesta:**
```json
{
  "cities": [
    "Ciudad de México",
    "Guadalajara", 
    "Monterrey",
    "Puebla"
  ]
}
```

---

## 📊 Formato de Archivos JSON

### `routes.json`
```json
{
  "Ciudad de México-Guadalajara": {
    "duration": "7h 30m",
    "distance": "550 km",
    "basePrice": 450,
    "schedules": [
      {
        "id": 1,
        "time": "06:00",
        "arrival": "13:30",
        "type": "Ejecutivo",
        "price": 450
      }
    ]
  }
}
```

### `tickets.json`
```json
[
  ["session_id_123", {
    "sessionId": "session_id_123",
    "nombre": "Juan Pérez",
    "origen": "Ciudad de México",
    "destino": "Guadalajara",
    "asiento": "12",
    "horario": "10:00",
    "fecha": "2024-01-15",
    "precio": 550,
    "amountPaid": 550,
    "currency": "mxn",
    "createdAt": "2024-01-10T14:30:00.000Z",
    "paymentStatus": "paid"
  }]
]
```

### `bookings.json`
```json
[
  [
    "ciudad de méxico|guadalajara|2024-01-15|10:00",
    ["12", "15", "22"]
  ]
]
```

---

## 🧪 Cómo Probar el Sistema

### 1. **Crear Nueva Ruta desde Admin**
```bash
# 1. Abrir panel de administración
http://localhost:4242/admin.html

# 2. Crear ruta (ejemplo: CDMX → Cancún)
Origen: Ciudad de México
Destino: Cancún
Duración: 24h 0m
Distancia: 1600 km
Precio Base: 1200

# 3. Agregar horario
Hora Salida: 20:00
Hora Llegada: 20:00+1
Tipo: Primera Clase
Precio: 1200

# 4. Guardar ruta
```

### 2. **Verificar Persistencia**
```bash
# Reiniciar servidor
Ctrl+C
node server.js

# Verificar archivo
cat Backend/data/routes.json
# Debe incluir "Ciudad de México-Cancún"

# Verificar en compra de tickets
http://localhost:4242/
# El selector de ciudades debe incluir "Cancún"
```

### 3. **Comprar Boleto**
```bash
# 1. Seleccionar ruta recién creada
# 2. Completar compra con Stripe
# 3. Verificar archivo

cat Backend/data/tickets.json
cat Backend/data/bookings.json
```

---

## 🛡️ Manejo de Errores

El sistema incluye manejo robusto de errores:

### ❌ **Archivo Corrupto**
```javascript
try {
    const routes = loadRoutes();
} catch (error) {
    console.error('❌ Error cargando rutas:', error.message);
    console.log('🔄 Usando rutas por defecto...');
    return DEFAULT_ROUTES; // 8 rutas por defecto
}
```

### 📁 **Directorio No Existe**
```javascript
function ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        console.log('📁 Directorio de datos creado:', DATA_DIR);
    }
}
```

### 📝 **Archivo No Existe**
```javascript
if (!fs.existsSync(ROUTES_FILE)) {
    console.log('📝 Archivo de rutas no encontrado, creando con datos iniciales...');
    saveRoutes(DEFAULT_ROUTES);
    return DEFAULT_ROUTES;
}
```

---

## 🔍 Logs del Sistema

El sistema proporciona logs detallados:

```
📁 Directorio de datos creado: E:\...\Backend\data
📝 Archivo de rutas no encontrado, creando con datos iniciales...
💾 Rutas guardadas: 8 rutas
✅ Rutas cargadas desde archivo: 8 rutas
💾 Boletos guardados: 5 boletos
💾 Reservas guardadas: 3 rutas con reservas
✅ Sistema iniciado con 8 rutas disponibles
✅ 5 boletos en base de datos
✅ 3 rutas con reservas activas
```

---

## 📈 Estadísticas

Nuevo endpoint para obtener estadísticas:

```javascript
import { getRoutesStats } from './utils/dataStore.js';

const stats = getRoutesStats(availableRoutes);
// {
//   totalRoutes: 8,
//   totalSchedules: 28,
//   minPrice: 180,
//   maxPrice: 750
// }
```

---

## 🚀 Próximas Mejoras

### Versión Actual (JSON Files)
- ✅ Persistencia básica funcional
- ✅ Sin dependencias externas
- ✅ Fácil de depurar
- ⚠️ No escalable para miles de usuarios

### Versión Futura (Base de Datos)
- 🔄 Migrar a MongoDB/PostgreSQL
- 🔄 Transacciones ACID
- 🔄 Índices para búsquedas rápidas
- 🔄 Backups automáticos
- 🔄 Replicación

---

## 🔧 Migración a Base de Datos (Futuro)

Cuando necesites migrar a una base de datos real:

```javascript
// Mantén la misma interfaz
import { loadRoutes, saveRoutes } from './utils/dataStore.js';

// Solo cambia la implementación interna:
async function loadRoutes() {
    // En lugar de fs.readFileSync()
    return await db.routes.find({}).toArray();
}

async function saveRoutes(routes) {
    // En lugar de fs.writeFileSync()
    return await db.routes.replaceOne({}, routes);
}
```

**El código del servidor no cambia**, solo la implementación de `dataStore.js`.

---

## ✅ Checklist de Funcionalidad

- [x] Rutas persisten al reiniciar servidor
- [x] Admin panel crea rutas permanentes
- [x] Boletos se guardan automáticamente
- [x] Reservas de asientos persisten
- [x] Ciudades se cargan dinámicamente
- [x] 8 rutas iniciales por defecto
- [x] Manejo de errores robusto
- [x] Logs informativos
- [x] Archivos JSON legibles
- [x] API completamente funcional

---

## 📞 Soporte

Si tienes problemas:

1. **Verifica logs del servidor**: El sistema muestra mensajes claros
2. **Verifica archivos JSON**: Deben estar en `Backend/data/`
3. **Reinicia el servidor**: `node server.js`
4. **Borra archivos JSON**: El sistema los recreará automáticamente

---

## 🎉 Conclusión

**El sistema de persistencia está completamente funcional.** Todas las rutas creadas desde el panel de administración ahora se guardan permanentemente y están disponibles para la compra de boletos. 

El frontend carga las ciudades dinámicamente y el sistema escala fácilmente agregando nuevas rutas sin modificar código.

**¡TransBus está listo para producción!** 🚌✨
