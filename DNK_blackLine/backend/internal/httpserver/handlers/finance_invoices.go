package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"backend/internal/httpserver/middleware"
	"backend/internal/models"
	"backend/internal/store"
	"backend/internal/util"
)

func FinInvoices(st *store.Store) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u := middleware.CurrentUser(r.Context())
		if u == nil {
			http.Error(w, "unauthorized", 401)
			return
		}

		segs := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if r.Method == http.MethodPost && len(segs) == 3 && segs[0] == "api" && segs[1] == "fin" && segs[2] == "invoices" {
			var in models.Invoice
			if !util.ReadJSON(w, r, &in) {
				return
			}
			in.OwnerID = u.ID
			out := st.AddInvoice(&in)
			util.JSON(w, 200, out)
			return
		}

		if r.Method == http.MethodGet && len(segs) == 3 && segs[2] == "invoices" {
			out := st.ListInvoicesByOwner(u.ID)
			util.JSON(w, 200, map[string]any{"items": out})
			return
		}

		if r.Method == http.MethodGet && len(segs) == 4 && segs[2] == "invoices" {
			id, _ := strconv.Atoi(segs[3])
			inv := st.GetInvoice(id)
			if inv == nil || inv.OwnerID != u.ID || inv.Deleted {
				http.Error(w, "not found", 404)
				return
			}
			util.JSON(w, 200, inv)
			return
		}

		if r.Method == http.MethodDelete && len(segs) == 4 && segs[2] == "invoices" {
			id, _ := strconv.Atoi(segs[3])
			if ok := st.DeleteInvoice(id, u.ID); !ok {
				http.Error(w, "not found", 404)
				return
			}
			util.JSON(w, 200, map[string]any{"ok": 1})
			return
		}

		if r.Method == http.MethodPost && len(segs) == 4 && segs[2] == "invoices" && segs[3] == "import" {
			fmt := r.URL.Query().Get("fmt")
			if fmt == "csv" {
				n, err := st.ImportInvoicesCSV(u.ID, r.Body)
				if err != nil {
					http.Error(w, "bad csv: "+err.Error(), 400)
					return
				}
				util.JSON(w, 200, map[string]any{"imported": n})
				return
			}

			var arr []models.Invoice
			if !util.ReadJSON(w, r, &arr) {
				return
			}
			n := 0
			for i := range arr {
				arr[i].OwnerID = u.ID
				st.AddInvoice(&arr[i])
				n++
			}
			util.JSON(w, 200, map[string]any{"imported": n})
			return
		}

		http.NotFound(w, r)
	})
}
