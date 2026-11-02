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
      "SELECT id, name, quantity FROM products ORDER BY id"
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

app.post("/items/:id/add", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  console.log(`Add quantity for product ${id}`);
  try {
    const result = await pool.query(
      "UPDATE products SET quantity = quantity + 1 WHERE id = $1 RETURNING id, name, quantity",
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ status: "error", message: "product not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ status: "error", message: String(err) });
  }
});

app.post("/items/:id/subtract", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  console.log(`Subtract quantity for product ${id}`);
  try {
    const result = await pool.query(
      `UPDATE products
         SET quantity = quantity - 1
       WHERE id = $1 AND quantity > 0
       RETURNING id, name, quantity`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(409).json({ status: "error", message: "product not found or quantity is already 0" });
    }
    res.json(result.rows[0]);
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
        ('Oranges', 0, '1000000000003')
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