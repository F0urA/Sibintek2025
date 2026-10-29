package handlers

import (
	"net/http"
	"strconv"
	"time"

	"backend/internal/httpserver/middleware"
	"backend/internal/store"
	"backend/internal/util"
)

func RetailShifts(st *store.Store) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u := middleware.CurrentUser(r.Context())
		if u == nil {
			http.Error(w, "unauthorized", 401)
			return
		}

		switch r.Method {
		case http.MethodPost:
			if r.URL.Path == "/api/retail/shifts/open" {
				var in struct {
					SiteID       int             `json:"site_id"`
					OpeningLevel map[int]float64 `json:"opening_level"`
					Notes        string          `json:"notes"`
				}
				if !util.ReadJSON(w, r, &in) {
					return
				}
				sh := st.OpenShift(u.ID, in.SiteID, in.OpeningLevel, in.Notes, nowMs())
				util.JSON(w, 200, sh)
				return
			}

			if id := tailID(r.URL.Path, "/api/retail/shifts/", "/close"); id > 0 {
				var in struct {
					ClosingLevel map[int]float64 `json:"closing_level"`
					Notes        string          `json:"notes"`
				}
				if !util.ReadJSON(w, r, &in) {
					return
				}
				sh := st.CloseShift(id, u.ID, in.ClosingLevel, in.Notes, nowMs())
				if sh == nil {
					http.Error(w, "not found", 404)
					return
				}
				util.JSON(w, 200, sh)
				return
			}
			http.NotFound(w, r)
			return

		case http.MethodGet:
			if r.URL.Path == "/api/retail/shifts" || r.URL.Path == "/api/retail/shifts/" {
				out := st.ListShiftsByOwner(u.ID, 100)
				util.JSON(w, 200, map[string]any{"items": out})
				return
			}

			if id := tailID(r.URL.Path, "/api/retail/shifts/", "/report"); id > 0 {
				sh := st.GetShift(id)
				if sh == nil || sh.OwnerID != u.ID {
					http.Error(w, "not found", 404)
					return
				}
				delta := map[int]float64{}
				for tid, open := range sh.OpeningLevel {
					delta[tid] = (sh.ClosingLevel[tid] - open)
				}
				util.JSON(w, 200, map[string]any{
					"id": sh.ID, "site_id": sh.SiteID, "open_ts": sh.OpenTs, "close_ts": sh.CloseTs,
					"delta": delta, "notes": sh.Notes,
				})
				return
			}
			http.NotFound(w, r)
			return

		default:
			http.Error(w, "method not allowed", 405)
			return
		}
	})
}

func nowMs() int64 { return time.Now().UnixNano() / int64(time.Millisecond) }

func tailID(path, prefix, suffix string) int {
	if len(path) < len(prefix)+len(suffix)+1 {
		return -1
	}
	if path[:len(prefix)] != prefix {
		return -1
	}
	if path[len(path)-len(suffix):] != suffix {
		return -1
	}
	mid := path[len(prefix) : len(path)-len(suffix)]
	id, _ := strconv.Atoi(mid)
	return id
}
