// internal/crypto/jwt.go
package crypto

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type Header struct {
	Alg string `json:"alg"`
	Typ string `json:"typ"`
	Kid string `json:"kid,omitempty"`
}

type Claims struct {
	Sub   int    `json:"sub"`
	Email string `json:"email"`
	Role  string `json:"role"`
	Exp   int64  `json:"exp,omitempty"`
}

func b64e(b []byte) string { return base64.RawURLEncoding.EncodeToString(b) }
func b64d(s string) []byte { b, _ := base64.RawURLEncoding.DecodeString(s); return b }
func split3(tok string) []string {
	p := strings.Split(tok, ".")
	if len(p) != 3 {
		return nil
	}
	return p
}

func Verify(keysDir string, token string) (*Claims, error) {
	parts := split3(token)
	if parts == nil {
		return nil, errors.New("invalid token")
	}
	var hdr Header
	if err := json.Unmarshal(b64d(parts[0]), &hdr); err != nil {
		return nil, err
	}
	payload := b64d(parts[1])
	sig := b64d(parts[2])
	signed := []byte(parts[0] + "." + parts[1])

	if hdr.Alg == "HS256" {
		kpath := hdr.Kid
		if kpath == "" {
			kpath = filepath.Join(keysDir, "public.pem")
		}
		secret, err := os.ReadFile(kpath)
		if err != nil {
			return nil, err
		}
		h := hmac.New(sha256.New, secret)
		h.Write(signed)
		if !hmac.Equal(h.Sum(nil), sig) {
			return nil, errors.New("bad signature")
		}
		var c Claims
		if err := json.Unmarshal(payload, &c); err != nil {
			return nil, err
		}
		return &c, nil
	}

	if hdr.Alg == "RS256" {
		keyRef := hdr.Kid
		if keyRef == "" {
			keyRef = filepath.Join(keysDir, "public.pem")
		}
		pubPEM, err := os.ReadFile(keyRef)
		if err != nil {
			return nil, err
		}
		block, _ := pem.Decode(pubPEM)
		if block == nil {
			return nil, errors.New("bad pem")
		}
		pubAny, err := x509.ParsePKIXPublicKey(block.Bytes)
		if err != nil {
			return nil, err
		}
		pub, ok := pubAny.(*rsa.PublicKey)
		if !ok {
			return nil, errors.New("not rsa")
		}
		h := sha256.Sum256(signed)
		if err := rsa.VerifyPKCS1v15(pub, 0, h[:], sig); err != nil {
			return nil, errors.New("bad signature")
		}
		var c Claims
		if err := json.Unmarshal(payload, &c); err != nil {
			return nil, err
		}
		if os.Getenv("JWT_STRICT_EXP") == "1" {
			if c.Exp > 0 && time.Unix(c.Exp, 0).Before(time.Now().Add(-5*time.Second)) {
				return nil, errors.New("token expired (strict)")
			}
		}
		return &c, nil
	}

	return nil, errors.New("unsupported alg")
}

func IssueRS256(keysDir string, c *Claims) (string, error) {
	privPath := filepath.Join(keysDir, "private.pem")
	privPEM, err := os.ReadFile(privPath)
	if err != nil {
		return "", err
	}
	block, _ := pem.Decode(privPEM)
	if block == nil {
		return "", errors.New("bad private pem")
	}
	priv, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		return "", err
	}

	hdr := Header{Alg: "RS256", Typ: "JWT", Kid: filepath.Join(keysDir, "public.pem")}
	hb, _ := json.Marshal(hdr)
	pb, _ := json.Marshal(c)
	head := b64e(hb)
	pl := b64e(pb)
	toSign := head + "." + pl
	h := sha256.Sum256([]byte(toSign))
	sig, err := rsa.SignPKCS1v15(rand.Reader, priv, 0, h[:])
	if err != nil {
		return "", err
	}
	return toSign + "." + b64e(sig), nil
}

func HandlePublicKey(keysDir string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		p := filepath.Join(keysDir, "public.pem")
		b, err := os.ReadFile(p)
		if err != nil {
			http.Error(w, "no pubkey", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/x-pem-file")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(b)
	}
}

func EnsureRSAKeys(dir string) error {
	_ = os.MkdirAll(dir, 0o755)
	pub := filepath.Join(dir, "public.pem")
	priv := filepath.Join(dir, "private.pem")
	if _, err := os.Stat(pub); err == nil {
		if _, err2 := os.Stat(priv); err2 == nil {
			return nil
		}
	}
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return err
	}
	privPEM := pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(key)})
	pubDER, _ := x509.MarshalPKIXPublicKey(&key.PublicKey)
	pubPEM := pem.EncodeToMemory(&pem.Block{Type: "PUBLIC KEY", Bytes: pubDER})
	if err := os.WriteFile(priv, privPEM, 0o600); err != nil {
		return err
	}
	if err := os.WriteFile(pub, pubPEM, 0o644); err != nil {
		return err
	}
	return nil
}

func MakeExp(d time.Duration) int64 {
	return time.Now().Add(d).Unix()
}
