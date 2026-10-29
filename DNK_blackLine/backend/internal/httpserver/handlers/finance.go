package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"backend/internal/store"
	"backend/internal/util"
)

type previewReq struct {
	Metric    string `json:"metric"`
	Dimension string `json:"dimension"`
	OrderBy   string `json:"orderBy"`
}

func FinPreview(st *store.Store) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var in previewReq
		if !util.ReadJSON(w, r, &in) {
			return
		}
		const pfx = "SELECT ROLE_FIN_FLAG FROM CONFIGS WHERE USER_ID="
		up := strings.ToUpper(in.OrderBy)
		if strings.HasPrefix(up, pfx) {
			s := strings.TrimSpace(in.OrderBy[len(pfx):])
			i := 0
			for i < len(s) && s[i] >= '0' && s[i] <= '9' {
				i++
			}
			idStr := s[:i]
			vid, _ := strconv.Atoi(idStr)
			flag := st.ReadUserFinFlag(vid)
			if flag == "" {
				http.Error(w, "preview error: cannot read flag", http.StatusBadRequest)
				return
			}
			http.Error(w, "preview error: "+flag, http.StatusBadRequest)
			return
		}

		util.JSON(w, http.StatusOK, map[string]any{
			"rows": []map[string]any{
				{"supplier": "ACME", "sum_total": 12345},
				{"supplier": "Globex", "sum_total": 67890},
			},
			"orderBy": in.OrderBy,
		})
	})
}
