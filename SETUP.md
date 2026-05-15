# Supabase setup

## Local development
Create a `.env` file:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
```

## Netlify
In **Site configuration → Environment variables**, add:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then redeploy.

## Security reminders
- Do **not** use your database password in frontend code.
- Do **not** use your Supabase service role key in frontend code.
- Keep Row Level Security enabled on `public.audits`.
