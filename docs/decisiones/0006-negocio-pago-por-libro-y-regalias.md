# 0006 — Modelo de negocio: pago por libro y ledger de regalías

- **Fecha:** 2026-10-22
- **Estado:** Aceptada (implementación en el Hito 3)
- **Decide:** Erick / Editorial Huapango

## Contexto

La editorial quiere vender libros digitales y repartir un porcentaje a cada autor.

## Decisión

- **Pago único por libro** que da acceso completo y permanente en la cuenta del lector. Sin suscripción ni créditos.
- **Cobro:** Stripe Checkout alojado, en MXN (tarjeta y OXXO). El acceso se otorga solo desde un webhook idempotente.
- **Regalías:** cada venta escribe un **ledger de regalías** por autor; los libros con coautores se reparten. El pago se hace con **Stripe Connect** ("separate charges and transfers") **o**, si Connect no está disponible en México, con un **reporte mensual para SPEI**. El cálculo no depende del método de pago.

## Alternativas consideradas

- **Suscripción tipo Netflix:** descartada por el negocio.
- **Créditos** (como en el prototipo): descartado.

## Consecuencias / pendientes

- Confirmar con Stripe la disponibilidad de Connect para cuentas en México.
- Validar con el contador de la editorial las retenciones de ISR e IVA de las regalías.
- Falta el precio digital de cada libro (hoy se muestra "Precio por confirmar").
