package email

import (
	"bytes"
	"fmt"
	"html/template"
	tplText "text/template"
)

// RTL magic-link template. Inline styles only — most email clients
// strip <style> blocks. The palette is the TeleYab brand: cool slate ink,
// warm cobalt accent, white card on light grey page.
const loginHTML = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head><meta charset="UTF-8"><title>{{.Subject}}</title></head>
<body style="background:#f5f6f8;margin:0;padding:0;font-family:Tahoma,Arial,sans-serif;color:#0f172a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f6f8;padding:40px 16px;">
  <tr><td align="center">
    <table role="presentation" width="560" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:36px;text-align:right;direction:rtl;">
      <tr><td>
        <div style="font-weight:700;font-size:20px;color:#0f172a;margin-bottom:6px;">TeleYab</div>
        <div style="font-size:12px;color:#64748b;margin-bottom:28px;">ورود به حساب کاربری</div>
        <h1 style="font-size:22px;color:#0f172a;margin:0 0 14px;font-weight:600;line-height:1.3;">لینک ورود شما</h1>
        <p style="font-size:14px;line-height:1.9;color:#334155;margin:0 0 24px;">برای ورود به حساب TeleYab روی دکمه‌ی زیر کلیک کنید. این لینک تا ۱۵ دقیقه معتبر است و فقط یک بار قابل استفاده است.</p>
        <p style="margin:0 0 28px;"><a href="{{.URL}}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 28px;text-decoration:none;font-weight:600;font-size:14px;border-radius:8px;">ورود به حساب</a></p>
        <p style="font-size:12px;color:#64748b;margin:0 0 8px;line-height:1.8;">اگر دکمه کار نکرد، این آدرس را در مرورگر باز کنید:</p>
        <p style="margin:0;word-break:break-all;direction:ltr;text-align:left;font-family:Menlo,Consolas,monospace;font-size:11px;color:#0f172a;background:#f1f5f9;padding:10px 12px;border-radius:6px;">{{.URL}}</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 14px;">
        <p style="font-size:11px;color:#94a3b8;margin:0;line-height:1.7;">اگر این درخواست را نکرده‌اید، می‌توانید این پیام را نادیده بگیرید.</p>
      </td></tr>
    </table>
    <div style="font-size:11px;color:#94a3b8;margin-top:14px;">TeleYab · سرویس جست‌و‌جوی شماره</div>
  </td></tr>
</table>
</body></html>`

const loginText = `لینک ورود به TeleYab

برای ورود به حساب کاربری روی لینک زیر کلیک کنید (۱۵ دقیقه اعتبار):

{{.URL}}

اگر این درخواست را نکرده‌اید، این پیام را نادیده بگیرید.
`

type loginVars struct {
	Subject string
	URL     string
}

// RenderLogin returns (subject, html, text) for the magic-link email.
func RenderLogin(loginURL string) (subject, html, text string, err error) {
	subject = "ورود به TeleYab"
	v := loginVars{Subject: subject, URL: loginURL}

	htmlTpl, err := template.New("login").Parse(loginHTML)
	if err != nil {
		return "", "", "", fmt.Errorf("parse html: %w", err)
	}
	var hb bytes.Buffer
	if err := htmlTpl.Execute(&hb, v); err != nil {
		return "", "", "", fmt.Errorf("exec html: %w", err)
	}

	textTpl, err := tplText.New("login_text").Parse(loginText)
	if err != nil {
		return "", "", "", fmt.Errorf("parse text: %w", err)
	}
	var tb bytes.Buffer
	if err := textTpl.Execute(&tb, v); err != nil {
		return "", "", "", fmt.Errorf("exec text: %w", err)
	}

	return subject, hb.String(), tb.String(), nil
}

// ──────────────────────── top-up receipt ────────────────────────────────────

const receiptHTML = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head><meta charset="UTF-8"><title>{{.Subject}}</title></head>
<body style="background:#0b1020;margin:0;padding:0;font-family:Tahoma,Arial,sans-serif;color:#e2e8f0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b1020;padding:40px 16px;">
  <tr><td align="center">
    <table role="presentation" width="560" style="max-width:560px;background:#111a36;border:1px solid #1e2a55;border-radius:14px;padding:36px;text-align:right;direction:rtl;">
      <tr><td>
        <div style="font-weight:700;font-size:20px;color:#e2e8f0;margin-bottom:6px;">TeleYab</div>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:28px;">رسید پرداخت</div>
        <h1 style="font-size:22px;color:#34d399;margin:0 0 14px;font-weight:600;line-height:1.3;">✓ پرداخت با موفقیت انجام شد</h1>
        <p style="font-size:14px;line-height:1.9;color:#cbd5e1;margin:0 0 24px;">کیف پول شما با موفقیت شارژ شد. جزئیات تراکنش:</p>
        <table role="presentation" width="100%" style="margin:0 0 24px;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;">مبلغ شارژ</td><td style="padding:8px 0;text-align:left;font-weight:700;font-size:15px;color:#e2e8f0;">{{.Amount}} تومان</td></tr>
          <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;">موجودی فعلی</td><td style="padding:8px 0;text-align:left;font-weight:700;font-size:15px;color:#e2e8f0;">{{.Balance}} تومان</td></tr>
          <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;">کد پیگیری</td><td style="padding:8px 0;text-align:left;font-family:Menlo,Consolas,monospace;direction:ltr;color:#e2e8f0;">{{.RefID}}</td></tr>
        </table>
        <p style="margin:0 0 24px;"><a href="{{.WalletURL}}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 28px;text-decoration:none;font-weight:600;font-size:14px;border-radius:8px;">مشاهده کیف پول</a></p>
        <hr style="border:none;border-top:1px solid #1e2a55;margin:28px 0 14px;">
        <p style="font-size:11px;color:#64748b;margin:0;line-height:1.7;">این رسید برای پیگیری حسابداری شماست. در صورت هر گونه ابهام در تراکنش، به پشتیبانی پیام دهید.</p>
      </td></tr>
    </table>
    <div style="font-size:11px;color:#64748b;margin-top:14px;">TeleYab · سرویس جست‌و‌جوی شماره</div>
  </td></tr>
</table>
</body></html>`

const receiptText = `رسید پرداخت TeleYab

پرداخت با موفقیت انجام شد.

مبلغ شارژ: {{.Amount}} تومان
موجودی فعلی: {{.Balance}} تومان
کد پیگیری: {{.RefID}}

مشاهدهٔ کیف پول: {{.WalletURL}}
`

type receiptVars struct {
	Subject   string
	Amount    string
	Balance   string
	RefID     string
	WalletURL string
}

func RenderReceipt(amount, balance, refID, walletURL string) (subject, html, text string, err error) {
	subject = "رسید پرداخت TeleYab"
	v := receiptVars{Subject: subject, Amount: amount, Balance: balance, RefID: refID, WalletURL: walletURL}
	htmlTpl, err := template.New("receipt").Parse(receiptHTML)
	if err != nil {
		return "", "", "", err
	}
	var hb bytes.Buffer
	if err := htmlTpl.Execute(&hb, v); err != nil {
		return "", "", "", err
	}
	textTpl, err := tplText.New("receipt_text").Parse(receiptText)
	if err != nil {
		return "", "", "", err
	}
	var tb bytes.Buffer
	if err := textTpl.Execute(&tb, v); err != nil {
		return "", "", "", err
	}
	return subject, hb.String(), tb.String(), nil
}

// ──────────────────────── operator low-balance alert ──────────────────────

const lowBalanceHTML = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head><meta charset="UTF-8"><title>{{.Subject}}</title></head>
<body style="background:#f5f6f8;margin:0;padding:24px;font-family:Tahoma,Arial,sans-serif;color:#0f172a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td align="center">
    <table role="presentation" width="560" style="max-width:560px;background:#ffffff;border:1px solid #fca5a5;border-radius:12px;padding:36px;text-align:right;direction:rtl;">
      <tr><td>
        <div style="font-weight:700;font-size:20px;color:#dc2626;margin-bottom:6px;">⚠ هشدار اپراتور</div>
        <div style="font-size:12px;color:#64748b;margin-bottom:28px;">موجودی توکن بالادست</div>
        <h1 style="font-size:22px;color:#0f172a;margin:0 0 14px;font-weight:600;line-height:1.3;">موجودی توکن کم است</h1>
        <p style="font-size:14px;line-height:1.9;color:#334155;margin:0 0 24px;">ارائه‌دهنده‌ی بالادست تنها <strong>{{.Tokens}}</strong> توکن باقی دارد. لطفاً سریعاً شارژ کنید تا جست‌و‌جوهای کاربران مختل نشود.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`

func RenderLowBalance(tokens int) (subject, html, text string, err error) {
	subject = fmt.Sprintf("⚠ TeleYab: %d توکن بالادست", tokens)
	tpl, err := template.New("lowbal").Parse(lowBalanceHTML)
	if err != nil {
		return "", "", "", err
	}
	var b bytes.Buffer
	if err := tpl.Execute(&b, map[string]any{"Subject": subject, "Tokens": tokens}); err != nil {
		return "", "", "", err
	}
	text = fmt.Sprintf("هشدار TeleYab: موجودی توکن بالادست به %d رسیده است.", tokens)
	return subject, b.String(), text, nil
}
