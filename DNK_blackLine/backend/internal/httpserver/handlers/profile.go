package handlers

import (
	"net/http"

	"backend/internal/httpserver/middleware"
	"backend/internal/store"
	"backend/internal/util"
)

type profileSecretsDTO struct {
	ProfileFlag string `json:"profile_flag"`
}

func ProfileSecrets(st *store.Store) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u := middleware.CurrentUser(r.Context())
		if r.Method == http.MethodGet {
			util.JSON(w, http.StatusOK, profileSecretsDTO{ProfileFlag: st.ReadUserProfileFlag(u.ID)})
			return
		}
		if r.Method == http.MethodPut {
			var in profileSecretsDTO
			if !util.ReadJSON(w, r, &in) {
				return
			}
			st.UpdateUserProfileFlag(u.ID, in.ProfileFlag)
			util.JSON(w, http.StatusOK, map[string]any{"ok": 1})
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	})
}
