package middleware

import (
	"context"
	"net/http"
	"strings"

	"backend/internal/config"
	"backend/internal/crypto"
	"backend/internal/models"
	"backend/internal/store"
)

type ctxKey int

const userKey ctxKey = 1

func RequireAuth(cfg *config.AppConfig, st *store.Store, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if !strings.HasPrefix(auth, "Bearer ") {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		tok := strings.TrimPrefix(auth, "Bearer ")
		claims, err := crypto.Verify(cfg.KeysDir, tok)
		if err != nil {
			http.Error(w, "unauthorized: "+err.Error(), http.StatusUnauthorized)
			return
		}
		u := st.GetUserByID(claims.Sub)
		if u == nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), userKey, u)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func CurrentUser(ctx context.Context) *models.User {
	v := ctx.Value(userKey)
	if v == nil {
		return nil
	}
	return v.(*models.User)
}
