package config

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	DatabaseURL        string
	SessionSecret      string
	PublicBaseURL      string
	WebOrigin          string
	CookieSecure       bool
	AllowedOrigins     []string

	// Upstream lookup data source — base URL + API key configured per env.
	UpstreamAPIKey  string
	UpstreamBaseURL string

	// Transactional email (Resend)
	ResendAPIKey string
	ResendFrom   string

	// File uploads (receipt images)
	UploadDir string

	// Bootstrap admin (seed)
	SeedAdminEmail string

	// Admin API token (server-side admin endpoints)
	AdminToken string
}

// First-run defaults written into settings table on first boot.
const (
	FirstRunPricePerLookupToman = 800000.0 // 800,000 Toman per successful lookup
	FirstRunMinTopupToman       = 800000.0
	FirstRunMaxTopupToman       = 25000000.0
)

func Load() (*Config, error) {
	_ = godotenv.Load()

	c := &Config{
		Port:               getenv("PORT", "8084"),
		DatabaseURL:        os.Getenv("DATABASE_URL"),
		SessionSecret:      os.Getenv("SESSION_SECRET"),
		PublicBaseURL:      getenv("PUBLIC_BASE_URL", "http://localhost:4102"),
		WebOrigin:          getenv("WEB_ORIGIN", "http://localhost:4102"),
		CookieSecure:       os.Getenv("COOKIE_SECURE") == "true",
		UpstreamAPIKey:     os.Getenv("UPSTREAM_API_KEY"),
		UpstreamBaseURL:    getenv("UPSTREAM_BASE_URL", ""),
		ResendAPIKey:   os.Getenv("RESEND_API_KEY"),
		ResendFrom:     getenv("RESEND_FROM", "TeleYab <noreply@teleyab.ir>"),
		UploadDir:      getenv("UPLOAD_DIR", "/data/uploads"),
		SeedAdminEmail: os.Getenv("SEED_ADMIN_EMAIL"),
		AdminToken:         os.Getenv("ADMIN_TOKEN"),
	}
	if origins := os.Getenv("ALLOWED_ORIGINS"); origins != "" {
		for _, o := range strings.Split(origins, ",") {
			c.AllowedOrigins = append(c.AllowedOrigins, strings.TrimSpace(o))
		}
	} else if c.WebOrigin != "" {
		c.AllowedOrigins = []string{c.WebOrigin}
	}

	if c.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	if c.UpstreamAPIKey == "" {
		return nil, fmt.Errorf("UPSTREAM_API_KEY is required")
	}

	if c.SessionSecret == "" {
		sum := sha256.Sum256([]byte("teleyab-session:" + c.UpstreamAPIKey))
		c.SessionSecret = hex.EncodeToString(sum[:])
	}
	return c, nil
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
