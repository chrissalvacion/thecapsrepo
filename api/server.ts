import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { Pool as PgPool } from "pg";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";

dotenv.config();

type QueryResult<T = any> = [T[], unknown];

type CompatConnection = {
  query: <T = any>(sql: string, params?: unknown[]) => Promise<QueryResult<T>>;
  release: () => void;
};

type CompatPool = {
  getConnection: () => Promise<CompatConnection>;
};

const JWT_SECRET = process.env.JWT_SECRET || "f3c1b7a9e2d84d6f9a0c4b1e7f2a9d3c6b8e1f7a4c9d2e5f0a7b3c6d9e2f4a1b";
const PORT = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT) : 3000;
const isDirectExecution = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

function translatePlaceholders(sql: string) {
  let parameterIndex = 0;
  return sql.replace(/\?/g, () => `$${++parameterIndex}`);
}

function buildConnectionString() {
  if (process.env.SUPABASE_DB_POOLER_URL) return process.env.SUPABASE_DB_POOLER_URL;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.SUPABASE_DATABASE_URL) return process.env.SUPABASE_DATABASE_URL;

  if (process.env.VERCEL === "1" || (!isDirectExecution && process.env.NODE_ENV === "production")) {
    return "";
  }

  const host = process.env.PGHOST || process.env.DB_HOST || "localhost";
  const port = process.env.PGPORT || process.env.DB_PORT || "5432";
  const user = encodeURIComponent(process.env.PGUSER || process.env.DB_USER || "postgres");
  const password = encodeURIComponent(process.env.PGPASSWORD || process.env.DB_PASSWORD || "postgres");
  const database = process.env.PGDATABASE || process.env.DB_NAME || "capsrepo";

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

function getHostFromConnectionString(connectionString?: string) {
  try {
    if (!connectionString) return undefined;
    return new URL(connectionString).hostname;
  } catch {
    return undefined;
  }
}

function normalizeConnectionString(connectionString: string) {
  try {
    const parsed = new URL(connectionString);
    parsed.searchParams.delete("sslmode");
    parsed.searchParams.delete("sslrootcert");
    parsed.searchParams.delete("sslcert");
    parsed.searchParams.delete("sslkey");
    parsed.searchParams.delete("uselibpqcompat");
    return parsed.toString();
  } catch {
    return connectionString;
  }
}

function logSupabaseConnectionHint(error: unknown, connectionString?: string) {
  const e = error as { code?: string; hostname?: string };
  const hostFromError = e?.hostname;
  const hostFromUrl = getHostFromConnectionString(connectionString);
  const host = hostFromError || hostFromUrl || "";

  const isSupabaseDirectHost = /^db\..+\.supabase\.co$/i.test(host);
  if (e?.code === "ENOTFOUND" && isSupabaseDirectHost) {
    console.error("Detected Supabase direct DB hostname (IPv6-only) with no local IPv6 route.");
    console.error("Use Supabase connection pooling (IPv4-capable) instead:");
    console.error("1) Open Supabase Dashboard > Project Settings > Database > Connection string > Transaction pooler");
    console.error("2) Set SUPABASE_DB_POOLER_URL in .env");
    console.error("3) Example format:");
    console.error("   postgresql://postgres.<project-ref>:<db-password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require");
  }
}

function createCompatPool(): CompatPool {
  const rawConnectionString = buildConnectionString();
  const connectionString = rawConnectionString ? normalizeConnectionString(rawConnectionString) : rawConnectionString;
  if (!connectionString) {
    return {
      getConnection: async () => {
        throw new Error("Missing SUPABASE_DB_POOLER_URL or DATABASE_URL in Vercel environment variables.");
      },
    };
  }

  const shouldUseSsl = process.env.NODE_ENV === "production" || process.env.PGSSLMODE === "require";

  const pgPool = new PgPool({
    connectionString,
    ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
    max: 10,
  });

  return {
    getConnection: async () => {
      const client = await pgPool.connect();

      return {
        query: async <T = any>(sql: string, params: unknown[] = []) => {
          const result = await client.query(translatePlaceholders(sql), params);
          return [result.rows as T[], result];
        },
        release: () => client.release(),
      };
    },
  };
}

let pool: CompatPool = createCompatPool();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || "capsrepo_admin",
  password: process.env.DB_PASSWORD || "UC0alMh4CXsb1TiP",
  database: process.env.DB_NAME || "capsrepo",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Initialize Database
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();

    await connection.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        password TEXT NOT NULL,
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        access_code TEXT UNIQUE,
        team_name TEXT,
        proponents TEXT NOT NULL DEFAULT '[]',
        program TEXT,
        class TEXT,
        email TEXT,
        contact_num TEXT,
        adviser TEXT,
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        teamId TEXT REFERENCES teams(id) ON DELETE CASCADE,
        project_title TEXT,
        school_year TEXT,
        description TEXT,
        objectives TEXT,
        status TEXT,
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS defenses (
        id TEXT PRIMARY KEY,
        teamId TEXT REFERENCES teams(id) ON DELETE CASCADE,
        defense_type TEXT,
        defense_date DATE,
        defense_time TIME,
        panelists TEXT NOT NULL DEFAULT '[]',
        recommendations TEXT NOT NULL DEFAULT '',
        suggestions TEXT NOT NULL DEFAULT '',
        status TEXT,
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS consultations (
        id TEXT PRIMARY KEY,
        teamId TEXT REFERENCES teams(id) ON DELETE CASCADE,
        issues TEXT,
        recommendations TEXT,
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS panelists (
        id TEXT PRIMARY KEY,
        name TEXT,
        designation TEXT,
        position TEXT,
        email TEXT,
        contact TEXT,
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Insert default admin if not exists
    const adminEmail = "christianraelopezs@gmail.com";
    const [existingUser] = await connection.query("SELECT * FROM users WHERE email = ?", [adminEmail]);
    
    if (!existingUser || (Array.isArray(existingUser) && existingUser.length === 0)) {
      const hashedPassword = bcrypt.hashSync("admin123", 10);
      await connection.query("INSERT INTO users (email, password) VALUES (?, ?)", [
        adminEmail,
        hashedPassword,
      ]);
      console.log("✓ Default admin user created");
    }

    connection.release();
    console.log("✓ Database initialized successfully");
  } catch (error) {
    logSupabaseConnectionHint(error, buildConnectionString());
    console.error("Database initialization error:", error);
    if (isDirectExecution) {
      process.exit(1);
    }
    throw error;
  }
}

async function generateUniqueAccessCode() {
  while (true) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const connection = await pool.getConnection();
    const [rows]: any = await connection.query("SELECT id FROM teams WHERE access_code = ? LIMIT 1", [code]);
    connection.release();
    if (!rows.length) return code;
  }
}

async function backfillMissingAccessCodes() {
  const connection = await pool.getConnection();
  const [teams]: any = await connection.query("SELECT id FROM teams WHERE access_code IS NULL OR access_code = ''");
  connection.release();

  for (const team of teams) {
    const code = await generateUniqueAccessCode();
    const c = await pool.getConnection();
    await c.query("UPDATE teams SET access_code = ? WHERE id = ?", [code, team.id]);
    c.release();
  }
}


async function startServer() {
  if (isDirectExecution) {
    await initializeDatabase();
    await backfillMissingAccessCodes();
  }

  const app = express();
  app.use(express.json());
  const isDevServer = isDirectExecution && process.argv.includes("--dev");
  const shouldServeStaticClient = isDirectExecution && (process.argv.includes("--serve-static") || process.env.NODE_ENV === "production");
  const distPath = path.join(process.cwd(), "dist");
  const clientEntryPath = path.join(distPath, "index.html");

  // CORS Configuration - more restrictive in production
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? (process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ['*'])
    : ['*'];

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
      res.header('Access-Control-Allow-Origin', origin || '*');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // --- Auth Routes ---
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const connection = await pool.getConnection();
      const [users]: any = await connection.query("SELECT * FROM users WHERE email = ?", [email]);
      connection.release();

      if (users.length > 0 && bcrypt.compareSync(password, users[0].password)) {
        const token = jwt.sign({ id: users[0].id, email: users[0].email }, JWT_SECRET);
        res.json({ token, user: { id: users[0].id, email: users[0].email } });
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/auth/me", authenticate, async (req: any, res) => {
    try {
      const connection = await pool.getConnection();
      const [users]: any = await connection.query("SELECT id, name, email FROM users WHERE id = ?", [req.user.id]);
      connection.release();

      if (users.length > 0) {
        res.json({ user: users[0] });
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (err) {
      console.error("Auth me error:", err);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // --- Account Settings Routes ---
  app.patch("/api/auth/profile", authenticate, async (req: any, res) => {
    try {
      const { name, email, currentPassword } = req.body;
      if (!name || !email || !currentPassword) {
        return res.status(400).json({ error: "Name, email, and current password are required" });
      }
      const connection = await pool.getConnection();
      const [users]: any = await connection.query("SELECT * FROM users WHERE id = ?", [req.user.id]);
      if (!users.length || !bcrypt.compareSync(currentPassword, users[0].password)) {
        connection.release();
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      // Check email uniqueness if changed
      if (email !== users[0].email) {
        const [existing]: any = await connection.query("SELECT id FROM users WHERE email = ? AND id != ?", [email, req.user.id]);
        if (existing.length) {
          connection.release();
          return res.status(409).json({ error: "Email is already in use" });
        }
      }
      await connection.query("UPDATE users SET name = ?, email = ? WHERE id = ?", [name, email, req.user.id]);
      connection.release();
      res.json({ success: true, user: { id: req.user.id, name, email } });
    } catch (err) {
      console.error("Update profile error:", err);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.patch("/api/auth/password", authenticate, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current and new passwords are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters" });
      }
      const connection = await pool.getConnection();
      const [users]: any = await connection.query("SELECT * FROM users WHERE id = ?", [req.user.id]);
      if (!users.length || !bcrypt.compareSync(currentPassword, users[0].password)) {
        connection.release();
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      const hashed = bcrypt.hashSync(newPassword, 10);
      await connection.query("UPDATE users SET password = ? WHERE id = ?", [hashed, req.user.id]);
      connection.release();
      res.json({ success: true });
    } catch (err) {
      console.error("Update password error:", err);
      res.status(500).json({ error: "Failed to update password" });
    }
  });

  // --- Teams Routes ---
  app.get("/api/teams", async (req, res) => {
    try {
      const connection = await pool.getConnection();
      const [teams]: any = await connection.query("SELECT * FROM teams ORDER BY createdAt DESC");
      connection.release();

      res.json(
        teams.map((t: any) => ({
          ...t,
          proponents: t.proponents ? JSON.parse(t.proponents) : [],
        }))
      );
    } catch (err) {
      console.error("Get teams error:", err);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  app.get("/api/teams/:id", async (req, res) => {
    try {
      const connection = await pool.getConnection();
      const [teams]: any = await connection.query("SELECT * FROM teams WHERE id = ?", [req.params.id]);
      connection.release();

      if (teams.length === 0) return res.status(404).json({ error: "Not found" });
      const team = teams[0];
      res.json({
        ...team,
        proponents: team.proponents ? JSON.parse(team.proponents) : [],
      });
    } catch (err) {
      console.error("Get team error:", err);
      res.status(500).json({ error: "Failed to fetch team" });
    }
  });

  app.post("/api/teams", authenticate, async (req, res) => {
    try {
      const { id, team_name, proponents, program, class: classCode, email, contact_num, adviser } = req.body;
      const accessCode = await generateUniqueAccessCode();
      const connection = await pool.getConnection();
      await connection.query(
        `INSERT INTO teams (id, access_code, team_name, proponents, program, class, email, contact_num, adviser)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, accessCode, team_name, JSON.stringify(proponents), program, classCode, email, contact_num, adviser]
      );
      connection.release();
      res.json({ success: true, access_code: accessCode });
    } catch (err) {
      console.error("Create team error:", err);
      res.status(500).json({ error: "Failed to create team" });
    }
  });

  app.patch("/api/teams/:id", authenticate, async (req, res) => {
    try {
      const { team_name, proponents, program, class: classCode, email, contact_num, adviser } = req.body;
      const connection = await pool.getConnection();
      await connection.query(
        `UPDATE teams
         SET team_name = ?, proponents = ?, program = ?, class = ?, email = ?, contact_num = ?, adviser = ?
         WHERE id = ?`,
        [team_name, JSON.stringify(proponents), program, classCode, email, contact_num, adviser, req.params.id]
      );
      connection.release();
      res.json({ success: true });
    } catch (err) {
      console.error("Update team error:", err);
      res.status(500).json({ error: "Failed to update team" });
    }
  });

  app.delete("/api/teams/:id", authenticate, async (req, res) => {
    try {
      const connection = await pool.getConnection();

      await connection.query("DELETE FROM consultations WHERE teamId = ?", [req.params.id]);
      await connection.query("DELETE FROM defenses WHERE teamId = ?", [req.params.id]);
      await connection.query("DELETE FROM projects WHERE teamId = ?", [req.params.id]);
      await connection.query("DELETE FROM teams WHERE id = ?", [req.params.id]);

      connection.release();
      res.json({ success: true });
    } catch (err) {
      console.error("Delete team error:", err);
      res.status(500).json({ error: "Failed to delete team" });
    }
  });

  app.get("/api/student/team/:accessCode", async (req, res) => {
    try {
      const accessCode = req.params.accessCode;
      const connection = await pool.getConnection();
      const [teams]: any = await connection.query(
        "SELECT * FROM teams WHERE access_code = ? LIMIT 1",
        [accessCode]
      );

      if (!teams.length) {
        connection.release();
        return res.status(404).json({ error: "Team not found" });
      }

      const team = teams[0];
      const [projects]: any = await connection.query(
        "SELECT * FROM projects WHERE teamId = ? ORDER BY createdAt DESC",
        [team.id]
      );
      const [defenses]: any = await connection.query(
        "SELECT * FROM defenses WHERE teamId = ? ORDER BY defense_date DESC, defense_time DESC",
        [team.id]
      );
      connection.release();

      res.json({
        team: {
          ...team,
          proponents: team.proponents ? JSON.parse(team.proponents) : [],
        },
        projects,
        defenses: defenses.map((d: any) => ({
          ...d,
          panelists: d.panelists ? JSON.parse(d.panelists) : [],
        })),
      });
    } catch (err) {
      console.error("Student team lookup error:", err);
      res.status(500).json({ error: "Failed to lookup team" });
    }
  });

  // --- Projects Routes ---
  app.get("/api/projects", async (req, res) => {
    try {
      const teamId = req.query.teamId;
      const connection = await pool.getConnection();
      let projects;
      if (teamId) {
        [projects] = await connection.query("SELECT * FROM projects WHERE teamId = ? ORDER BY createdAt DESC", [teamId]);
      } else {
        [projects] = await connection.query("SELECT * FROM projects ORDER BY createdAt DESC");
      }
      connection.release();
      res.json(projects);
    } catch (err) {
      console.error("Get projects error:", err);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const connection = await pool.getConnection();
      const [projects]: any = await connection.query("SELECT * FROM projects WHERE id = ?", [req.params.id]);
      connection.release();

      if (projects.length === 0) {
        return res.status(404).json({ error: "Project not found" });
      }

      res.json(projects[0]);
    } catch (err) {
      console.error("Get project error:", err);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", authenticate, async (req, res) => {
    try {
      const { id, teamId, project_title, school_year, description, objectives, status } = req.body;
      const connection = await pool.getConnection();
      await connection.query(
        `INSERT INTO projects (id, teamId, project_title, school_year, description, objectives, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, teamId, project_title, school_year || null, description, objectives, status]
      );
      connection.release();
      res.json({ success: true });
    } catch (err) {
      console.error("Create project error:", err);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", authenticate, async (req, res) => {
    try {
      const { project_title, school_year, description, objectives, status } = req.body;
      const connection = await pool.getConnection();
      await connection.query(
        `UPDATE projects
         SET project_title = ?, school_year = ?, description = ?, objectives = ?, status = ?
         WHERE id = ?`,
        [project_title, school_year || null, description, objectives, status, req.params.id]
      );
      connection.release();
      res.json({ success: true });
    } catch (err) {
      console.error("Update project error:", err);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", authenticate, async (req, res) => {
    try {
      const connection = await pool.getConnection();
      await connection.query("DELETE FROM projects WHERE id = ?", [req.params.id]);
      connection.release();
      res.json({ success: true });
    } catch (err) {
      console.error("Delete project error:", err);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // --- Defenses Routes ---
  app.get("/api/defenses", async (req, res) => {
    try {
      const teamId = req.query.teamId;
      const connection = await pool.getConnection();
      let defenses;
      if (teamId) {
        [defenses] = await connection.query("SELECT * FROM defenses WHERE teamId = ? ORDER BY createdAt DESC", [teamId]);
      } else {
        [defenses] = await connection.query("SELECT * FROM defenses ORDER BY createdAt DESC");
      }
      connection.release();

      res.json(
        defenses.map((d: any) => ({
          ...d,
          panelists: d.panelists ? JSON.parse(d.panelists) : [],
        }))
      );
    } catch (err) {
      console.error("Get defenses error:", err);
      res.status(500).json({ error: "Failed to fetch defenses" });
    }
  });

  app.post("/api/defenses", authenticate, async (req, res) => {
    try {
      const { id, teamId, defense_type, defense_date, defense_time, panelists, status } = req.body;
      const connection = await pool.getConnection();
      await connection.query(
        `INSERT INTO defenses (id, teamId, defense_type, defense_date, defense_time, panelists, status, recommendations, suggestions)
         VALUES (?, ?, ?, ?, ?, ?, ?, '', '')`,
        [id, teamId, defense_type, defense_date, defense_time, JSON.stringify(panelists), status]
      );
      connection.release();
      res.json({ success: true });
    } catch (err) {
      console.error("Create defense error:", err);
      res.status(500).json({ error: "Failed to create defense" });
    }
  });

  app.patch("/api/defenses/:id", authenticate, async (req, res) => {
    try {
      const { status, recommendations, suggestions } = req.body;
      const connection = await pool.getConnection();
      await connection.query(
        `UPDATE defenses SET status = ?, recommendations = ?, suggestions = ?
         WHERE id = ?`,
        [status, recommendations, suggestions, req.params.id]
      );
      connection.release();
      res.json({ success: true });
    } catch (err) {
      console.error("Update defense error:", err);
      res.status(500).json({ error: "Failed to update defense" });
    }
  });

  app.delete("/api/defenses/:id", authenticate, async (req, res) => {
    try {
      const connection = await pool.getConnection();
      await connection.query("DELETE FROM defenses WHERE id = ?", [req.params.id]);
      connection.release();
      res.json({ success: true });
    } catch (err) {
      console.error("Delete defense error:", err);
      res.status(500).json({ error: "Failed to delete defense" });
    }
  });

  // --- Consultations Routes ---
  app.get("/api/consultations", async (req, res) => {
    try {
      const teamId = req.query.teamId;
      const connection = await pool.getConnection();
      let consultations;
      if (teamId) {
        [consultations] = await connection.query(
          "SELECT * FROM consultations WHERE teamId = ? ORDER BY createdAt DESC",
          [teamId]
        );
      } else {
        [consultations] = await connection.query("SELECT * FROM consultations ORDER BY createdAt DESC");
      }
      connection.release();
      res.json(consultations);
    } catch (err) {
      console.error("Get consultations error:", err);
      res.status(500).json({ error: "Failed to fetch consultations" });
    }
  });

  app.get("/api/consultations/:id", async (req, res) => {
    try {
      const connection = await pool.getConnection();
      const [consultations]: any = await connection.query("SELECT * FROM consultations WHERE id = ?", [req.params.id]);
      connection.release();

      if (consultations.length === 0) {
        return res.status(404).json({ error: "Consultation not found" });
      }

      res.json(consultations[0]);
    } catch (err) {
      console.error("Get consultation error:", err);
      res.status(500).json({ error: "Failed to fetch consultation" });
    }
  });

  app.post("/api/consultations", authenticate, async (req, res) => {
    try {
      const { id, teamId, issues, recommendations } = req.body;
      const connection = await pool.getConnection();
      await connection.query(
        `INSERT INTO consultations (id, teamId, issues, recommendations)
         VALUES (?, ?, ?, ?)`,
        [id, teamId, issues, recommendations]
      );
      connection.release();
      res.json({ success: true });
    } catch (err) {
      console.error("Create consultation error:", err);
      res.status(500).json({ error: "Failed to create consultation" });
    }
  });

  app.patch("/api/consultations/:id", authenticate, async (req, res) => {
    try {
      const { recommendations } = req.body;
      const connection = await pool.getConnection();
      await connection.query(
        `UPDATE consultations
         SET recommendations = ?
         WHERE id = ?`,
        [recommendations, req.params.id]
      );
      connection.release();
      res.json({ success: true });
    } catch (err) {
      console.error("Update consultation error:", err);
      res.status(500).json({ error: "Failed to update consultation" });
    }
  });

  // --- Panelists Routes ---
  app.get("/api/panelists", async (req, res) => {
    try {
      const connection = await pool.getConnection();
      const [panelists] = await connection.query("SELECT * FROM panelists ORDER BY name ASC");
      connection.release();
      res.json(panelists);
    } catch (err) {
      console.error("Get panelists error:", err);
      res.status(500).json({ error: "Failed to fetch panelists" });
    }
  });

  app.post("/api/panelists", authenticate, async (req, res) => {
    try {
      const { id, name, designation, position, email, contact } = req.body;
      const connection = await pool.getConnection();
      await connection.query(
        `INSERT INTO panelists (id, name, designation, position, email, contact)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, name, designation, position, email, contact]
      );
      connection.release();
      res.json({ success: true });
    } catch (err) {
      console.error("Create panelist error:", err);
      res.status(500).json({ error: "Failed to create panelist" });
    }
  });

  app.patch("/api/panelists/:id", authenticate, async (req, res) => {
    try {
      const { name, designation, position, email, contact } = req.body;
      const connection = await pool.getConnection();
      await connection.query(
        `UPDATE panelists 
         SET name = ?, designation = ?, position = ?, email = ?, contact = ?
         WHERE id = ?`,
        [name, designation, position, email, contact, req.params.id]
      );
      connection.release();
      res.json({ success: true });
    } catch (err) {
      console.error("Update panelist error:", err);
      res.status(500).json({ error: "Failed to update panelist" });
    }
  });

  app.delete("/api/panelists/:id", authenticate, async (req, res) => {
    try {
      const connection = await pool.getConnection();
      await connection.query("DELETE FROM panelists WHERE id = ?", [req.params.id]);
      connection.release();
      res.json({ success: true });
    } catch (err) {
      console.error("Delete panelist error:", err);
      res.status(500).json({ error: "Failed to delete panelist" });
    }
  });

  // Vite middleware for development
  if (isDevServer) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (shouldServeStaticClient) {
    if (!fs.existsSync(clientEntryPath)) {
      throw new Error("Build output not found. Run npm run build before starting the server in static mode.");
    }
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  return app;
}

const app = await startServer().catch((err) => {
  console.error("Failed to start server:", err);
  if (isDirectExecution) {
    process.exit(1);
  }
  throw err;
});

if (isDirectExecution) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n✓ Server running at http://localhost:${PORT}`);
    console.log(`✓ Connected to PostgreSQL/Supabase at ${buildConnectionString()}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || "development"}\n`);
  });
}

export default app;
