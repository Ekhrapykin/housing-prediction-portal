#!/bin/sh
# Runs once, on an empty data volume (official postgres image, docker-entrypoint-initdb.d).
# One database (POSTGRES_DB), one schema per service, each owned by its own role.
# To change a password later: ALTER ROLE ... PASSWORD ..., or wipe the volume.
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v db="$POSTGRES_DB" \
  -v estimator_pw="$ESTIMATOR_DB_PASSWORD" \
  -v market_pw="$MARKET_DB_PASSWORD" <<'SQL'
CREATE ROLE estimator LOGIN PASSWORD :'estimator_pw';
CREATE ROLE market LOGIN PASSWORD :'market_pw';

REVOKE ALL ON DATABASE :"db" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db" TO estimator, market;

-- The owner can use and create in its schema; nobody else gets any grant on it.
CREATE SCHEMA estimator AUTHORIZATION estimator;
CREATE SCHEMA market AUTHORIZATION market;

-- Unqualified table names resolve to the role's own schema (SQLAlchemy and Hibernate rely on this or on default_schema).
ALTER ROLE estimator SET search_path = estimator;
ALTER ROLE market SET search_path = market;
SQL
