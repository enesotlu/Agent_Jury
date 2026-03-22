const { z } = require("zod");
require("dotenv").config();

// ─── Config ─────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";

// Free models to try in order — if one fails (429/404) the next is tried
const OPENROUTER_MODELS = [
  "arcee-ai/trinity-large-preview:free",
  process.env.LLM_MODEL || "google/gemma-3-27b-it:free",
  "microsoft/phi-4-reasoning-plus:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-r1-distill-llama-70b:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
];

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── JSON Utility ───────────────────────────────────────────
function extractJSON(text) {
  if (!text) return null;
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) return text.substring(start, end + 1).trim();
  return text.trim();
}

// ─── Zod Schemas ────────────────────────────────────────────
const AgentOutputSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  topPros: z.array(z.string()).default(["N/A"]),
  topCons: z.array(z.string()).default(["N/A"]),
  questions: z.array(z.string()).default(["N/A"]),
  suggestedMVP: z.array(z.string()).default(["N/A"]),
}).passthrough();

const FinalJudgeSchema = z.object({
  finalScore: z.coerce.number().min(0).max(100),
  verdict: z.string().transform(v => {
    if (v.toLowerCase().includes("ship")) return "Ship MVP";
    if (v.toLowerCase().includes("iterate")) return "Iterate";
    return "Reject";
  }),
  decision: z.string(),
  nextSteps: z.array(z.string()).default(["Review agent feedback"]),
}).passthrough();

const BatchEvaluationSchema = z.object({
  feasibility: AgentOutputSchema,
  innovation: AgentOutputSchema,
  risk: AgentOutputSchema,
  finalVerdict: FinalJudgeSchema,
}).passthrough();

// ─── Prompt ─────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an AI Jury Panel with three expert agents and one Final Judge. Evaluate the given startup/hackathon idea.

You MUST respond ONLY with a valid JSON object. No markdown, no explanation, no extra text — ONLY the raw JSON.

The JSON must have exactly these four top-level keys: "feasibility", "innovation", "risk", "finalVerdict".

Required structure:
{
  "feasibility": { "score": <0-100>, "topPros": ["..."], "topCons": ["..."], "questions": ["..."], "suggestedMVP": ["..."] },
  "innovation":  { "score": <0-100>, "topPros": ["..."], "topCons": ["..."], "questions": ["..."], "suggestedMVP": ["..."] },
  "risk":        { "score": <0-100, high=safe/low=risky>, "topPros": ["..."], "topCons": ["..."], "questions": ["..."], "suggestedMVP": ["..."] },
  "finalVerdict": { "finalScore": <feasibility*0.45+innovation*0.35+risk*0.20>, "verdict": <"Ship MVP"|"Iterate"|"Reject">, "decision": "...", "nextSteps": ["..."] }
}`;

// ─── Single OpenRouter Model Call ───────────────────────────
async function callOpenRouterModel(model, userPrompt) {
  console.log(`  📡 Trying: ${model}`);
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://agent-jury.app",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });

  if (res.status === 429) throw Object.assign(new Error("RATE_LIMITED"), { code: 429 });
  if (res.status === 404) throw Object.assign(new Error("MODEL_NOT_FOUND"), { code: 404 });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 150)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty LLM response");

  const json = extractJSON(text);
  const parsed = JSON.parse(json);
  console.log(`  ✅ ${model} responded. Keys: ${Object.keys(parsed).join(", ")}`);
  return parsed;
}

// ─── OpenRouter with Model Fallback Chain ───────────────────
async function callOpenRouter(userPrompt) {
  const errors = [];

  for (const model of OPENROUTER_MODELS) {
    try {
      const result = await callOpenRouterModel(model, userPrompt);
      return result;
    } catch (err) {
      console.warn(`  ⚠️  ${model} failed (${err.message})`);
      errors.push(`${model}: ${err.message}`);

      // If rate limited, wait a bit before trying next model
      if (err.code === 429) await sleep(3000);
      // Continue to next model for 404/429
      if (err.code === 404 || err.code === 429) continue;
      // For other errors, also try next model
      continue;
    }
  }

  throw new Error(`All OpenRouter models failed:\n${errors.join("\n")}`);
}

// ─── Gemini Fallback ────────────────────────────────────────
async function callGemini(userPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      console.log(`  📡 Gemini ${GEMINI_MODEL} (attempt ${attempt + 1})...`);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048, responseMimeType: "application/json" },
        }),
      });
      if (res.status === 429) {
        console.log(`  ⏳ Gemini rate limited, waiting ${10000 * (attempt + 1)}ms...`);
        await sleep(10000 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty Gemini response");
      const json = extractJSON(text);
      const parsed = JSON.parse(json);
      console.log(`  ✅ Gemini responded. Keys: ${Object.keys(parsed).join(", ")}`);
      return parsed;
    } catch (err) {
      console.error(`  ❌ Gemini attempt ${attempt + 1} failed: ${err.message}`);
      if (attempt >= 2) throw err;
    }
  }
}

// ─── Main Orchestrator ──────────────────────────────────────
async function evaluateCase(caseText) {
  console.log(`\n🎯 Starting evaluation... (OR key: ${OPENROUTER_API_KEY ? "✓" : "✗"}, Gemini key: ${GEMINI_API_KEY ? "✓" : "✗"})`);

  // Try OpenRouter first, then Gemini
  let raw;
  try {
    if (OPENROUTER_API_KEY) {
      raw = await callOpenRouter(caseText.trim());
    } else if (GEMINI_API_KEY) {
      raw = await callGemini(caseText.trim());
    } else {
      throw new Error("No LLM provider configured");
    }
  } catch (err) {
    if (GEMINI_API_KEY && OPENROUTER_API_KEY) {
      console.log("⚠️  OpenRouter failed, trying Gemini fallback...");
      try {
        raw = await callGemini(caseText.trim());
      } catch (geminiErr) {
        throw new Error(`All providers failed. OR: ${err.message} | Gemini: ${geminiErr.message}`);
      }
    } else {
      throw err;
    }
  }

  // Validate with Zod
  const parsed = BatchEvaluationSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("❌ Zod Validation Error:", JSON.stringify(parsed.error.format()).slice(0, 500));
    throw new Error("Invalid LLM response format");
  }

  const { feasibility, innovation, risk, finalVerdict } = parsed.data;
  console.log(`✅ Evaluation complete: ${finalVerdict.verdict} (score: ${finalVerdict.finalScore})`);

  return {
    feasibility, innovation, risk, finalVerdict,
    timestamp: new Date().toISOString(),
  };
}

// ─── Error Fallback ─────────────────────────────────────────
async function evaluateCaseSafe(caseText) {
  try {
    return await evaluateCase(caseText);
  } catch (err) {
    console.error("🔥 Evaluation Pipeline Failed:", err.message);
    return {
      feasibility: { score: 50, topPros: ["LLM Error"], topCons: [err.message], questions: [], suggestedMVP: [] },
      innovation: { score: 50, topPros: ["LLM Error"], topCons: [err.message], questions: [], suggestedMVP: [] },
      risk: { score: 50, topPros: ["LLM Error"], topCons: [err.message], questions: [], suggestedMVP: [] },
      finalVerdict: { finalScore: 50, verdict: "Iterate", decision: "System encountered an error. Please try again later.", nextSteps: [] },
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = { evaluateCase: evaluateCaseSafe };
