# Stock Manager

A simple stock manager made of three Docker services: a PostgreSQL database, an Express backend, and a static HTML frontend served by nginx.

Products are identified by their barcode.

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

## Applying code changes

- **Backend:** changes to the backend code do not require restarting the container. Restart it only if you change environment variables or dependencies.
- **Frontend:** changes to the frontend files require rebuilding the stack:

```bash
docker compose up --build
```

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Checks that the backend is running |
| GET | `/health/db` | Checks the database connection |
| GET | `/items` | Lists all products with their barcode, name and quantity |
| POST | `/items` | Creates a product. Body: `{ "barcode", "name", "quantity"? }`. Returns `201`, `400` if a field is missing, or `409` if the barcode exists |
| POST | `/items/adjust` | Changes the quantity of an existing product. Body: `{ "item": "<barcode>", "amount": <integer> }`. A negative amount removes stock. Returns `200`, `404` if the barcode is unknown, or `409` if there isn't enough stock |
| POST | `/items/:barcode/add` | Increases a product's quantity by 1 |
| POST | `/items/:barcode/subtract` | Decreases a product's quantity by 1 (not below 0) |
| POST | `/bd-init` | Creates the `products` table if missing and inserts sample products |
| POST | `/bd-reset` | Drops the `products` table |

Example calls:

```bash
curl http://localhost:3001/items

curl -X POST http://localhost:3001/items \
  -H "Content-Type: application/json" \
  -d '{"barcode":"9999999999999","name":"Pears","quantity":4}'

curl -X POST http://localhost:3001/items/adjust \
  -H "Content-Type: application/json" \
  -d '{"item":"1000000000001","amount":3}'

curl -X POST http://localhost:3001/items/1000000000001/add
curl -X POST http://localhost:3001/items/1000000000001/subtract

curl -X POST http://localhost:3001/bd-reset
```

## Postman

A ready-made Postman collection with all the endpoints is in `postman/stock-manager.postman_collection.json`.

To import it, open Postman, click **Import**, and select that file. Set the `port` variable to `3001`and `host` to `localhost`.