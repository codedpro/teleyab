// Package email wraps Resend for transactional sends. In dev (no API key)
// the message is logged so the magic link still surfaces in stdout.
package email

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"
)

const apiURL = "https://api.resend.com/emails"

var ErrNotConfigured = errors.New("email: RESEND_API_KEY not configured")

type Client struct {
	APIKey string
	From   string
	HTTP   *http.Client
}

func New(apiKey, from string) *Client {
	return &Client{APIKey: apiKey, From: from, HTTP: &http.Client{Timeout: 15 * time.Second}}
}

type sendReq struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html,omitempty"`
	Text    string   `json:"text,omitempty"`
}

func (c *Client) Send(ctx context.Context, to, subject, html, text string) error {
	if c.APIKey == "" {
		return ErrNotConfigured
	}
	body, err := json.Marshal(sendReq{From: c.From, To: []string{to}, Subject: subject, HTML: html, Text: text})
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, "POST", apiURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return fmt.Errorf("email: send: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("email: status %d: %s", resp.StatusCode, string(b))
	}
	return nil
}
