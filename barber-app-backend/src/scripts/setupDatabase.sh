#!/bin/bash

# Script de configuración de base de datos PostgreSQL
# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Configuración de Base de Datos PostgreSQL${NC}\n"

# Paso 1: Verificar si PostgreSQL está instalado
echo -e "${YELLOW}Paso 1: Verificando PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL no está instalado${NC}"
    echo "Instala PostgreSQL con: brew install postgresql@14"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL está instalado${NC}\n"

# Paso 2: Verificar si PostgreSQL está corriendo
echo -e "${YELLOW}Paso 2: Verificando si PostgreSQL está corriendo...${NC}"
if pg_isready &> /dev/null; then
    echo -e "${GREEN}✅ PostgreSQL está corriendo${NC}\n"
else
    echo -e "${YELLOW}⚠️  PostgreSQL no está corriendo${NC}"
    echo "Iniciando PostgreSQL..."
    
    # Intentar iniciar con Homebrew (macOS)
    if command -v brew &> /dev/null; then
        brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null
        sleep 2
        
        if pg_isready &> /dev/null; then
            echo -e "${GREEN}✅ PostgreSQL iniciado${NC}\n"
        else
            echo -e "${RED}❌ No se pudo iniciar PostgreSQL automáticamente${NC}"
            echo "Por favor, inicia PostgreSQL manualmente:"
            echo "  macOS: brew services start postgresql@14"
            echo "  Linux: sudo systemctl start postgresql"
            exit 1
        fi
    else
        echo -e "${RED}❌ Por favor, inicia PostgreSQL manualmente${NC}"
        exit 1
    fi
fi

# Paso 3: Crear base de datos
echo -e "${YELLOW}Paso 3: Creando base de datos 'barberapp'...${NC}"

# Intentar crear la base de datos
if createdb barberapp 2>/dev/null; then
    echo -e "${GREEN}✅ Base de datos 'barberapp' creada${NC}\n"
elif psql -lqt | cut -d \| -f 1 | grep -qw barberapp; then
    echo -e "${YELLOW}⚠️  La base de datos 'barberapp' ya existe${NC}\n"
else
    echo -e "${RED}❌ Error al crear la base de datos${NC}"
    echo "Por favor, créala manualmente:"
    echo "  psql -U postgres -c 'CREATE DATABASE barberapp;'"
    exit 1
fi

# Paso 4: Crear extensión UUID
echo -e "${YELLOW}Paso 4: Creando extensión UUID...${NC}"
psql -d barberapp -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Extensión UUID creada${NC}\n"
else
    echo -e "${YELLOW}⚠️  No se pudo crear la extensión UUID (puede que ya exista)${NC}\n"
fi

# Paso 5: Verificar archivo .env
echo -e "${YELLOW}Paso 5: Verificando configuración...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Archivo .env no existe, creando desde env.example...${NC}"
    cp env.example .env
    echo -e "${GREEN}✅ Archivo .env creado${NC}"
fi

# Detectar y actualizar usuario de PostgreSQL
echo -e "${YELLOW}Actualizando usuario de PostgreSQL en .env...${NC}"
CURRENT_USER=$(whoami)
if [ -f .env ]; then
    # Actualizar DB_USER con el usuario actual del sistema
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - usar el usuario actual
        sed -i '' "s/^DB_USER=.*/DB_USER=$CURRENT_USER/" .env
        # Asegurar que DB_PASSWORD esté vacío si no se ha configurado
        sed -i '' "s/^DB_PASSWORD=tu_contraseña_aqui/DB_PASSWORD=/" .env
        echo -e "${GREEN}✅ Usuario actualizado a: $CURRENT_USER${NC}"
    else
        # Linux
        sed -i "s/^DB_USER=.*/DB_USER=$CURRENT_USER/" .env
        sed -i "s/^DB_PASSWORD=tu_contraseña_aqui/DB_PASSWORD=/" .env
        echo -e "${GREEN}✅ Usuario actualizado a: $CURRENT_USER${NC}"
    fi
fi
echo ""

# Paso 6: Inicializar tablas
echo -e "${YELLOW}Paso 6: Creando tablas...${NC}"
echo "Ejecutando script de inicialización..."
echo ""

# Obtener el directorio donde está el script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# El script está en src/scripts/, el proyecto está 2 niveles arriba
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Cambiar al directorio raíz del proyecto
cd "$PROJECT_ROOT"

# Verificar que estamos en el lugar correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: No se encontró package.json. Asegúrate de ejecutar desde barber-app-backend${NC}"
    exit 1
fi

node src/scripts/initDatabase.js

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 ¡Base de datos configurada exitosamente!${NC}"
    echo ""
    echo "Puedes ahora iniciar el servidor con:"
    echo -e "${GREEN}npm run dev${NC}"
else
    echo ""
    echo -e "${RED}❌ Error al crear las tablas${NC}"
    echo "Revisa los mensajes de error arriba"
    exit 1
fi
