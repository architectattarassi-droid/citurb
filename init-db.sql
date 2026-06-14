-- Initialize CITURBAREA databases
-- This script runs automatically when the Docker container starts for the first time

-- Enable PostGIS extension for main database
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create dossiers database (for data sovereignty separation)
CREATE DATABASE citurbarea_dossiers;

-- Switch to dossiers database and enable PostGIS
\c citurbarea_dossiers;
CREATE EXTENSION IF NOT EXISTS postgis;

-- Switch back to main database
\c citurbarea;

-- Verify installation
SELECT 'PostGIS ' || PostGIS_Version() AS version;
SELECT 'PostgreSQL ' || version() AS version;
