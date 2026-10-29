package store

import (
	"backend/internal/config"
	"backend/internal/models"
	"backend/internal/util"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"
)

type Store struct {
	mu       sync.RWMutex
	cfg      *config.AppConfig
	pg       *PG
	Users    map[int]*models.User
	Tanks    map[int]*models.Tank
	Webhooks map[int]*models.Webhook
	Audit    map[int]*models.AuditEvent

	Invoices map[int]*models.Invoice
	Shifts   map[int]*models.Shift
	TankEv   map[int]*models.TankEvent

	nextIDs map[string]int
}

func New(cfg *config.AppConfig, pgdb *PG) (*Store, error) {
	_ = os.MkdirAll(cfg.DataDir, 0o755)
	s := &Store{
		cfg:      cfg,
		pg:       pgdb,
		Users:    map[int]*models.User{},
		Tanks:    map[int]*models.Tank{},
		Webhooks: map[int]*models.Webhook{},
		Audit:    map[int]*models.AuditEvent{},
		Invoices: map[int]*models.Invoice{},
		Shifts:   map[int]*models.Shift{},
		TankEv:   map[int]*models.TankEvent{},
		nextIDs:  map[string]int{"user": 1, "tank": 1, "webhook": 1, "audit": 1, "invoice": 1, "shift": 1, "te": 1},
	}
	if s.pg == nil {
		_ = s.load()
	}
	if len(s.Tanks) == 0 {
		s.createTank("Tank A", 75.2, 1)
		s.createTank("Tank B", 41.0, 1)
		_ = s.persist()
	}
	return s, nil
}

func (s *Store) dataFile(name string) string { return filepath.Join(s.cfg.DataDir, name) }

func (s *Store) load() error {
	_ = s.loadJSON("users.json", &s.Users)
	_ = s.loadJSON("tanks.json", &s.Tanks)
	_ = s.loadJSON("webhooks.json", &s.Webhooks)
	_ = s.loadJSON("audit.json", &s.Audit)
	_ = s.loadJSON("invoices.json", &s.Invoices)
	_ = s.loadJSON("shifts.json", &s.Shifts)
	_ = s.loadJSON("tank_events.json", &s.TankEv)
	_ = s.loadJSON("next.json", &s.nextIDs)
	return nil
}

func (s *Store) loadJSON(name string, v any) error {
	p := s.dataFile(name)
	b, err := os.ReadFile(p)
	if err != nil {
		return nil
	}
	return json.Unmarshal(b, v)
}

func (s *Store) persist() error {
	_ = s.saveJSON("users.json", s.Users)
	_ = s.saveJSON("tanks.json", s.Tanks)
	_ = s.saveJSON("webhooks.json", s.Webhooks)
	_ = s.saveJSON("audit.json", s.Audit)
	_ = s.saveJSON("invoices.json", s.Invoices)
	_ = s.saveJSON("shifts.json", s.Shifts)
	_ = s.saveJSON("tank_events.json", s.TankEv)
	_ = s.saveJSON("next.json", s.nextIDs)
	return nil
}

func (s *Store) saveJSON(name string, v any) error {
	b, _ := json.MarshalIndent(v, "", "  ")
	return os.WriteFile(s.dataFile(name), b, 0o644)
}

func (s *Store) AddUser(email, name, role, passHash string) *models.User {
	if s.pg != nil {
		return s.pg.CreateUser(email, name, role, passHash)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	id := s.nextIDs["user"]
	s.nextIDs["user"] = id + 1
	u := &models.User{ID: id, Email: email, Name: name, Role: role, PasswordHash: passHash}
	s.Users[id] = u
	_ = s.persist()
	return u
}

func (s *Store) CreateUser(email, password, role, name string) (*models.User, error) {
	if s.pg != nil {

		u := s.pg.CreateUser(email, name, role, util.HashPassword(password))
		if u == nil {
			return nil, errors.New("email exists or create failed")
		}
		return u, nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, u := range s.Users {
		if u.Email == email {
			return nil, errors.New("email exists")
		}
	}
	id := s.nextIDs["user"]
	s.nextIDs["user"] = id + 1
	u := &models.User{
		ID:           id,
		Email:        email,
		Name:         name,
		Role:         role,
		PasswordHash: util.HashPassword(password),
		Configs:      map[string]any{},
	}
	s.Users[id] = u
	_ = s.persist()
	return u, nil
}

func (s *Store) Auth(email, password string) *models.User {
	if s.pg != nil {
		u := s.pg.GetUserByEmail(email)
		if u != nil && u.PasswordHash == util.HashPassword(password) {
			return u
		}
		return nil
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	h := util.HashPassword(password)
	for _, u := range s.Users {
		if u.Email == email && u.PasswordHash == h {
			return u
		}
	}
	return nil
}

func (s *Store) UpdateUserProfileFlag(uid int, flag string) {
	if s.pg != nil {
		_ = s.pg.PutProfileFlag(uid, flag)
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if u := s.Users[uid]; u != nil {
		u.ProfileFlag = flag
		_ = s.persist()
	}
}
func (s *Store) ReadUserProfileFlag(uid int) string {
	if s.pg != nil {
		if v, ok := s.pg.GetProfileFlag(uid); ok {
			return v
		}
		return ""
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	if u := s.Users[uid]; u != nil {
		return u.ProfileFlag
	}
	return ""
}
func (s *Store) ReadUserFinFlag(uid int) string {
	if s.pg != nil {
		return s.pg.GetRoleFinFlag(uid)
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	if u := s.Users[uid]; u != nil && u.Configs != nil {
		if v, ok := u.Configs["role_fin_flag"].(string); ok {
			return v
		}
	}
	return ""
}

func (s *Store) createTank(name string, level float64, ownerID int) *models.Tank {
	id := s.nextIDs["tank"]
	s.nextIDs["tank"] = id + 1
	t := &models.Tank{ID: id, Name: name, Level: level, OwnerID: ownerID}
	s.Tanks[id] = t
	return t
}

func (s *Store) TankByID(id int) *models.Tank {
	if s.pg != nil {
		return s.pg.GetTankByID(id)
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.Tanks[id]
}

func (s *Store) UpdateWebhook(id int, newURL string, newOwner int) *models.Webhook {
	if s.pg != nil {
		return s.pg.UpdateWebhook(id, newURL, newOwner)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	wb := s.Webhooks[id]
	if wb == nil {
		return nil
	}
	if newURL != "" {
		wb.URL = newURL
	}
	if newOwner != 0 {
		wb.OwnerID = newOwner
	}
	_ = s.persist()
	return wb
}

func (s *Store) CloneWebhook(id int) *models.Webhook {
	s.mu.Lock()
	defer s.mu.Unlock()
	src := s.Webhooks[id]
	if src == nil {
		return nil
	}
	nid := s.nextIDs["webhook"]
	s.nextIDs["webhook"] = nid + 1
	cp := *src
	cp.ID = nid
	s.Webhooks[nid] = &cp
	_ = s.persist()
	return &cp
}

func (s *Store) UpsertWebhook(wb *models.Webhook) *models.Webhook {
	if s.pg != nil {
		return s.pg.UpsertWebhook(wb)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if wb.ID == 0 {
		id := s.nextIDs["webhook"]
		s.nextIDs["webhook"] = id + 1
		wb.ID = id
	}
	s.Webhooks[wb.ID] = wb
	_ = s.persist()
	return wb
}

func (s *Store) FindUserByEmail(email string) *models.User {
	if s.pg != nil {
		return s.pg.GetUserByEmail(email)
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, u := range s.Users {
		if u.Email == email {
			return u
		}
	}
	return nil
}

func (s *Store) GetUserByID(id int) *models.User {
	if s.pg != nil {
		return s.pg.GetUserByID(id)
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.Users[id]
}

func (s *Store) ReadUserConfigString(uid int, key string) string {
	if s.pg != nil {
		switch key {
		case "role_fin_flag":
			return s.pg.GetRoleFinFlag(uid)
		case "role_retail_flag":
			return s.pg.GetRoleRetailFlag(uid)
		}
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	if u := s.Users[uid]; u != nil && u.Configs != nil {
		if v, ok := u.Configs[key].(string); ok {
			return v
		}
	}
	return ""
}

func (s *Store) GetWebhookByID(id int) *models.Webhook {
	if s.pg != nil {
		return s.pg.GetWebhook(id)
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.Webhooks[id]
}
func (s *Store) AddAuditEvent(ownerID int, kind, note, logFlag string, extra map[string]any, tsMs int64) *models.AuditEvent {
	s.mu.Lock()
	defer s.mu.Unlock()
	id := s.nextIDs["audit"]
	s.nextIDs["audit"] = id + 1
	ev := &models.AuditEvent{
		ID: id, OwnerID: ownerID, Kind: kind, Note: note,
		LogFlag: logFlag, Ts: tsMs, Extra: extra,
	}
	s.Audit[id] = ev
	_ = s.persist()
	return ev
}

func (s *Store) ListAuditByOwner(ownerID int, sinceMs int64, limit int) []*models.AuditEvent {
	s.mu.RLock()
	defer s.mu.RUnlock()
	res := make([]*models.AuditEvent, 0, limit)
	for _, ev := range s.Audit {
		if ev.OwnerID == ownerID && ev.Ts >= sinceMs {
			res = append(res, ev)
		}
	}

	if limit > 0 && len(res) > limit {
		res = res[:limit]
	}
	return res
}
func (s *Store) EnsureTankForOwner(ownerID int) *models.Tank {
	if s.pg != nil {
		return s.pg.EnsureTankForOwner(ownerID)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, t := range s.Tanks {
		if t.OwnerID == ownerID {
			return t
		}
	}
	id := s.nextIDs["tank"]
	s.nextIDs["tank"] = id + 1
	t := &models.Tank{ID: id, Name: fmt.Sprintf("Tank %d", id), Level: 50.0, OwnerID: ownerID}
	s.Tanks[id] = t
	_ = s.persist()
	return t
}
func (s *Store) UpdateUserConfig(uid int, key string, val any) {
	if s.pg != nil {
		switch key {
		case "role_fin_flag":
			if v, ok := val.(string); ok {
				s.pg.PutRoleFinFlag(uid, v)
				return
			}
		case "role_retail_flag":
			if v, ok := val.(string); ok {
				s.pg.PutRoleRetailFlag(uid, v)
				return
			}
		}

	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if u := s.Users[uid]; u != nil {
		if u.Configs == nil {
			u.Configs = map[string]any{}
		}
		u.Configs[key] = val
		_ = s.persist()
	}
}

func (s *Store) AddInvoice(inv *models.Invoice) *models.Invoice {
	s.mu.Lock()
	defer s.mu.Unlock()
	if inv.ID == 0 {
		id := s.nextIDs["invoice"]
		s.nextIDs["invoice"] = id + 1
		inv.ID = id
	}
	s.Invoices[inv.ID] = inv
	_ = s.persist()
	return inv
}
func (s *Store) GetInvoice(id int) *models.Invoice {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.Invoices[id]
}
func (s *Store) ListInvoicesByOwner(ownerID int) []*models.Invoice {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := []*models.Invoice{}
	for _, v := range s.Invoices {
		if v.OwnerID == ownerID && !v.Deleted {
			out = append(out, v)
		}
	}
	return out
}
func (s *Store) DeleteInvoice(id, ownerID int) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	inv := s.Invoices[id]
	if inv == nil || inv.OwnerID != ownerID {
		return false
	}
	inv.Deleted = true
	_ = s.persist()
	return true
}

func (s *Store) ImportInvoicesCSV(ownerID int, r io.Reader) (int, error) {
	cr := csv.NewReader(r)
	cr.TrimLeadingSpace = true
	records, err := cr.ReadAll()
	if err != nil {
		return 0, err
	}
	if len(records) == 0 {
		return 0, errors.New("empty csv")
	}
	n := 0
	for i, row := range records {
		if i == 0 && len(row) >= 3 && (row[0] == "number" || row[0] == "Number") {
			continue
		}
		if len(row) < 3 {
			continue
		}
		inv := &models.Invoice{
			ID: 0, OwnerID: ownerID,
			Number:   row[0],
			Supplier: row[1],
			Date:     row[2],
		}
		if len(row) >= 4 {
			inv.Amount = util.ParseFloat(row[3])
		}
		if len(row) >= 5 {
			inv.Vat = util.ParseFloat(row[4])
		}
		s.AddInvoice(inv)
		n++
	}
	return n, nil
}
func (s *Store) OpenShift(ownerID, siteID int, opening map[int]float64, notes string, nowMs int64) *models.Shift {
	s.mu.Lock()
	defer s.mu.Unlock()
	id := s.nextIDs["shift"]
	s.nextIDs["shift"] = id + 1
	sh := &models.Shift{
		ID: id, OwnerID: ownerID, SiteID: siteID, OpenTs: nowMs,
		OpeningLevel: opening, ClosingLevel: map[int]float64{}, Notes: notes,
	}
	s.Shifts[id] = sh
	_ = s.persist()
	return sh
}
func (s *Store) CloseShift(id int, ownerID int, closing map[int]float64, notes string, nowMs int64) *models.Shift {
	s.mu.Lock()
	defer s.mu.Unlock()
	sh := s.Shifts[id]
	if sh == nil || sh.OwnerID != ownerID {
		return nil
	}
	sh.ClosingLevel = closing
	sh.CloseTs = nowMs
	if notes != "" {
		sh.Notes = notes
	}
	_ = s.persist()
	return sh
}
func (s *Store) ListShiftsByOwner(ownerID int, limit int) []*models.Shift {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := []*models.Shift{}
	for _, v := range s.Shifts {
		if v.OwnerID == ownerID {
			out = append(out, v)
		}
	}
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out
}
func (s *Store) GetShift(id int) *models.Shift {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.Shifts[id]
}

func (s *Store) AddTankEvent(tid int, kind string, value float64, meta map[string]any, nowMs int64) *models.TankEvent {
	if s.pg != nil {
		return s.pg.AppendTankEvent(tid, kind, value, meta, nowMs)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	id := s.nextIDs["te"]
	s.nextIDs["te"] = id + 1
	ev := &models.TankEvent{ID: id, TankID: tid, Kind: kind, Value: value, Ts: nowMs, Meta: meta}
	s.TankEv[id] = ev
	_ = s.persist()
	return ev
}
func (s *Store) ListTankEvents(tid int, sinceMs int64, limit int) []*models.TankEvent {
	if s.pg != nil {
		return s.pg.ListTankEvents(tid, sinceMs, limit)
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*models.TankEvent, 0, limit)
	for _, ev := range s.TankEv {
		if ev.TankID == tid && ev.Ts >= sinceMs {
			out = append(out, ev)
		}
	}
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out
}

func (s *Store) ListWebhooksByOwner(ownerID int) []*models.Webhook {
	if s.pg != nil {
		return s.pg.ListWebhooksByOwner(ownerID)
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*models.Webhook, 0)
	for _, w := range s.Webhooks {
		if w.OwnerID == ownerID {
			out = append(out, w)
		}
	}
	return out
}

func (s *Store) ListWebhookIDsByOwner(ownerID int) []int {
	ws := s.ListWebhooksByOwner(ownerID)
	ids := make([]int, 0, len(ws))
	for _, w := range ws {
		ids = append(ids, w.ID)
	}
	return ids
}

func UserFromStore(ctx any, id int) *models.User {
	// простой глобальный доступ через singleton store не делаем; middleware не знает store.
	// Поэтому в RequireAuth мы не берём отсюда пользователя.
	// Этот хелпер оставлен для совместимости, можно не использовать.
	return nil
}
