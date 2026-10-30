# Stock-Manager

Stock manager application with an Express + TypeScript backend, a PostgreSQL database.

## Setup

1. Copy the environment template and fill in your values:

   ```bash
   cp .env.example .env
   ```

2. Install backend dependencies (run once, or after changing `package.json`):

   ```bash
   docker compose run --rm --no-deps backend npm install
   ```

3. Start everything:

   ```bash
   docker compose up --build
   ```

The backend is available at `http://localhost:<BACKEND_HOST_PORT>`.

## Adding a backend package

Install the package through the backend container, then rebuild:

```bash
docker compose run --rm --no-deps backend npm install <package>
docker compose up --build
```

For example:

```bash
docker compose run --rm --no-deps backend npm install cors
```