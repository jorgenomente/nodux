# Matriz RLS (viva)

Este documento define permisos por rol y entidad. Debe mantenerse actualizado con cualquier cambio de RLS.

## Convenciones

- Roles: SA (Superadmin), OA (Org Admin), ST (Staff).
- Acciones: `read`, `insert`, `update`, `delete`.
- Siempre se valida `org_id` y `branch_id` según corresponda.

## Matriz (MVP)

> Completar con tablas reales. Formato sugerido:

| Entidad       | SA                        | OA                        | ST            | Notas                        |
| ------------- | ------------------------- | ------------------------- | ------------- | ---------------------------- |
| `products`    | read/insert/update/delete | read/insert/update/delete | read (lookup) | ST solo si módulo habilitado |
| `stock_items` | read/insert/update/delete | read/insert/update/delete | read (lookup) | ST sin ajustes               |

## Policies (resumen)

> Resumir políticas clave por entidad para trazabilidad.
