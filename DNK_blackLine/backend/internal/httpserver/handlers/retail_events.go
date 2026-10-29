package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"backend/internal/httpserver/middleware"
	"backend/internal/store"
	"backend/internal/util"
)

func RetailTankEvents(st *store.Store) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u := middleware.CurrentUser(r.Context())
		if u == nil {
			http.Error(w, "unauthorized", 401)
			return
		}

		segs := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if r.Method == http.MethodPost && len(segs) == 5 && segs[0] == "api" && segs[1] == "retail" && segs[2] == "tanks" && segs[4] == "event" {
			tid, _ := strconv.Atoi(segs[3])
			var in struct {
				Kind  string         `json:"kind"`
				Value float64        `json:"value"`
				Meta  map[string]any `json:"meta"`
			}
			if !util.ReadJSON(w, r, &in) {
				return
			}
			ev := st.AddTankEvent(tid, in.Kind, in.Value, in.Meta, nowMs())
			util.JSON(w, 200, ev)
			return
		}
		if r.Method == http.MethodGet && len(segs) == 5 && segs[4] == "events" {
			tid, _ := strconv.Atoi(segs[3])
			since := int64(0)
			if v := r.URL.Query().Get("since_ms"); v != "" {
				since, _ = strconv.ParseInt(v, 10, 64)
			}
			list := st.ListTankEvents(tid, since, 500)
			util.JSON(w, 200, map[string]any{"items": list})
			return
		}
		http.NotFound(w, r)
	})
}
