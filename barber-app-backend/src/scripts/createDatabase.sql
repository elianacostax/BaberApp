-- Script SQL para crear la base de datos PostgreSQL
-- Ejecutar con: psql -U postgres -f src/scripts/createDatabase.sql

-- Crear base de datos si no existe
SELECT 'CREATE DATABASE barberapp'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'barberapp')\gexec

-- Conectar a la base de datos
\c barberapp

-- Crear extensión para UUID (si no existe)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Mostrar mensaje de confirmación
SELECT 'Base de datos barberapp creada exitosamente' AS mensaje;
