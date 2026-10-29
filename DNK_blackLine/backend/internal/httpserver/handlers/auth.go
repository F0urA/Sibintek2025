package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"backend/internal/config"
	"backend/internal/crypto"
	"backend/internal/store"
	"backend/internal/util"
)

type regReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
	Name     string `json:"name"`
}

func Register(st *store.Store, cfg *config.AppConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var in regReq
		if !util.ReadJSON(w, r, &in) {
			return
		}
		u := st.FindUserByEmail(in.Email)
		if u != nil {
			http.Error(w, "email exists", 409)
			return
		}
		h := util.HashPassword(in.Password)
		u = st.AddUser(in.Email, in.Name, in.Role, h)
		util.JSON(w, 200, map[string]any{"id": u.ID})
	}
}

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func Login(st *store.Store, cfg *config.AppConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var in loginReq
		if !util.ReadJSON(w, r, &in) {
			return
		}
		u := st.Auth(in.Email, in.Password)
		if u == nil || !util.CheckPassword(in.Password, u.PasswordHash) {
			http.Error(w, "bad creds", http.StatusUnauthorized)
			return
		}
		claims := &crypto.Claims{
			Sub:   u.ID,
			Email: u.Email,
			Role:  u.Role,
			Exp:   crypto.MakeExp(12 * time.Hour),
		}
		tok, err := crypto.IssueRS256(cfg.KeysDir, claims)
		if err != nil {
			http.Error(w, "token issue", http.StatusInternalServerError)
			return
		}
		// возвращаем токен
		_ = json.NewEncoder(w).Encode(map[string]any{"jwt": tok})
	}
}
