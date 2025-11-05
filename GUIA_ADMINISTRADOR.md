# 🚌 TransBus - Guía de Administración

## 📋 Resumen de Cambios Implementados

### ✅ Sistema de Registro Simplificado
**Antes:** Email y teléfono obligatorios  
**Ahora:** Solo requiere:
- ✔️ Nombre(s)
- ✔️ Apellidos
- ✔️ Documento de Identidad (INE/Pasaporte/CURP/Cédula)
- 📧 Email (opcional) - para boleto electrónico
- 📱 Teléfono (opcional) - para notificaciones

### 💳 Métodos de Pago Disponibles (Moneda: MXN - Pesos Mexicanos)

1. **💳 Tarjeta de Crédito/Débito**
   - Visa, Mastercard, American Express
   - Pago instantáneo
   
2. **🏪 OXXO**
   - Genera un voucher para pagar en cualquier OXXO
   - Válido por 3 días
   - Confirmación en 24-48 horas
   
3. **🏦 SPEI (Transferencia Bancaria)**
   - Transferencia interbancaria
   - Confirmación inmediata
   
4. **💵 Efectivo**
   - Pago en tiendas OXXO
   - Voucher imprimible

### 🎯 Precios Actualizados (MXN)

| Ruta | Ejecutivo | Primera Clase |
|------|-----------|---------------|
| CDMX → Guadalajara | $450 | $550 |
| CDMX → Monterrey | $650 | $750 |
| Guadalajara → CDMX | $450 | $550 |

---

## 🔧 Panel de Administración Completo

**URL:** http://localhost:4242/admin.html

### 📊 Dashboard Principal
- **Boletos Vendidos:** Total de reservas realizadas
- **Ingresos Totales:** Suma de todos los pagos confirmados
- **Rutas Activas:** Número de rutas configuradas
- **Precio Promedio:** Ingreso promedio por boleto

### 🛣️ Gestión de Rutas

#### ➕ Crear Nueva Ruta
1. Click en **"Nueva Ruta"**
2. Completar información:
   - Ciudad de Origen (ej: "Puebla")
   - Ciudad de Destino (ej: "Cancún")
   - Duración (ej: "12h 30m")
   - Distancia (ej: "1,400 km")
   - Precio Base en MXN (ej: 850.00)
3. Agregar horarios:
   - Hora de salida
   - Hora de llegada
   - Tipo de servicio (Ejecutivo/Primera Clase/Lujo)
   - Precio específico
4. Click en **"Guardar Ruta"**

#### ✏️ Editar Ruta Existente
1. En la tarjeta de la ruta, click en el ícono **✏️ (editar)**
2. Modificar los campos necesarios
3. Ajustar horarios existentes o agregar nuevos
4. Click en **"Guardar Ruta"** para aplicar cambios

#### 🗑️ Eliminar Ruta
1. En la tarjeta de la ruta, click en el ícono **🗑️ (eliminar)**
2. Confirmar la eliminación
3. ⚠️ Esta acción no afecta boletos ya vendidos

### ⏰ Gestión de Horarios

#### Ver Horarios de una Ruta
1. Ir a la pestaña **"Horarios"**
2. Seleccionar la ruta en el dropdown
3. Ver lista completa de horarios

#### ➕ Agregar Nuevo Horario
1. Seleccionar ruta
2. Click en **"Nuevo Horario"**
3. Ingresar datos cuando se solicite:
   - Hora de salida (formato 24h: ej: 14:30)
   - Hora de llegada (formato 24h: ej: 22:00)
   - Tipo de servicio
   - Precio en MXN
4. Confirmar

#### ✏️ Editar Horario
1. En la lista de horarios, click en **✏️ (editar)**
2. Modificar los datos solicitados
3. Confirmar cambios

#### 🗑️ Eliminar Horario
1. Click en **🗑️ (eliminar)** junto al horario
2. Confirmar eliminación
3. ⚠️ No afecta boletos vendidos para ese horario

### 🎫 Boletos Vendidos

**Vista completa de todas las reservas:**
- Fecha de compra
- Nombre del pasajero
- Ruta reservada
- Número de asiento
- Horario y fecha del viaje
- Monto pagado
- Estado del pago

**Búsqueda:**
- Escribir en el campo de búsqueda para filtrar por:
  - Nombre del pasajero
  - Email
  - Ruta
  - Cualquier campo visible

### 📈 Reportes y Análisis

#### Ventas por Ruta
- Muestra qué rutas generan más ingresos
- Número de boletos vendidos por ruta
- Ingresos totales por ruta

#### Ventas Recientes
- Últimas 5 transacciones
- Detalle de pasajero y ruta
- Monto de cada venta

#### Asientos Más Reservados
- TOP 5 de asientos más seleccionados
- Útil para identificar preferencias

#### Horarios Populares
- TOP 5 de horarios con más reservas
- Ayuda a planificar frecuencias

---

## 🔌 API Endpoints (Para Desarrollo)

### Rutas Públicas
```
GET  /api/routes                    → Obtener todas las rutas
GET  /api/occupied-seats            → Asientos ocupados (con params)
POST /api/create-checkout-session   → Crear sesión de pago
GET  /api/checkout/session          → Verificar pago
```

### Rutas de Administración
```
POST   /api/admin/routes                              → Crear ruta
PUT    /api/admin/routes/:routeKey                    → Actualizar ruta
DELETE /api/admin/routes/:routeKey                    → Eliminar ruta
POST   /api/admin/routes/:routeKey/schedules          → Agregar horario
PUT    /api/admin/routes/:routeKey/schedules/:id      → Editar horario
DELETE /api/admin/routes/:routeKey/schedules/:id      → Eliminar horario
GET    /api/admin/tickets                             → Lista de boletos
GET    /api/admin/stats                               → Estadísticas
```

---

## 🎨 Ejemplo de Uso: Agregar Nueva Ruta Completa

### Paso a Paso: Puebla → Cancún

1. **Abrir Admin Panel**
   ```
   http://localhost:4242/admin.html
   ```

2. **Click en "Nueva Ruta"**

3. **Llenar Formulario:**
   ```
   Ciudad de Origen: Puebla
   Ciudad de Destino: Cancún
   Duración: 18h 30m
   Distancia: 1,350 km
   Precio Base: 1,200.00
   ```

4. **Agregar Horarios:**
   
   **Horario 1:**
   ```
   Salida: 20:00
   Llegada: 14:30+1
   Tipo: Primera Clase
   Precio: 1,400.00
   ```
   
   **Horario 2:**
   ```
   Salida: 22:30
   Llegada: 17:00+1
   Tipo: Ejecutivo
   Precio: 1,200.00
   ```
   
   Click en "➕ Agregar Horario" para más horarios

5. **Guardar Ruta**

6. **Verificar:**
   - La ruta aparecerá inmediatamente en el listado
   - Estará disponible para venta en el sitio público
   - Los clientes podrán buscarla y reservar

---

## 🔒 Seguridad y Validación

### Validaciones Automáticas
- ✅ No permite asientos duplicados
- ✅ Verifica disponibilidad antes de pago
- ✅ Valida datos del pasajero
- ✅ Documenta identidad obligatoria
- ✅ Protección contra pagos duplicados

### Datos del Pasajero Guardados
- Nombre completo
- Tipo de documento (INE/Pasaporte/CURP/Cédula)
- Número de documento
- Email (si lo proporcionó)
- Teléfono (si lo proporcionó)
- Fecha y hora de compra
- Método de pago utilizado

---

## 📱 Flujo de Compra para el Cliente

1. **Búsqueda:**
   - Seleccionar origen
   - Seleccionar destino
   - Elegir fecha
   - Click en "Buscar Viajes"

2. **Selección de Horario:**
   - Ver horarios disponibles con precios
   - Click en el horario preferido

3. **Selección de Asiento:**
   - Mapa visual del autobús
   - Verde = Disponible
   - Rojo = Ocupado
   - Azul = Seleccionado
   - Click en asiento disponible

4. **Información del Pasajero:**
   - Ingresar nombre y apellidos
   - Seleccionar tipo de documento
   - Ingresar número de documento
   - Email y teléfono opcionales

5. **Método de Pago:**
   - Seleccionar: Tarjeta, OXXO, SPEI o Efectivo
   - Click en "Proceder al Pago Seguro"

6. **Confirmación:**
   - Redirige a Stripe
   - Completa el pago
   - Recibe confirmación
   - Descarga boleto en PDF

---

## 🚨 Solución de Problemas

### El botón "Buscar Viajes" no funciona
**Solución:** Verificar que el servidor esté corriendo:
```bash
cd "Backend"
node server.js
```

### No aparecen rutas en el admin
**Solución:** El sistema viene con 3 rutas precargadas. Recargar la página.

### Error al crear ruta
**Causa:** Ruta duplicada  
**Solución:** Use la función de editar en lugar de crear una nueva

### Los cambios no se ven en el sitio público
**Solución:** 
1. Recargar la página del sitio público (F5)
2. Las rutas se cargan automáticamente desde el backend

### Error "STRIPE_SECRET_KEY no configurada"
**Solución:** Verificar archivo `.env` en la carpeta Backend

---

## 📞 Soporte

Para cualquier duda o problema:
- Revisar esta documentación
- Verificar logs del servidor en la consola
- Revisar la consola del navegador (F12)

---

## 🎉 Características Destacadas

✨ **Sin necesidad de editar código**
✨ **Panel de administración intuitivo**
✨ **Métodos de pago locales mexicanos**
✨ **Precios en pesos mexicanos (MXN)**
✨ **Sistema simplificado sin registro**
✨ **Gestión completa en tiempo real**
✨ **Reportes y estadísticas automáticas**
✨ **Interfaz moderna y responsive**

---

**Versión:** 2.0  
**Fecha:** 4 de Noviembre de 2025  
**Sistema:** TransBus - Plataforma de Reserva de Boletos de Autobús
