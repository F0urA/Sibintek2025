package handlers

import (
	"backend/internal/config"
	"backend/internal/httpserver/middleware"
	"backend/internal/models"
	"backend/internal/store"
	"backend/internal/util"
	"net/http"
)

func FleetWebhooks(st *store.Store, cfg *config.AppConfig) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u := middleware.CurrentUser(r.Context())
		if u == nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		switch r.Method {
		case http.MethodGet:
			if r.URL.Query().Get("mine") == "1" {
				list := st.ListWebhooksByOwner(u.ID)
				out := make([]map[string]any, 0, len(list))
				for _, wbh := range list {
					out = append(out, map[string]any{
						"id":       wbh.ID,
						"url":      wbh.URL,
						"owner_id": wbh.OwnerID,
						"status":   "active",
					})
				}
				util.JSON(w, http.StatusOK, map[string]any{"items": out})
				return
			}
			http.Error(w, "bad request", http.StatusBadRequest)
			return

		case http.MethodPost:
			var in struct {
				URL         string `json:"url"`
				OwnerID     int    `json:"owner_id"`
				SecretToken string `json:"secret_token"`
			}
			if !util.ReadJSON(w, r, &in) {
				return
			}
			if in.OwnerID == 0 {
				in.OwnerID = u.ID
			}

			wb := &models.Webhook{URL: in.URL, OwnerID: in.OwnerID, SecretToken: in.SecretToken}
			if out := st.UpsertWebhook(wb); out != nil {
				util.JSON(w, http.StatusOK, map[string]any{"id": out.ID})
				return
			}
			http.Error(w, "create failed", http.StatusInternalServerError)
			return

		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
	})
}

func FleetImport(st *store.Store) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var in struct {
			RouteName string `json:"route_name"`
			Webhook   *struct {
				ID      int    `json:"id"`
				URL     string `json:"url"`
				OwnerID int    `json:"owner_id"`
			} `json:"webhook,omitempty"`
		}
		if !util.ReadJSON(w, r, &in) {
			return
		}

		if in.Webhook != nil {
			st.UpsertWebhook(&models.Webhook{
				ID:      in.Webhook.ID,
				URL:     in.Webhook.URL,
				OwnerID: in.Webhook.OwnerID,
			})
		}

		util.JSON(w, http.StatusOK, map[string]any{"ok": 1})
	})
}

func FleetCreateWebhook(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_ = middleware.CurrentUser(r.Context())
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var in struct {
			URL         string `json:"url"`
			OwnerID     int    `json:"owner_id"`
			SecretToken string `json:"secret_token"`
		}
		if !util.ReadJSON(w, r, &in) {
			return
		}
		wb := st.UpsertWebhook(&models.Webhook{URL: in.URL, OwnerID: in.OwnerID, SecretToken: in.SecretToken})
		util.JSON(w, http.StatusOK, map[string]any{"id": wb.ID})
	}
}
