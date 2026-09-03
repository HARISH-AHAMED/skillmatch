This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Environment

Set these before deploying. Names only — never commit values.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string used by Prisma. |
| `AUTH_GOOGLE_ID` | Yes | Google OAuth client id. |
| `AUTH_GOOGLE_SECRET` | Yes | Google OAuth client secret. |
| `CRON_SECRET` | **Yes in production** | Shared secret for the scheduled message-retention job. |

### `CRON_SECRET` — deployment precondition

`/api/cron/cleanup-messages` permanently deletes every message older than the
7-day retention window, across every project. It therefore **fails closed**: if
`CRON_SECRET` is unset or empty, every request to it — GET and DELETE alike —
is rejected with 401 and nothing is deleted. The proxy cannot guard this route
because its matcher excludes `/api`, so the shared secret is the only check.

Configure the scheduler to send the secret as a bearer token:

```
Authorization: Bearer $CRON_SECRET
```

If the variable is missing in production, the deployment still boots and serves
traffic normally; the retention job simply never runs and messages accumulate
past the window.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
