package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/teleyab/teleyab/internal/config"
	"github.com/teleyab/teleyab/internal/db"
	"github.com/teleyab/teleyab/internal/email"
	"github.com/teleyab/teleyab/internal/handlers"
	"github.com/teleyab/teleyab/internal/session"
	"github.com/teleyab/teleyab/internal/upstream"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	if err := os.MkdirAll(cfg.UploadDir, 0755); err != nil {
		log.Fatalf("upload dir: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	database, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db open: %v", err)
	}
	defer database.Close()

	if err := database.Migrate(ctx); err != nil {
		log.Fatalf("db migrate: %v", err)
	}
	if err := database.Seed(ctx, config.FirstRunPricePerLookupToman, config.FirstRunMinTopupToman, config.FirstRunMaxTopupToman); err != nil {
		log.Fatalf("db seed: %v", err)
	}
	if cfg.SeedAdminEmail != "" {
		if err := database.EnsureAdmin(ctx, cfg.SeedAdminEmail); err != nil {
			log.Fatalf("seed admin: %v", err)
		}
	}

	sessions := session.New(database.Pool, cfg.CookieSecure)
	emailC := email.New(cfg.ResendAPIKey, cfg.ResendFrom)
	upstreamC := upstream.New(cfg.UpstreamAPIKey, cfg.UpstreamBaseURL)

	h := &handlers.Handlers{
		Cfg:       cfg,
		DB:        database,
		Sessions:  sessions,
		Email:     emailC,
		Upstream:  upstreamC,
		UploadDir: cfg.UploadDir,
	}

	// Load upstream providers from DB into the in-memory router (v3 multi-provider).
	if err := loadProviders(ctx, database, upstreamC); err != nil {
		log.Printf("loadProviders: %v", err)
	}

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	h.Mount(r)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("teleyab-api listening on :%s (web=%s)", cfg.Port, cfg.WebOrigin)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	log.Println("shutting down…")
	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()
	_ = srv.Shutdown(shutdownCtx)
}

func loadProviders(ctx context.Context, d *db.DB, u *upstream.Client) error {
	rows, err := d.Query(ctx, `SELECT name, base_url, api_key, enabled, priority FROM upstream_providers ORDER BY priority, id`)
	if err != nil {
		return err
	}
	defer rows.Close()
	ps := []upstream.Provider{}
	for rows.Next() {
		var p upstream.Provider
		if err := rows.Scan(&p.Name, &p.BaseURL, &p.APIKey, &p.Enabled, &p.Pri); err == nil {
			ps = append(ps, p)
		}
	}
	u.SetProviders(ps)
	return nil
}
