// Package upstream wraps the lookup data-source HTTP API and provides a
// multi-provider fallback router: if the primary provider fails, the
// router walks the configured providers in priority order. All providers
// must speak the same shape:
//   GET /lookup?key=...&query=...   1 token on success, 0 on failure
//   GET /balance?key=...            tokens_remaining
package upstream

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"sync"
	"time"
)

type Client struct {
	APIKey  string
	BaseURL string
	HTTP    *http.Client

	mu        sync.RWMutex
	providers []Provider
}

type Provider struct {
	Name    string
	BaseURL string
	APIKey  string
	Enabled bool
	Pri     int
}

func New(apiKey, baseURL string) *Client {
	// baseURL is required at boot; the caller validates env config so we
	// don't carry a hard-coded fallback in source.
	return &Client{
		APIKey:  apiKey,
		BaseURL: baseURL,
		HTTP:    &http.Client{Timeout: 30 * time.Second},
	}
}

// SetProviders replaces the in-memory provider list. Empty list falls back to
// the legacy single-provider config supplied to New().
func (c *Client) SetProviders(ps []Provider) {
	c.mu.Lock()
	defer c.mu.Unlock()
	sort.Slice(ps, func(i, j int) bool { return ps[i].Pri < ps[j].Pri })
	c.providers = ps
}

func (c *Client) providersSnapshot() []Provider {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if len(c.providers) == 0 {
		return []Provider{{Name: "primary", BaseURL: c.BaseURL, APIKey: c.APIKey, Enabled: true, Pri: 0}}
	}
	out := make([]Provider, 0, len(c.providers))
	for _, p := range c.providers {
		if p.Enabled {
			out = append(out, p)
		}
	}
	if len(out) == 0 {
		return []Provider{{Name: "primary", BaseURL: c.BaseURL, APIKey: c.APIKey, Enabled: true, Pri: 0}}
	}
	return out
}

// LookupResult mirrors the upstream JSON. Provider is filled in by the router.
type LookupResult struct {
	Success         bool            `json:"success"`
	Query           string          `json:"query,omitempty"`
	Numbers         []string        `json:"numbers,omitempty"`
	Country         string          `json:"country,omitempty"`
	TokensRemaining int             `json:"tokens_remaining"`
	AdditionalData  json.RawMessage `json:"additional_data,omitempty"`
	Error           string          `json:"error,omitempty"`
	Provider        string          `json:"provider,omitempty"`
}

// Lookup walks providers in priority order; the first provider whose HTTP
// call succeeds (status < 500, parseable JSON) wins, regardless of whether
// the JSON `success` field is true. Network-level failures fall through.
func (c *Client) Lookup(ctx context.Context, query string) (*LookupResult, error) {
	var lastErr error
	for _, p := range c.providersSnapshot() {
		res, err := c.lookupOne(ctx, p, query)
		if err != nil {
			lastErr = err
			continue
		}
		res.Provider = p.Name
		return res, nil
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("no providers configured")
	}
	return nil, lastErr
}

func (c *Client) lookupOne(ctx context.Context, p Provider, query string) (*LookupResult, error) {
	u, _ := url.Parse(p.BaseURL + "/lookup")
	q := u.Query()
	q.Set("key", p.APIKey)
	q.Set("query", query)
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return nil, fmt.Errorf("[%s] http: %w", p.Name, err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 500 || resp.StatusCode == 522 || resp.StatusCode == 0 {
		return nil, fmt.Errorf("[%s] unavailable: status %d", p.Name, resp.StatusCode)
	}
	var out LookupResult
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("[%s] parse: %w (body: %s)", p.Name, err, raw)
	}
	return &out, nil
}

type BalanceResult struct {
	TokensRemaining int    `json:"tokens_remaining"`
	Error           string `json:"error,omitempty"`
	Provider        string `json:"provider,omitempty"`
}

// Balance polls the primary provider only — fallback providers each have
// their own balance, surfaced separately via BalancePerProvider.
func (c *Client) Balance(ctx context.Context) (*BalanceResult, error) {
	for _, p := range c.providersSnapshot() {
		res, err := c.balanceOne(ctx, p)
		if err != nil {
			continue
		}
		res.Provider = p.Name
		return res, nil
	}
	return nil, fmt.Errorf("no providers reachable")
}

// BalancePerProvider returns each enabled provider's balance.
func (c *Client) BalancePerProvider(ctx context.Context) []BalanceResult {
	out := []BalanceResult{}
	for _, p := range c.providersSnapshot() {
		r, err := c.balanceOne(ctx, p)
		if err != nil {
			out = append(out, BalanceResult{Provider: p.Name, Error: err.Error()})
			continue
		}
		r.Provider = p.Name
		out = append(out, *r)
	}
	return out
}

func (c *Client) balanceOne(ctx context.Context, p Provider) (*BalanceResult, error) {
	u, _ := url.Parse(p.BaseURL + "/balance")
	q := u.Query()
	q.Set("key", p.APIKey)
	u.RawQuery = q.Encode()
	req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return nil, fmt.Errorf("[%s] balance http: %w", p.Name, err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 500 || resp.StatusCode == 522 {
		return nil, fmt.Errorf("[%s] balance unavailable: status %d", p.Name, resp.StatusCode)
	}
	var out BalanceResult
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("[%s] balance parse: %w (body: %s)", p.Name, err, raw)
	}
	return &out, nil
}
