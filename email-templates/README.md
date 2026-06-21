# Thalovo Email Templates

Use the Supabase templates for authentication emails that Supabase sends.
Use the SendGrid templates for product emails that your app sends through SendGrid.

## Supabase

- `supabase-confirm-signup.html`
- `supabase-reset-password.html`
- `supabase-password-changed.html`
- `supabase-email-changed.html`

## SendGrid

- `sendgrid-welcome.html`
- `sendgrid-free-trial-started.html`
- `sendgrid-founder-approved.html`
- `sendgrid-trial-ending-soon.html`

SendGrid variables use names like `{{first_name}}` and `{{login_url}}`.
Supabase variables use names like `{{ .Token }}` and `{{ .ConfirmationURL }}`.

Current founder flow: approval unlocks the Founder checkout; it does not make
Founder access free by default. Use `{{checkout_url}}` and `{{founder_price}}`
when sending the founder-approved SendGrid email.
