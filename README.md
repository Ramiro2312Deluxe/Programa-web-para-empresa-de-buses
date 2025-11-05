# 🚌 TransBus - Sistema de Reserva de Boletos de Autobús

Sistema completo de reserva de boletos de autobús con panel de administración, pagos en MXN (Stripe) y persistencia de datos.

---

## 🌟 Características Principales

### Para Clientes
- ✅ **Búsqueda de viajes** por origen, destino y fecha
- ✅ **Selección visual de asientos** con mapa interactivo
- ✅ **Múltiples métodos de pago**: Tarjeta, OXXO, SPEI, efectivo
- ✅ **Registro simplificado**: Solo nombre, apellidos y documento (sin login)
- ✅ **Boleto digital**: Descarga PDF automática
- ✅ **Precios en MXN**: Todo en pesos mexicanos

### Para Administradores
- ✅ **Panel de administración completo** (`/admin.html`)
- ✅ **CRUD de rutas**: Crear, editar y eliminar rutas
- ✅ **CRUD de horarios**: Gestión completa de salidas
- ✅ **Persistencia automática**: Todas las rutas se guardan en disco
- ✅ **Estadísticas**: Ventas, ingresos y rutas más populares

### Sistema
- ✅ **Persistencia de datos**: Archivos JSON para rutas, boletos y reservas
- ✅ **8 rutas iniciales** incluidas por defecto
- ✅ **Ciudades dinámicas**: Se cargan automáticamente desde las rutas
- ✅ **API REST completa**: Documentada y lista para usar

---

## 🚀 Inicio Rápido

### 1. Instalar Dependencias
```bash
cd "e:\Free Lancer\Transporte app\Backend"
npm install
```

### 2. Configurar Stripe
Crear archivo `.env` en `Backend/`:
```env
STRIPE_SECRET_KEY=sk_test_tu_clave_secreta_aqui
PORT=4242
```

**Obtener clave de Stripe:**
1. Ir a [dashboard.stripe.com](https://dashboard.stripe.com)
2. Crear cuenta gratuita
3. Developers → API keys
4. Copiar "Secret key"

### 3. Iniciar Servidor
```bash
node server.js
```

### 4. Abrir en Navegador
- **Cliente**: http://localhost:4242
- **Admin**: http://localhost:4242/admin.html

---

## 📊 Rutas Incluidas

El sistema incluye **8 rutas bidireccionales**:

| Ruta | Distancia | Duración | Precio Base |
|------|-----------|----------|-------------|
| CDMX ↔ Guadalajara | 550 km | 7h 30m | $450 |
| CDMX ↔ Monterrey | 920 km | 9h 15m | $650 |
| CDMX ↔ Puebla | 130 km | 2h 30m | $180 |
| Guadalajara ↔ Monterrey | 830 km | 8h 45m | $600 |

**Total**: 28 horarios disponibles

---

## 💾 Sistema de Persistencia

**PROBLEMA RESUELTO**: Las rutas creadas en el admin panel ahora persisten permanentemente.

### ✅ Antes vs Ahora

| Característica | ❌ Antes | ✅ Ahora |
|----------------|----------|----------|
| Rutas disponibles | 3 hardcodeadas | 8 dinámicas + las que agregues |
| Crear desde admin | No persistía | Se guarda automáticamente |
| Reiniciar servidor | Pérdida de datos | Todos los datos persisten |
| Ciudades en selectores | Hardcodeadas en HTML | Cargadas dinámicamente desde rutas |

### Archivos de Datos

Ubicación: `Backend/data/`

- **routes.json**: Rutas y horarios
- **tickets.json**: Boletos vendidos
- **bookings.json**: Asientos reservados

Ver documentación completa: [SISTEMA_PERSISTENCIA.md](SISTEMA_PERSISTENCIA.md)

---

## 🎯 Cómo Usar

### Cliente (Compra de Boletos)

1. **Buscar viaje**: Seleccionar origen, destino y fecha
2. **Elegir horario**: Ver opciones con precios
3. **Seleccionar asiento**: Mapa interactivo (verde=disponible)
4. **Completar datos**: Nombre, apellidos, documento
5. **Pagar**: Tarjeta, OXXO, SPEI o efectivo
6. **Descargar boleto**: PDF con código QR

### Admin (Gestión de Rutas)

1. **Ir a**: http://localhost:4242/admin.html
2. **Crear ruta**: 
   - Origen: Cancún
   - Destino: CDMX
   - Duración: 24h 0m
   - Precio: $1200
3. **Agregar horarios**: Múltiples salidas diarias
4. **Guardar**: Se persiste automáticamente en `routes.json`
5. **Verificar**: La ruta aparece inmediatamente en compra de tickets

---

## 🔌 API REST

### Clientes

- `GET /api/routes` - Listar todas las rutas
- `GET /api/cities` - Obtener ciudades disponibles
- `GET /api/occupied-seats` - Asientos ocupados
- `POST /api/create-checkout-session` - Iniciar pago
- `GET /api/checkout/session` - Verificar pago

### Administración

- `POST /api/admin/routes` - Crear ruta
- `PUT /api/admin/routes/:routeKey` - Actualizar ruta
- `DELETE /api/admin/routes/:routeKey` - Eliminar ruta
- `POST /api/admin/routes/:routeKey/schedules` - Agregar horario
- `GET /api/admin/tickets` - Listar boletos vendidos
- `GET /api/admin/stats` - Estadísticas del sistema

---

## 📁 Estructura del Proyecto

```
Transporte app/
├── Backend/
│   ├── server.js                 # Servidor Express
│   ├── utils/
│   │   └── dataStore.js          # Sistema de persistencia
│   ├── data/                     # Datos persistidos (JSON)
│   │   ├── routes.json
│   │   ├── tickets.json
│   │   └── bookings.json
│   └── package.json
│
├── Frontend/
│   ├── index.html                # Compra de boletos
│   ├── admin.html                # Panel de administración
│   ├── script.js                 # Lógica cliente
│   ├── admin.js                  # Lógica admin
│   └── style.css
│
├── README.md                     # Este archivo
└── SISTEMA_PERSISTENCIA.md       # Documentación técnica
```

---

## 🧪 Probar Persistencia

```bash
# 1. Iniciar servidor
node server.js

# 2. Crear ruta en admin panel
http://localhost:4242/admin.html
# Crear "CDMX → Cancún"

# 3. Reiniciar servidor
Ctrl+C
node server.js

# 4. Verificar
cat Backend/data/routes.json
# Debe incluir "Ciudad de México-Cancún"

# 5. Verificar en frontend
http://localhost:4242
# El selector debe mostrar "Cancún"
```

---

## 🛠️ Tecnologías

### Backend
- **Node.js** + **Express.js**
- **Stripe** (pagos)
- **File System** (persistencia JSON)

### Frontend
- **HTML5** + **Tailwind CSS**
- **Vanilla JavaScript**
- **Font Awesome** (iconos)
- **jsPDF** (generación de PDFs)

---

## 🐛 Solución de Problemas

### "Cannot find module 'stripe'"
```bash
cd Backend
npm install
```

### "STRIPE_SECRET_KEY is undefined"
```bash
# Crear .env en Backend/
echo "STRIPE_SECRET_KEY=sk_test_tu_clave" > .env
```

### "Port 4242 already in use"
```bash
# Cambiar puerto en .env
echo "PORT=3000" >> .env
```

### Las ciudades no aparecen
```bash
# Verificar en consola del navegador (F12)
# Debe mostrar: "✅ Ciudades cargadas desde el backend"
```

---

## 📦 Despliegue a Producción

### Preparación
1. **Cambiar a clave live de Stripe**: `sk_live_...`
2. **Migrar a base de datos**: MongoDB o PostgreSQL
3. **Habilitar HTTPS**: Let's Encrypt
4. **Configurar CORS**: Restringir a tu dominio

### Plataformas Recomendadas
- **Heroku** (fácil, gratis)
- **DigitalOcean** (VPS económico)
- **Railway** (backend + DB integrado)

---

## 📝 Próximas Características

- [ ] Autenticación de administrador
- [ ] Búsqueda de boletos
- [ ] Notificaciones email/SMS
- [ ] Descuentos y promociones
- [ ] Migración a MongoDB

---

## 📄 Documentación Adicional

- [Sistema de Persistencia](SISTEMA_PERSISTENCIA.md) - Documentación técnica completa
- [Stripe Docs](https://stripe.com/docs) - Documentación de pagos
- [Express Guide](https://expressjs.com) - Guía de Express.js

---

## 🎉 ¡Gracias por usar TransBus!

**¡Buen viaje! 🚌✨**
