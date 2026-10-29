package handlers

import (
	"net/http"

	"backend/internal/httpserver/middleware"
	"backend/internal/store"
	"backend/internal/util"
)

type retailCfgDTO struct {
	RoleRetailFlag string `json:"role_retail_flag"`
}
type finCfgDTO struct {
	RoleFinFlag string `json:"role_fin_flag"`
}

func RetailProfileConfig(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u := middleware.CurrentUser(r.Context())
		if r.Method == http.MethodPut {
			var in retailCfgDTO
			if !util.ReadJSON(w, r, &in) {
				return
			}
			st.UpdateUserConfig(u.ID, "role_retail_flag", in.RoleRetailFlag)
			st.EnsureTankForOwner(u.ID)

			util.JSON(w, http.StatusOK, map[string]any{"ok": 1})
			return
		}
		if r.Method == http.MethodGet {
			flag := st.ReadUserConfigString(u.ID, "role_retail_flag")
			util.JSON(w, http.StatusOK, retailCfgDTO{RoleRetailFlag: flag})
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func FinProfileConfig(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u := middleware.CurrentUser(r.Context())
		if r.Method == http.MethodGet {
			flag := st.ReadUserConfigString(u.ID, "role_fin_flag")
			util.JSON(w, http.StatusOK, finCfgDTO{RoleFinFlag: flag})
			return
		}
		if r.Method == http.MethodPut {
			var in finCfgDTO
			if !util.ReadJSON(w, r, &in) {
				return
			}
			st.UpdateUserConfig(u.ID, "role_fin_flag", in.RoleFinFlag)
			util.JSON(w, http.StatusOK, map[string]any{"ok": 1})
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}
