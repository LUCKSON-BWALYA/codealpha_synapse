/**
 * ConnectApp — Backend Server
 */

require("dotenv").config();
const express      = require("express");
const http         = require("http");
const { Server }   = require("socket.io");
const cors         = require("cors");
const helmet       = require("helmet");
const rateLimit    = require("express-rate-limit");
const morgan       = require("morgan");

const { connectRedis }   = require("./lib/redis");
const { socketHandler }  = require("./sockets/signaling");
const authRoutes         = require("./routes/auth");
const roomRoutes         = require("./routes/rooms");
const userRoutes         = require("./routes/users");
const { authenticateJWT } = require("./middleware/auth");

// ─── App ──────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const PORT       = process.env.PORT       || 4000;

// ─── Security middleware ──────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false, // needed for WebRTC
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      connectSrc:  ["'self'", "wss:", "https:"],
      mediaSrc:    ["'self'", "blob:"],
      scriptSrc:   ["'self'"],
    },
  },
}));

app.use(cors({
  origin:      CLIENT_URL,
  credentials: true,
  methods:     ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));

// ─── Rate limiting ────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: "Too many requests — try again later" },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // tighter for auth endpoints
  message: { error: "Too many auth attempts" },
});

app.use(globalLimiter);

// ─── Routes ───────────────────────────────────────────────────────
app.use("/api/auth",  authLimiter, authRoutes);
app.use("/api/rooms", authenticateJWT, roomRoutes);
app.use("/api/users", authenticateJWT, userRoutes);

app.get("/health", (_, res) => res.json({
  status: "ok",
  timestamp: new Date().toISOString(),
  version: "3.0.0",
}));

// ─── Global error handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[ERROR]", err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? "Internal server error" : err.message,
  });
});

// ─── Socket.io ───────
const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ["GET","POST"], credentials: true },
  transports: ["websocket", "polling"],
  pingTimeout: 20000,
  pingInterval: 10000,
});

socketHandler(io);

// ─── Start 
async function start() {
  try {
    await connectRedis();
    server.listen(PORT, () => {
      console.log(`\n🚀  ConnectApp backend  →  http://localhost:${PORT}`);
      console.log(`    WebSocket           →  ws://localhost:${PORT}`);
      console.log(`    Environment         →  ${process.env.NODE_ENV || "development"}\n`);
    });
  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
}

start();
