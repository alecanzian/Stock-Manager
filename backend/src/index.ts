import express, { Request, Response } from "express";
import cors from "cors";
import { Pool } from "pg";

const app = express();
const frontend_port = Number(process.env.FRONTEND_PORT);
app.use(cors({ origin: `http://localhost:${frontend_port}` }));
app.use(express.json());

const backend_port = Number(process.env.BACKEND_PORT);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.get("/health", (_req: Request, res: Response) => {
  console.log("Health check endpoint called");
  res.json({ status: "ok" });
});

app.get("/health/db", async (_req: Request, res: Response) => {
  console.log("Database health check endpoint called");
  try {
    const result = await pool.query("SELECT NOW() AS now");
    res.json({ status: "ok", now: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: "error", message: String(err) });
  }
});

app.get("/items", async (_req: Request, res: Response) => {
  console.log("Items endpoint called");
  try {
    const result = await pool.query(
      "SELECT id, name, quantity, barcode FROM products ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ status: "error", message: String(err) });
  }
});

app.post("/bd-init", async (_req: Request, res: Response) => {
  console.log("DB init endpoint called");
  try {
    await initDb();
    res.json({ status: "ok", message: "schema ready, sample products inserted" });
  } catch (err) {
    res.status(500).json({ status: "error", message: String(err) });
  }
});

app.post("/bd-reset", async (_req: Request, res: Response) => {
  console.log("DB reset endpoint called");
  try {
    await pool.query("DROP TABLE IF EXISTS products CASCADE");
    res.json({ status: "ok", message: "products table dropped" });
  } catch (err) {
    res.status(500).json({ status: "error", message: String(err) });
  }
});

app.post("/items/adjust", async (req: Request, res: Response) => {
  const barcode = typeof req.body?.item === "string" ? req.body.item.trim() : "";
  const delta = Number(req.body?.amount);
  console.log(`Adjust quantity for barcode ${barcode} by ${delta}`);

  if (!barcode) {
    return res.status(400).json({ status: "error", message: "item (barcode) is required" });
  }
  if (!Number.isInteger(delta) || delta === 0) {
    return res.status(400).json({ status: "error", message: "amount must be a non-zero integer" });
  }

  try {
    const { code, body } = await adjustStock(barcode, delta);
    res.status(code).json(body);
  } catch (err) {
    res.status(500).json({ status: "error", message: String(err) });
  }
});

// List buttons: +1 / -1 for the product with this barcode
app.post("/items/:barcode/add", async (req: Request, res: Response) => {
  const barcode = req.params.barcode;
  console.log(`Add 1 for barcode ${barcode}`);
  try {
    const { code, body } = await adjustStock(barcode, 1);
    res.status(code).json(body);
  } catch (err) {
    res.status(500).json({ status: "error", message: String(err) });
  }
});

app.post("/items/:barcode/subtract", async (req: Request, res: Response) => {
  const barcode = req.params.barcode;
  console.log(`Subtract 1 for barcode ${barcode}`);
  try {
    const { code, body } = await adjustStock(barcode, -1);
    res.status(code).json(body);
  } catch (err) {
    res.status(500).json({ status: "error", message: String(err) });
  }
});

// Create a new product. Body: { barcode, name, quantity? }
app.post("/items", async (req: Request, res: Response) => {
  const barcode = typeof req.body?.barcode === "string" ? req.body.barcode.trim() : "";
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const quantity = req.body?.quantity === undefined ? 0 : Number(req.body.quantity);
  console.log(`Create product "${name}" with barcode ${barcode}, quantity ${quantity}`);

  if (!barcode) {
    return res.status(400).json({ status: "error", message: "barcode is required" });
  }
  if (!name) {
    return res.status(400).json({ status: "error", message: "name is required" });
  }
  if (!Number.isInteger(quantity) || quantity < 0) {
    return res.status(400).json({ status: "error", message: "quantity must be an integer >= 0" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO products (name, quantity, barcode)
       VALUES ($1, $2, $3)
       ON CONFLICT (barcode) DO NOTHING
       RETURNING id, name, quantity, barcode`,
      [name, quantity, barcode]
    );

    if (result.rowCount === 0) {
      return res.status(409).json({ status: "error", message: "a product with that barcode already exists" });
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ status: "error", message: String(err) });
  }
});

app.listen(backend_port, "0.0.0.0", () => {
  console.log(`Backend listening on port ${backend_port}`);
  initDb()
    .then(() => console.log("Database initialized"))
    .catch((err) => {
      console.error("DB init failed:", err);
      process.exit(1);
    });
});

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        barcode TEXT NOT NULL UNIQUE
      )
    `);
    await client.query(`
      INSERT INTO products (name, quantity, barcode) VALUES
        ('Apples', 5, '1000000000001'),
        ('Bananas', 12, '1000000000002'),
        ('Acqua Panna', 1, '8000815565253')
      ON CONFLICT (barcode) DO NOTHING
    `);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Shared stock logic. Returns the HTTP status and the JSON body to send.
async function adjustStock(barcode: string, delta: number) {
  const result = await pool.query(
    `UPDATE products
       SET quantity = quantity + $2
     WHERE barcode = $1 AND quantity + $2 >= 0
     RETURNING id, name, quantity, barcode`,
    [barcode, delta]
  );

  if (result.rowCount === 0) {
    const exists = await pool.query("SELECT 1 FROM products WHERE barcode = $1", [barcode]);
    if (exists.rowCount === 0) {
      return { code: 404, body: { status: "error", message: "no product with that barcode" } };
    }
    return { code: 409, body: { status: "error", message: "not enough stock to remove that amount" } };
  }
  return { code: 200, body: result.rows[0] };
}