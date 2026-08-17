# Migration baseline

This project was previously schema-managed with `prisma db push` and had **no
migration history**. `0_init` is a generated baseline describing the schema as it
already existed at the start of the audit remediation (branch
`remediation/audit-backlog`).

`0_init` must **not** be run against an existing database — those tables already
exist. It is a baseline to be marked as already-applied, once per environment:

```bash
npx prisma migrate resolve --applied 0_init
```

After that, subsequent migrations in this directory apply normally with
`prisma migrate deploy`.

## Not yet applied anywhere

No migration in this directory has been executed against any database as part of
the remediation work. The remediation branch produces migration *files* only;
applying them is a deployment step that has deliberately not been taken.
