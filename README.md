# 🚌 TransBus - Sistema de Reserva de Asientos de Transporte

Una aplicación web completa para la compra de boletos de transporte con selección visual de asientos, sistema de pagos en línea y generación de boletos PDF.

## ✨ Características

- **🎯 Sin registro necesario**: Los usuarios pueden comprar boletos sin crear cuenta
- **🗺️ Selección visual de asientos**: Mapa interactivo del autobús
- **💳 Pagos seguros**: Integración con Stripe para pagos en línea
- **📱 Diseño responsive**: Funciona perfectamente en móviles y desktop
- **📄 Boletos PDF**: Generación automática de boletos descargables
- **🕐 Múltiples horarios**: Sistema de horarios y rutas predefinidas
- **✅ Validación en tiempo real**: Verificación de disponibilidad de asientos

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js (v16 o superior)
- npm o yarn
- Cuenta de Stripe (para pagos)

### 1. Clonar y configurar

```bash
# Navegar al directorio del proyecto
cd "e:\Free Lancer\Transporte app"

# Instalar dependencias del backend
cd Backend
npm install

# Configurar variables de entorno
cp .env.example .env
```

### 2. Configurar Stripe

1. Crear una cuenta en [Stripe](https://stripe.com)
2. Obtener las claves API (modo test para desarrollo)
3. Editar el archivo `.env` con tus claves:

```env
STRIPE_SECRET_KEY=sk_test_tu_clave_secreta_aqui
STRIPE_PUBLISHABLE_KEY=pk_test_tu_clave_publica_aqui
```

### 3. Ejecutar la aplicación

```bash
# Desde el directorio Backend
npm start
```

La aplicación estará disponible en: `http://localhost:4242`

## 🎮 Uso de la Aplicación

### Para Usuarios

1. **Seleccionar Ruta**: Elegir origen, destino y fecha
2. **Buscar Viajes**: Ver horarios disponibles y seleccionar uno
3. **Elegir Asiento**: Usar el mapa visual para seleccionar asiento
4. **Datos del Pasajero**: Completar información personal
5. **Pagar**: Proceso seguro con Stripe
6. **Descargar Boleto**: Obtener boleto PDF después del pago

### Rutas Disponibles

- Ciudad de México ↔ Guadalajara (7h 30m, desde $25 USD)
- Ciudad de México ↔ Monterrey (9h 15m, desde $35 USD)
- Guadalajara → Ciudad de México (7h 30m, desde $25 USD)

## 🛠️ Estructura del Proyecto

```
TransBus/
├── Backend/
│   ├── server.js          # Servidor Express principal
│   ├── package.json       # Dependencias del backend
│   ├── .env.example      # Variables de entorno de ejemplo
│   └── .env              # Variables de entorno (crear)
└── Frontend/
    ├── index.html        # Página principal
    ├── script.js         # Lógica del frontend
    └── style.css         # Estilos personalizados
```

## 🔧 API Endpoints

### Públicos
- `GET /api/health` - Estado del servidor
- `GET /api/routes` - Rutas disponibles
- `GET /api/occupied-seats` - Asientos ocupados por ruta
- `POST /api/create-checkout-session` - Crear sesión de pago
- `GET /api/checkout/session` - Verificar pago

### Administrativos
- `GET /api/admin/tickets` - Listar todos los boletos
- `GET /api/admin/stats` - Estadísticas de ventas

## 💡 Funcionalidades Técnicas

### Frontend
- **Vanilla JavaScript** con ES6+
- **Tailwind CSS** para estilos
- **Font Awesome** para iconos
- **jsPDF** para generación de PDFs
- **Responsive Design** móvil-first

### Backend
- **Express.js** como servidor web
- **Stripe** para procesamiento de pagos
- **CORS** habilitado para desarrollo
- **ES Modules** para código moderno
- **Manejo de errores** robusto

## 🔒 Seguridad

- Validación de datos en frontend y backend
- Verificación de pagos con Stripe webhooks
- Sanitización de inputs
- Manejo seguro de variables de entorno
- Verificación de disponibilidad en tiempo real

## 📈 Expansión Futura

### Próximas Características
- Base de datos persistente (PostgreSQL/MongoDB)
- Sistema de usuarios y historial
- Notificaciones por email/SMS
- Panel de administración completo
- API REST documentada
- Múltiples métodos de pago
- Sistema de descuentos y promociones
- Integración con sistemas de transporte

### Escalabilidad
- Microservicios
- Cache con Redis
- Load balancing
- CDN para assets estáticos
- Monitoring y logging

## 🐛 Solución de Problemas

### Error: "Stripe key not found"
- Verificar que el archivo `.env` existe y tiene las claves correctas
- Reiniciar el servidor después de cambiar `.env`

### Error: "Asiento no disponible"
- Los asientos se marcan como ocupados después del pago
- Refrescar la página para ver estado actualizado

### Problemas de CORS
- Verificar que el frontend se sirve desde el mismo puerto que el backend
- En producción, configurar CORS apropiadamente

## 📞 Soporte

Para soporte técnico o consultas:
- Email: soporte@transbus.com
- Teléfono: 1-800-TRANSBUS

## 📄 Licencia

Este proyecto está licenciado bajo la MIT License.

---

**¡Gracias por usar TransBus! 🚌**