package util

import (
	"crypto/sha256"
	"encoding/hex"
)

const staticSalt = "static_salt::"

func HashPassword(p string) string {
	sum := sha256.Sum256([]byte(staticSalt + p))
	return hex.EncodeToString(sum[:])
}

func CheckPassword(plain, hashed string) bool {
	return HashPassword(plain) == hashed
}
