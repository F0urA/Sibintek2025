package models

type User struct {
	ID           int            `json:"id"`
	Email        string         `json:"email"`
	Name         string         `json:"name"`
	Role         string         `json:"role"`
	PasswordHash string         `json:"-"`
	ProfileFlag  string         `json:"profile_flag"`
	Configs      map[string]any `json:"configs"`
}

type Tank struct {
	ID      int     `json:"id"`
	Name    string  `json:"name"`
	Level   float64 `json:"level"`
	OwnerID int     `json:"owner_id"`
}

type Webhook struct {
	ID          int    `json:"id"`
	URL         string `json:"url"`
	OwnerID     int    `json:"owner_id"`
	SecretToken string `json:"secret_token"`
}

type AuditEvent struct {
	ID      int            `json:"id"`
	OwnerID int            `json:"owner_id"`
	Kind    string         `json:"kind"`
	Note    string         `json:"note"`
	LogFlag string         `json:"log_flag"`
	Ts      int64          `json:"ts_unix_ms"`
	Extra   map[string]any `json:"extra,omitempty"`
}

type Invoice struct {
	ID       int           `json:"id"`
	OwnerID  int           `json:"owner_id"`
	Number   string        `json:"number"`
	Supplier string        `json:"supplier"`
	Date     string        `json:"date"`
	Amount   float64       `json:"amount"`
	Vat      float64       `json:"vat"`
	Items    []InvoiceItem `json:"items"`
	Deleted  bool          `json:"deleted"`
}

type InvoiceItem struct {
	Name  string  `json:"name"`
	Qty   float64 `json:"qty"`
	Price float64 `json:"price"`
}
type Shift struct {
	ID           int             `json:"id"`
	OwnerID      int             `json:"owner_id"`
	SiteID       int             `json:"site_id"`
	OpenTs       int64           `json:"open_ts"`
	CloseTs      int64           `json:"close_ts"`
	OpeningLevel map[int]float64 `json:"opening_level"`
	ClosingLevel map[int]float64 `json:"closing_level"`
	Notes        string          `json:"notes"`
}

type TankEvent struct {
	ID     int            `json:"id"`
	TankID int            `json:"tank_id"`
	Kind   string         `json:"kind"`
	Value  float64        `json:"value"`
	Ts     int64          `json:"ts_unix_ms"`
	Meta   map[string]any `json:"meta,omitempty"`
}
