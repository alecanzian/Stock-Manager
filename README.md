# Stock Manager

A simple stock manager made of three Docker services: a PostgreSQL database, an Express backend, and a static HTML frontend served by nginx.

## Prerequisites

- Docker and Docker Compose
- A `.env` file in the project root (next to `docker-compose.yml`)

Example `.env`:

```dotenv
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=stockmanager
POSTGRES_HOST_PORT=5432
POSTGRES_CONTAINER_PORT=5432

DATABASE_URL=postgres://postgres:postgres@postgres:5432/stockmanager

BACKEND_CONTAINER_PORT=3001
BACKEND_HOST_PORT=3001
API_URL=http://localhost:3001

FRONTEND_CONTAINER_PORT=3000
FRONTEND_HOST_PORT=3000
```

## Setup

Build and start the stack:

```bash
docker compose up --build
```

The backend creates the `products` table and inserts sample products on startup, so no extra step is needed.

## Usage

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

Stop the stack with `Ctrl+C`, or run `docker compose down` to remove the containers. Add `-v` to also delete the database volume.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Checks that the backend is running |
| GET | `/health/db` | Checks the database connection |
| GET | `/items` | Lists all products with their quantity |
| POST | `/items/:id/add` | Increases a product's quantity by 1 |
| POST | `/items/:id/subtract` | Decreases a product's quantity by 1 (not below 0) |
| POST | `/bd-init` | Creates the `products` table if missing and inserts sample products |
| POST | `/bd-reset` | Drops the `products` table |

Example calls:

```bash
curl http://localhost:3001/items
curl -X POST http://localhost:3001/items/1/add
curl -X POST http://localhost:3001/bd-reset
```


## Postman

A ready-made Postman collection with all the endpoints is in `postman/stock-manager.postman_collection.json`.

To import it, open Postman, click **Import**, and select that file.