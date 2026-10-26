# Environment Variable Template

Copy variable NAMES into the actual `.env.example` only after confirming the stack requires them. These are examples, not credentials.

```dotenv
# Public application URL, if required
APP_BASE_URL=http://localhost:3000

# Database URL — supply only through a local untracked .env or secret manager
DATABASE_URL=

# Authentication provider variables — only if used by this project
AUTH_SECRET=
AUTH_ISSUER_URL=
AUTH_CLIENT_ID=
AUTH_CLIENT_SECRET=

# Optional observability provider — only if used and disclosed
OBSERVABILITY_DSN=
```

Never commit real values. Do not expose server-only variables to browser bundles. The AI developer must adapt variable names to the actual framework/provider and must not create unused fake configuration.
