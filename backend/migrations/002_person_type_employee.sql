-- Tipos de persona: Cliente, Visitante, Empleado (valores: client, visitor, employee).
-- Ejecutar una vez sobre la base existente. Añade 'employee' y migra 'resident' → 'employee'.
--
-- Alternativa (desde la carpeta backend, con .env cargado):
--   python scripts/add_persontype_employee.py

-- Si 'employee' ya existe en el enum, omite la siguiente línea (error duplicado).
ALTER TYPE persontype ADD VALUE 'employee';

UPDATE people SET person_type = 'employee'::persontype WHERE person_type::text = 'resident';
