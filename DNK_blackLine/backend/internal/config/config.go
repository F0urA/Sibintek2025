package config

import "os"

type AppConfig struct {
	Addr        string
	KeysDir     string
	LogsDir     string
	DataDir     string
	DatabaseURL string
}

func Load() *AppConfig {
	return &AppConfig{
		Addr:        getenv("ADDR", ":8080"),
		KeysDir:     getenv("KEYS_DIR", "./keys"),
		LogsDir:     getenv("LOGS_DIR", "./logs"),
		DataDir:     getenv("DATA_DIR", "./data"),
		DatabaseURL: getenv("DATABASE_URL", ""),
	}
}

func getenv(k, def string) string {
	v := os.Getenv(k)
	if v == "" {
		return def
	}
	return v
}
