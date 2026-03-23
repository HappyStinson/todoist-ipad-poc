# Todoist iPad POC (TypeScript Client)

A touch-friendly web app for older iPads, backed by the official Todoist API TypeScript client (`@doist/todoist-api-typescript`).

## Features

- Uses official `TodoistApi` client on the server
- Inbox-focused view (project + tasks only)
- Add task directly to Inbox
- Shows all tasks that have a due date (across projects)
- Marks tasks complete
- Hides connection panel after successful auth
- Task links open in a new browser tab

## Run locally

Install dependencies:

```bash
cd /Users/happy/code/cursor-demo
npm install
```

Create your env file:

```bash
cp .env.example .env
```

Edit `.env` and set your real `TODOIST_API_TOKEN`.
Also set `APP_ACCESS_KEY` to a long random value.

Start the dev server:

```bash
npm run dev
```

Then open:

- `http://localhost:5173` on your Mac, or
- `http://<your-computer-ip>:5173` from the iPad (same Wi-Fi).

## Deploy on Netlify

This repo is configured for Netlify:

- Static site served from `public/`
- API served by Netlify Function at `netlify/functions/api.ts`
- Redirect rule maps `/api/*` to the function (`netlify.toml`)

Steps:

1. Push this repo to GitHub.
2. In Netlify, create a new site from that repo.
3. Build settings can stay default (config is read from `netlify.toml`).
4. Add environment variable in Netlify:
   - `TODOIST_API_TOKEN=your_token`
- `APP_ACCESS_KEY=your_long_random_value`
5. Deploy.

After deploy, open your Netlify URL on iPad.

## Get your Todoist token

In Todoist, open settings and find your personal API token in integrations/developer options, then put it in `.env`.

## Notes

- Token stays server-side in `.env` and is not stored in browser local storage.
- API requires `APP_ACCESS_KEY`; the browser prompts once and stores it locally on-device.
- This is a proof of concept focused on list/task read + complete flows.
