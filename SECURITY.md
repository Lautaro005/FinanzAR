# Política de Seguridad

Gracias por ayudar a que FinanzAR sea más seguro. Esta página explica qué versiones reciben correcciones, cómo reportar una vulnerabilidad y qué podés esperar después de hacerlo.

## Versiones soportadas

FinanzAR está en beta pública y se despliega de forma continua en [finanzar-delta.vercel.app](https://finanzar-delta.vercel.app). Solo la versión en producción (la última del [Changelog](https://finanzar-delta.vercel.app/app/changelog)) recibe correcciones de seguridad.

| Versión | Soportada |
|---|---|
| Última publicada (`0.4.x`) | ✅ |
| Anteriores | ❌ |

## Cómo reportar una vulnerabilidad

**No abras un issue público** para reportar problemas de seguridad.

Usá el reporte privado de GitHub: pestaña **Security → Report a vulnerability** de este repositorio ([enlace directo](https://github.com/Lautaro005/FinanzAR/security/advisories/new)). El reporte queda visible solo para quienes mantienen el proyecto.

Para que podamos reproducirlo rápido, incluí en lo posible:

- Descripción del problema y su impacto (qué puede hacer un atacante).
- Pasos para reproducirlo, URL o endpoint afectado (por ejemplo `/api/auth/login`).
- Prueba de concepto, capturas o requests de ejemplo.
- Navegador, dispositivo o versión donde lo observaste.

## Qué podés esperar

- **Acuse de recibo:** dentro de las 72 horas.
- **Evaluación inicial:** dentro de los 7 días, con una estimación de severidad.
- **Corrección:** según la severidad; las críticas se priorizan por sobre cualquier otro trabajo.
- **Crédito:** si querés, te mencionamos en el Changelog de la versión que incluya la corrección.

Te pedimos no divulgar públicamente el problema hasta que esté corregido o hayan pasado 90 días desde el reporte, lo que ocurra primero.

## Alcance

Dentro del alcance:

- La aplicación web y sus endpoints bajo `/api` (registro, login, sesiones, sincronización de portfolio, eliminación de cuenta).
- Manejo de cookies de sesión, hash de contraseñas y límites de intentos.
- Exposición de datos de otros usuarios o de claves de API guardadas en el dispositivo.
- XSS, CSRF, inyección SQL u otras fallas en el código de este repositorio.

Fuera del alcance:

- Las APIs públicas de terceros que consume la app (ArgentinaDatos, DolarAPI, CoinGecko, data912) y la exactitud de sus datos.
- Proveedores de IA externos (Groq, OpenRouter) y el uso que cada persona haga de sus propias claves.
- Ataques de denegación de servicio, fuerza bruta volumétrica o spam.
- Ingeniería social, acceso físico a dispositivos o hallazgos que requieran un navegador o sistema desactualizado sin soporte.
- Reportes automatizados sin una prueba de impacto concreta (headers faltantes, versiones de librerías, etc.).

## Puerto seguro

No vamos a tomar acciones legales contra quien investigue y reporte de buena fe siguiendo esta política: sin acceder, modificar ni borrar datos de otras personas más allá de lo mínimo necesario para demostrar el problema, y sin degradar el servicio para el resto de los usuarios.
