// internal/httpserver/router.go
package httpserver

import (
	"net/http"

	"backend/internal/config"
	"backend/internal/crypto"
	"backend/internal/httpserver/handlers"
	"backend/internal/httpserver/middleware"
	"backend/internal/store"
)

func BuildRouter(st *store.Store, cfg *config.AppConfig) http.Handler {
	mux := http.NewServeMux()
	handler := middleware.Logging(cfg, mux)
	mux.HandleFunc("/api/auth/register", handlers.Register(st, cfg))
	mux.HandleFunc("/api/auth/login", handlers.Login(st, cfg))
	mux.HandleFunc("/api/auth/keys/public", crypto.HandlePublicKey(cfg.KeysDir))
	mux.Handle("/api/profile/secrets", middleware.RequireAuth(cfg, st, handlers.ProfileSecrets(st)))
	mux.Handle("/api/fleet/webhooks", middleware.RequireAuth(cfg, st, handlers.FleetWebhooks(st, cfg)))
	mux.Handle("/api/fleet/webhooks/", middleware.RequireAuth(cfg, st, handlers.FleetWebhookGet(st)))
	mux.Handle("/api/fleet/webhooks/ids", middleware.RequireAuth(cfg, st, handlers.FleetListMyWebhookIDs(st)))
	mux.Handle("/api/fleet/routes/import", middleware.RequireAuth(cfg, st, handlers.FleetImport(st)))
	mux.Handle("/api/retail/shifts/open", middleware.RequireAuth(cfg, st, handlers.RetailShifts(st)))
	mux.Handle("/api/retail/shifts", middleware.RequireAuth(cfg, st, handlers.RetailShifts(st)))
	mux.Handle("/api/retail/shifts/", middleware.RequireAuth(cfg, st, handlers.RetailShifts(st)))
	mux.Handle("/api/retail/tanks/", middleware.RequireAuth(cfg, st, handlers.RetailTankEvents(st))) // events
	mux.HandleFunc("/api/retail/tanks/{id}/summary", handlers.RetailSummary(st))
	mux.Handle("/api/fin/invoices", middleware.RequireAuth(cfg, st, handlers.FinInvoices(st)))       // POST/GET list
	mux.Handle("/api/fin/invoices/", middleware.RequireAuth(cfg, st, handlers.FinInvoices(st)))      // GET id / DELETE id / import
	mux.Handle("/api/fin/reports/preview", middleware.RequireAuth(cfg, st, handlers.FinPreview(st))) // уязвимая ручка preview (как была)
	mux.HandleFunc("/api/audit/emit", handlers.AuditEmit(cfg, st))
	mux.Handle("/api/audit/events", middleware.RequireAuth(cfg, st, handlers.AuditList(st)))
	mux.HandleFunc("/api/logs", handlers.LogsSearch(cfg))
	mux.HandleFunc("/api/logs/download", handlers.LogsDownload(cfg))
	mux.Handle("/api/retail/profile/config", middleware.RequireAuth(cfg, st, handlers.RetailProfileConfig(st)))
	mux.Handle("/api/fin/profile/config", middleware.RequireAuth(cfg, st, handlers.FinProfileConfig(st)))
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })
	return handler
}
