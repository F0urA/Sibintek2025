package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"backend/internal/httpserver/middleware"
	"backend/internal/store"
	"backend/internal/util"
)

func FleetWebhookGet(st *store.Store) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = middleware.CurrentUser(r.Context())
		segs := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if r.Method != http.MethodGet || len(segs) != 4 || segs[0] != "api" || segs[1] != "fleet" || segs[2] != "webhooks" {
			http.NotFound(w, r)
			return
		}
		id, _ := strconv.Atoi(segs[3])
		wb := st.GetWebhookByID(id)
		if wb == nil {
			http.Error(w, "not found", 404)
			return
		}
		util.JSON(w, 200, wb)
	})
}

func FleetListMyWebhookIDs(st *store.Store) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u := middleware.CurrentUser(r.Context())
		if u == nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		if r.URL.Query().Get("mine") != "1" {
			http.NotFound(w, r)
			return
		}
		ids := st.ListWebhookIDsByOwner(u.ID)
		util.JSON(w, http.StatusOK, map[string]any{"ids": ids})
	})
}
