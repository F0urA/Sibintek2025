CREATE TABLE IF NOT EXISTS "Users" (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'dispatcher', 'operator', 'pilot')),
    full_name VARCHAR(100),
    contact VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oil_depots (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    capacity FLOAT NOT NULL,
    current_stock FLOAT DEFAULT 0,
    created_by INTEGER REFERENCES "Users"(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tanks (
    id SERIAL PRIMARY KEY,
    depot_id INTEGER NOT NULL REFERENCES oil_depots(id) ON DELETE CASCADE,
    tank_number VARCHAR(50) NOT NULL,
    fuel_type VARCHAR(50) NOT NULL CHECK (fuel_type IN ('Hydrogen', 'Helium-3', 'Antimatter', 'Plasma')),
    capacity FLOAT NOT NULL,
    current_level FLOAT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS operations (
    id SERIAL PRIMARY KEY,
    operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('receive', 'dispatch')),
    depot_id INTEGER NOT NULL REFERENCES oil_depots(id),
    tank_id INTEGER NOT NULL REFERENCES tanks(id),
    fuel_type VARCHAR(50),
    volume FLOAT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source_destination VARCHAR(200),
    transport_type VARCHAR(20) CHECK (transport_type IN ('shuttle', 'spaceship')),
    operator_id INTEGER REFERENCES "Users"(id),
    notes TEXT,
    document_reference VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS trucks (
    id SERIAL PRIMARY KEY,
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    capacity FLOAT NOT NULL,
    fuel_type VARCHAR(50),
    driver_id INTEGER REFERENCES "Users"(id),
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'in_transit', 'maintenance'))
);

CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    truck_id INTEGER NOT NULL REFERENCES trucks(id),
    driver_id INTEGER NOT NULL REFERENCES "Users"(id),
    depot_from INTEGER REFERENCES oil_depots(id),
    depot_to INTEGER REFERENCES oil_depots(id),
    azs_destination VARCHAR(100),
    fuel_type VARCHAR(50),
    volume FLOAT,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    departure_time TIMESTAMP,
    arrival_time TIMESTAMP,
    gps_coordinates TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_operations_depot ON operations(depot_id);
CREATE INDEX IF NOT EXISTS idx_operations_timestamp ON operations(timestamp);
CREATE INDEX IF NOT EXISTS idx_routes_driver ON routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);

INSERT INTO "Users" (username, password_hash, role, full_name, contact)
VALUES
    ('admin', '$2a$10$bNhGxxutVwT64JZipdb.2eI0L3L1XktdCgPzk9.G1oT8CzhvoFb1y', 'admin', 'Admin User', '+79991234567')
ON CONFLICT (username) DO NOTHING;

INSERT INTO oil_depots (name, location, capacity, created_by)
VALUES
    ('Space Station Alpha', 'Orbit Sector A-7', 5000.0, 1)
ON CONFLICT DO NOTHING;

INSERT INTO tanks (depot_id, tank_number, fuel_type, capacity)
VALUES
    (1, 'T-001', 'Hydrogen', 500.0),
    (1, 'T-002', 'Helium-3', 500.0)
ON CONFLICT DO NOTHING;

INSERT INTO trucks (plate_number, capacity, fuel_type, status)
VALUES
    ('SX-12347', 30.0, 'Plasma', 'available')
ON CONFLICT (plate_number) DO NOTHING;
