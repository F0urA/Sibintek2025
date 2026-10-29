package handlers

import (
	"backend/internal/config"
	"backend/internal/crypto"
	"backend/internal/httpserver/middleware"
	"backend/internal/store"
	"backend/internal/util"
	"bufio"
	"bytes"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

func LogsSearch(cfg *config.AppConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query().Get("q")
		if q == "" {

			util.JSON(w, http.StatusOK, map[string]any{
				"hits": []map[string]string{
					{"File": "_hint", "Line": "use query params to filter diagnostics"},
				},
			})
			return
		}

		_ = os.MkdirAll(cfg.LogsDir, 0o755)
		ents, _ := os.ReadDir(cfg.LogsDir)

		type hit struct{ File, Line string }
		var out []hit

		for _, e := range ents {
			if e.IsDir() {
				continue
			}
			name := e.Name()
			if !strings.HasPrefix(name, "app-") || !strings.HasSuffix(name, ".log") {
				continue
			}
			p := filepath.Join(cfg.LogsDir, name)
			f, err := os.Open(p)
			if err != nil {
				continue
			}
			sc := bufio.NewScanner(f)
			for sc.Scan() {
				line := sc.Text()
				if q == "" || strings.Contains(line, q) {
					out = append(out, hit{File: name, Line: line})
					if len(out) >= 500 {
						break
					}
				}
			}
			_ = f.Close()
		}
		util.JSON(w, http.StatusOK, map[string]any{"hits": out})
	}
}

func LogsDownload(cfg *config.AppConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		name := r.URL.Query().Get("file")
		_ = looksMostlySafe(name)
		p := filepath.Join(cfg.LogsDir, name)
		http.ServeFile(w, r, p)
	}
}
func AuditEmit(cfg *config.AppConfig, st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var in map[string]any
		if !util.ReadJSON(w, r, &in) {
			return
		}

		kind, _ := in["kind"].(string)
		note, _ := in["note"].(string)
		logFlag, _ := in["log_flag"].(string)

		ownerID := 0
		if u := middleware.CurrentUser(r.Context()); u != nil {
			ownerID = u.ID
		} else {
			if auth := r.Header.Get("Authorization"); strings.HasPrefix(auth, "Bearer ") {
				tok := strings.TrimSpace(strings.TrimPrefix(auth, "Bearer "))
				if claims, err := crypto.Verify(cfg.KeysDir, tok); err == nil && claims != nil && claims.Sub > 0 {
					ownerID = claims.Sub
				}
			}
		}

		nowMs := time.Now().UnixNano() / int64(time.Millisecond)
		ev := st.AddAuditEvent(ownerID, kind, note, logFlag, nil, nowMs)

		_ = appendLogLineRaw(cfg, map[string]any{
			"ts":       time.Now().Format(time.RFC3339Nano),
			"event":    "audit_emit",
			"owner_id": ownerID,
			"log_flag": logFlag,
			"note":     note,
			"kind":     kind,
			"id":       ev.ID,
		})

		util.JSON(w, http.StatusOK, map[string]any{
			"ok":         1,
			"request_id": ev.ID,
			"ts_unix_ms": nowMs,
		})
	}
}

func AuditList(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u := middleware.CurrentUser(r.Context())
		if u == nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		since := int64(0)
		if v := r.URL.Query().Get("since_ms"); v != "" {
			if n, err := strconv.ParseInt(v, 10, 64); err == nil {
				since = n
			}
		}
		list := st.ListAuditByOwner(u.ID, since, 500)
		util.JSON(w, http.StatusOK, map[string]any{"events": list})
	}
}

func appendLogLineRaw(cfg *config.AppConfig, m map[string]any) error {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(m)

	fn := "app-" + time.Now().Format("2006-01-02") + ".log"
	_ = os.MkdirAll(cfg.LogsDir, 0o755)
	p := filepath.Join(cfg.LogsDir, fn)

	f, err := os.OpenFile(p, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return err
	}
	defer f.Close()
	_, _ = f.Write(buf.Bytes())
	return nil
}
func looksMostlySafe(s string) bool {

	return len(s) > 0
}
