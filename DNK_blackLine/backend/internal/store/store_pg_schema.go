package store

import "context"

func InitSchema(db *PG) error {
	if db == nil {
		return nil
	}
	ctx := context.Background()
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT, role TEXT NOT NULL DEFAULT 'user', password_hash TEXT);`,
		`CREATE TABLE IF NOT EXISTS user_configs (user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data JSONB NOT NULL DEFAULT '{}');`,
		`CREATE TABLE IF NOT EXISTS profile_secrets (user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, profile_flag TEXT);`,
		`CREATE TABLE IF NOT EXISTS finance_configs (user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, role_fin_flag TEXT);`,
		`CREATE TABLE IF NOT EXISTS retail_configs (user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, role_retail_flag TEXT);`,
		`CREATE TABLE IF NOT EXISTS tanks (id SERIAL PRIMARY KEY, name TEXT NOT NULL DEFAULT '', level DOUBLE PRECISION NOT NULL DEFAULT 0, owner_id INT REFERENCES users(id) ON DELETE SET NULL);`,
		`CREATE TABLE IF NOT EXISTS tank_events (id BIGSERIAL PRIMARY KEY, tank_id INT NOT NULL REFERENCES tanks(id) ON DELETE CASCADE, kind TEXT NOT NULL, value DOUBLE PRECISION, meta JSONB, ts_unix_ms BIGINT NOT NULL);`,
		`CREATE INDEX IF NOT EXISTS idx_tank_events_tank_ts ON tank_events(tank_id, ts_unix_ms DESC);`,
		`CREATE TABLE IF NOT EXISTS webhooks (id SERIAL PRIMARY KEY, url TEXT NOT NULL, owner_id INT, secret_token TEXT);`,
		`CREATE TABLE IF NOT EXISTS invoices (id SERIAL PRIMARY KEY, owner_id INT, number TEXT, supplier TEXT, date TEXT, amount DOUBLE PRECISION, vat DOUBLE PRECISION, deleted BOOLEAN NOT NULL DEFAULT FALSE);`,
		`CREATE TABLE IF NOT EXISTS audit_events (id SERIAL PRIMARY KEY, owner_id INT, kind TEXT, note TEXT, log_flag TEXT, ts_unix_ms BIGINT, extra JSONB);`,
	}
	for _, s := range stmts {
		if _, err := db.Pool.Exec(ctx, s); err != nil {
			return err
		}
	}
	return nil
}
