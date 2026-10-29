package main

import (
	"log"
	"net/http"

	"backend/internal/config"
	"backend/internal/crypto"
	"backend/internal/httpserver"

	"backend/internal/store"
)

func main() {
	_ = config.LoadEnvFile(".env")
	cfg := config.Load()
	log.Printf("router ready; health mounted; addr=%s", cfg.Addr)

	if err := crypto.EnsureRSAKeys(cfg.KeysDir); err != nil {
		log.Fatalf("keys: %v", err)
	}
	pgdb, err := store.ConnectPG(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("pg connect: %v", err)
	}
	if err := store.InitSchema(pgdb); err != nil {
		log.Fatalf("pg schema: %v", err)
	}

	st, err := store.New(cfg, pgdb)

	if err != nil {
		log.Fatalf("store: %v", err)
	}

	r := httpserver.BuildRouter(st, cfg)

	log.Printf("Listening on %s", cfg.Addr)
	if err := http.ListenAndServe(cfg.Addr, r); err != nil {
		log.Fatal(err)
	}
}
