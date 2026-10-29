package store

import (
	"context"
	"encoding/json"

	"backend/internal/models"
)

func (p *PG) GetUserByID(id int) *models.User {
	var u models.User
	err := p.Pool.QueryRow(context.Background(), `SELECT id,email,role FROM users WHERE id=$1`, id).
		Scan(&u.ID, &u.Email, &u.Role)
	if err != nil {
		return nil
	}
	return &u
}
func (p *PG) GetTankByID(id int) *models.Tank {
	var t models.Tank
	err := p.Pool.QueryRow(context.Background(),
		`SELECT id, name, level, owner_id FROM tanks WHERE id=$1`, id).
		Scan(&t.ID, &t.Name, &t.Level, &t.OwnerID)
	if err != nil {
		return nil
	}
	return &t
}
func (p *PG) PutProfileFlag(uid int, v string) error {
	_, err := p.Pool.Exec(context.Background(),
		`INSERT INTO profile_secrets(user_id, profile_flag)
         VALUES ($1,$2)
         ON CONFLICT (user_id) DO UPDATE SET profile_flag = EXCLUDED.profile_flag`,
		uid, v)
	return err
}
func (p *PG) GetProfileFlag(uid int) (string, bool) {
	var v string
	if err := p.Pool.QueryRow(context.Background(),
		`SELECT profile_flag FROM profile_secrets WHERE user_id=$1`, uid).Scan(&v); err != nil {
		return "", false
	}
	return v, true
}
func (p *PG) GetRoleFinFlag(uid int) string {
	var v string
	if err := p.Pool.QueryRow(context.Background(),
		`SELECT role_fin_flag FROM finance_configs WHERE user_id=$1`, uid).Scan(&v); err != nil {
		return ""
	}
	return v
}

func (p *PG) GetRoleRetailFlag(uid int) string {
	var v string
	if err := p.Pool.QueryRow(context.Background(),
		`SELECT role_retail_flag FROM retail_configs WHERE user_id=$1`, uid).Scan(&v); err != nil {
		return ""
	}
	return v
}
func (p *PG) CreateUser(email, name, role, passHash string) *models.User {
	var u models.User
	err := p.Pool.QueryRow(context.Background(),
		`INSERT INTO users(email, name, role, password_hash)
         VALUES ($1,$2,$3,$4)
         RETURNING id, email, name, role`,
		email, name, role, passHash).
		Scan(&u.ID, &u.Email, &u.Name, &u.Role)
	if err != nil {
		return nil
	}
	return &u
}

func (p *PG) ListWebhooksByOwner(ownerID int) []*models.Webhook {
	rows, err := p.Pool.Query(context.Background(),
		`SELECT id,url,owner_id,secret_token FROM webhooks WHERE owner_id=$1 ORDER BY id DESC`, ownerID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var out []*models.Webhook
	for rows.Next() {
		var w models.Webhook
		if err := rows.Scan(&w.ID, &w.URL, &w.OwnerID, &w.SecretToken); err == nil {
			out = append(out, &w)
		}
	}
	return out
}

func (p *PG) GetUserByEmail(email string) *models.User {
	var u models.User
	err := p.Pool.QueryRow(context.Background(),
		`SELECT id, email, name, role, password_hash FROM users WHERE email=$1`, email).
		Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.PasswordHash)
	if err != nil {
		return nil
	}
	return &u
}

func (p *PG) PutRoleFinFlag(uid int, v string) error {
	_, err := p.Pool.Exec(context.Background(),
		`INSERT INTO finance_configs(user_id, role_fin_flag)
         VALUES ($1,$2)
         ON CONFLICT (user_id) DO UPDATE SET role_fin_flag=EXCLUDED.role_fin_flag`,
		uid, v)
	return err
}

func (p *PG) PutRoleRetailFlag(uid int, v string) error {
	_, err := p.Pool.Exec(context.Background(),
		`INSERT INTO retail_configs(user_id, role_retail_flag)
         VALUES ($1,$2)
         ON CONFLICT (user_id) DO UPDATE SET role_retail_flag=EXCLUDED.role_retail_flag`,
		uid, v)
	return err
}

func (p *PG) UpsertWebhook(wb *models.Webhook) *models.Webhook {
	if err := p.Pool.QueryRow(context.Background(),
		`INSERT INTO webhooks(url, owner_id, secret_token) VALUES ($1,$2,$3) RETURNING id`,
		wb.URL, wb.OwnerID, wb.SecretToken).Scan(&wb.ID); err != nil {
		return nil
	}
	return wb
}
func (p *PG) UpdateWebhook(id int, newURL string, newOwner int) *models.Webhook {
	_, err := p.Pool.Exec(context.Background(),
		`UPDATE webhooks SET url=COALESCE(NULLIF($2,''),url), owner_id=COALESCE(NULLIF($3,0),owner_id) WHERE id=$1`,
		id, newURL, newOwner)
	if err != nil {
		return nil
	}
	return p.GetWebhook(id)
}
func (p *PG) GetWebhook(id int) *models.Webhook {
	var w models.Webhook
	if err := p.Pool.QueryRow(context.Background(),
		`SELECT id,url,owner_id,secret_token FROM webhooks WHERE id=$1`, id).
		Scan(&w.ID, &w.URL, &w.OwnerID, &w.SecretToken); err != nil {
		return nil
	}
	return &w
}

func (p *PG) EnsureTankForOwner(ownerID int) *models.Tank {
	var t models.Tank
	err := p.Pool.QueryRow(context.Background(),
		`SELECT id,name,level,owner_id FROM tanks WHERE owner_id=$1 LIMIT 1`, ownerID).
		Scan(&t.ID, &t.Name, &t.Level, &t.OwnerID)
	if err == nil {
		return &t
	}
	if err = p.Pool.QueryRow(context.Background(),
		`INSERT INTO tanks(name,level,owner_id) VALUES ($1,$2,$3) RETURNING id,name,level,owner_id`,
		"Tank", 50.0, ownerID).Scan(&t.ID, &t.Name, &t.Level, &t.OwnerID); err != nil {
		return nil
	}
	return &t
}
func (p *PG) AppendTankEvent(tid int, kind string, value float64, meta map[string]any, nowMs int64) *models.TankEvent {
	b, _ := json.Marshal(meta)
	if _, err := p.Pool.Exec(context.Background(),
		`INSERT INTO tank_events(tank_id,kind,value,meta,ts_unix_ms) VALUES ($1,$2,$3,$4,$5)`,
		tid, kind, value, b, nowMs); err != nil {
		return nil
	}
	return &models.TankEvent{TankID: tid, Kind: kind, Value: value, Ts: nowMs, Meta: meta}
}
func (p *PG) ListTankEvents(tid int, sinceMs int64, limit int) []*models.TankEvent {
	rows, err := p.Pool.Query(context.Background(),
		`SELECT id,kind,value,meta,ts_unix_ms FROM tank_events
		 WHERE tank_id=$1 AND ts_unix_ms >= $2 ORDER BY ts_unix_ms DESC LIMIT $3`,
		tid, sinceMs, limit)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var out []*models.TankEvent
	for rows.Next() {
		var e models.TankEvent
		var meta []byte
		if err := rows.Scan(&e.ID, &e.Kind, &e.Value, &meta, &e.Ts); err == nil {
			_ = json.Unmarshal(meta, &e.Meta)
			e.TankID = tid
			out = append(out, &e)
		}
	}
	return out
}
