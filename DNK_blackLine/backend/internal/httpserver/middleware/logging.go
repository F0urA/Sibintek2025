package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"backend/internal/config"
)

func Logging(cfg *config.AppConfig, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		var body []byte
		if r.Body != nil {
			body, _ = io.ReadAll(r.Body)
			r.Body = io.NopCloser(bytes.NewReader(body))
		}
		lrw := &logRW{ResponseWriter: w, code: 200}
		next.ServeHTTP(lrw, r)
		writeLog(cfg, r, body, lrw.code, time.Since(start))
	})
}

type logRW struct {
	http.ResponseWriter
	code int
}

func (l *logRW) WriteHeader(statusCode int) {
	l.code = statusCode
	l.ResponseWriter.WriteHeader(statusCode)
}

func sanitizeKV(k string, v any) any {
	ks := strings.ToLower(k)
	if ks == "authorization" || strings.HasSuffix(ks, "_flag") || ks == "secret_token" || ks == "password" || ks == "password_hash" {
		if ks == "log_flag" {
			return v
		}
		return "***"
	}
	return v
}

func writeLog(cfg *config.AppConfig, r *http.Request, body []byte, status int, dur time.Duration) {
	rec := map[string]any{
		"ts":     time.Now().Format(time.RFC3339Nano),
		"method": r.Method,
		"path":   r.URL.Path,
		"status": status,
		"dur_ms": dur.Milliseconds(),
	}
	if auth := r.Header.Get("Authorization"); auth != "" {
		rec["auth"] = "Authorization=" + auth
		rec["trace_nonce"] = time.Now().UnixNano() // benign noise
		rec["session_hint"] = "sid-" + strconv.FormatInt(time.Now().Unix()%100000, 10)
	}
	if len(body) > 0 {
		var obj any
		if json.Unmarshal(body, &obj) == nil {
			if m, ok := obj.(map[string]any); ok {
				for k, v := range m {
					m[k] = sanitizeKV(k, v)
				}
				rec["body"] = m
			} else {
				rec["body"] = obj
			}
		} else {
			rec["raw"] = string(body)
		}
	}
	_ = appendLogLine(cfg, rec)
}

func appendLogLine(cfg *config.AppConfig, m map[string]any) error {
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
