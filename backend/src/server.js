const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { evaluateCase } = require("./agents");

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Middleware ─────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50kb" }));

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        console.log(`${req.method} ${req.path} → ${res.statusCode} (${Date.now() - start}ms)`);
    });
    next();
});

// ─── Routes ─────────────────────────────────────────────────

// Health check
app.get("/", (req, res) => {
    res.json({ ok: true, service: "agent-jury-backend", version: "1.0.0" });
});

app.get("/health", (req, res) => {
    res.json({ ok: true, service: "agent-jury-backend" });
});

// Evaluate a case
app.post("/evaluate", async (req, res) => {
    try {
        const { case_text } = req.body;

        if (!case_text || typeof case_text !== "string" || case_text.trim().length === 0) {
            return res.status(400).json({ error: "case_text is required and must be a non-empty string" });
        }

        if (case_text.length > 4000) {
            return res.status(400).json({ error: "case_text must be 4000 characters or less" });
        }

        console.log(`\n📝 New case received (${case_text.length} chars)`);

        const result = await evaluateCase(case_text.trim());
        res.json(result);
    } catch (err) {
        console.error("Evaluation error:", err);
        res.status(500).json({ error: "Evaluation failed", details: err.message });
    }
});

// ─── Start Server ───────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🏛️  Agent Jury backend listening on http://localhost:${PORT}`);

    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === "your_openrouter_api_key_here") {
        console.warn("⚠️  WARNING: OPENROUTER_API_KEY is not set! LLM calls will fail.");
    } else {
        console.log("✅ OpenRouter API key detected");
    }

    console.log(`📡 Model: ${process.env.LLM_MODEL || "google/gemma-3-1b-it:free"}\n`);
});
