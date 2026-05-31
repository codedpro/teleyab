package db

import (
	"context"
	_ "embed"
	"fmt"
	"strconv"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed schema.sql
var schemaSQL string

type DB struct {
	*pgxpool.Pool
}

func Open(ctx context.Context, dsn string) (*DB, error) {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("connect: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("ping: %w", err)
	}
	return &DB{Pool: pool}, nil
}

func (d *DB) Migrate(ctx context.Context) error {
	_, err := d.Exec(ctx, schemaSQL)
	if err != nil {
		return fmt.Errorf("migrate: %w", err)
	}
	return nil
}

// Seed writes initial settings rows if they don't already exist.
func (d *DB) Seed(ctx context.Context, pricePerLookup, minTopup, maxTopup float64) error {
	defaults := map[string]string{
		"price_per_lookup_toman":      strconv.FormatFloat(pricePerLookup, 'f', -1, 64),
		"min_topup_toman":             strconv.FormatFloat(minTopup, 'f', -1, 64),
		"max_topup_toman":             strconv.FormatFloat(maxTopup, 'f', -1, 64),
		"lookup_cache_days":           "0",     // 0 = disabled by default (opt-in per project)
		"low_balance_threshold":       "10",    // operator alert when upstream tokens < this
		"operator_alert_email":        "",      // who to email when upstream runs low
		"per_user_hourly_quota":       "60",    // max successful lookups per hour per user
		"per_ip_minute_quota":         "30",    // max requests per minute per IP
		"abuse_min_lookups_to_flag":   "20",    // need this many before flagging
		"abuse_max_success_ratio":     "0.10",  // flag when success/total <= this
		"referral_bonus_toman":        "200000", // both sides receive this once the referred user's first top-up is approved
		"public_api_enabled":          "true",
		"bulk_import_max_rows":        "500",
		"bank_card_number":            "",      // card-to-card top-up: admin's card number
		"bank_card_holder":            "",      // card holder name
		"bank_name":                   "",      // bank name (e.g. ملت)
	}
	q := `INSERT INTO settings(key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`
	for k, v := range defaults {
		if _, err := d.Exec(ctx, q, k, v); err != nil {
			return err
		}
	}
	return nil
}

// GetSettingString reads a setting; returns fallback on miss.
func (d *DB) GetSettingString(ctx context.Context, key, fallback string) string {
	var v string
	if err := d.QueryRow(ctx, `SELECT value FROM settings WHERE key=$1`, key).Scan(&v); err != nil {
		return fallback
	}
	return v
}

// SetSettingString upserts a setting value.
func (d *DB) SetSettingString(ctx context.Context, key, value string) error {
	_, err := d.Exec(ctx, `
		INSERT INTO settings(key, value) VALUES ($1, $2)
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
	`, key, value)
	return err
}

// EnsureAdmin promotes the given email to admin role, creating the user if
// they don't exist yet. Magic-link auth on this email then gets admin access.
func (d *DB) EnsureAdmin(ctx context.Context, email string) error {
	_, err := d.Exec(ctx, `
		INSERT INTO users (email, role, is_active)
		VALUES ($1, 'admin', TRUE)
		ON CONFLICT (email) DO UPDATE SET role = 'admin'
	`, email)
	return err
}

// GetSettingFloat reads a numeric setting; returns fallback on miss or parse error.
func (d *DB) GetSettingFloat(ctx context.Context, key string, fallback float64) float64 {
	var v string
	if err := d.QueryRow(ctx, `SELECT value FROM settings WHERE key=$1`, key).Scan(&v); err != nil {
		return fallback
	}
	f, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return fallback
	}
	return f
}
