import express, { Request, Response } from "express";
import { Pool } from "pg";

const app = express();
app.use(express.json());

const port = Number(process.env.PORT);
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

app.listen(port, "0.0.0.0", () => {
  console.log(`Backend listening on port ${port}`);
});