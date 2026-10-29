package handlers

import (
	"net/http"
	"path"
	"strconv"
	"strings"

	"backend/internal/store"
	"backend/internal/util"
)

type tankSummaryDTO struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Level       float64 `json:"level"`
	OwnerName   string  `json:"owner_name"`
	OwnerEmail  string  `json:"owner_email"`
	OwnerConfig any     `json:"owner_configs,omitempty"` // утечка role_retail_flag
}

func RetailSummary(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// примитивный парсер пути
		// ожидаем /api/retail/tanks/{id}/summary
		segs := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(segs) != 5 || segs[0] != "api" || segs[1] != "retail" || segs[2] != "tanks" || segs[4] != "summary" {
			http.NotFound(w, r)
			return
		}
		id, _ := strconv.Atoi(segs[3])
		tk := st.TankByID(id)
		if tk == nil {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		owner := st.GetUserByID(tk.OwnerID)
		cfg := map[string]any{"role_retail_flag": st.ReadUserConfigString(tk.OwnerID, "role_retail_flag")}
		out := tankSummaryDTO{
			ID: tk.ID, Name: tk.Name, Level: tk.Level,
			OwnerName: owner.Name, OwnerEmail: owner.Email,
			OwnerConfig: cfg,
		}
		util.JSON(w, http.StatusOK, out)
	}
}

var _ = path.Join
