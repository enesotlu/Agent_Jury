require('dotenv').config();
const { z } = require('zod');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.LLM_MODEL || 'google/gemma-3-27b-it:free';

const AgentOutputSchema = z.object({
    score: z.coerce.number().min(0).max(100),
    topPros: z.array(z.string()).default(["N/A"]),
    topCons: z.array(z.string()).default(["N/A"]),
    questions: z.array(z.string()).default(["N/A"]),
    suggestedMVP: z.array(z.string()).default(["N/A"]),
}).passthrough();

const FinalJudgeSchema = z.object({
    finalScore: z.coerce.number().min(0).max(100),
    verdict: z.string(),
    decision: z.string(),
    nextSteps: z.array(z.string()).default(["Review agent feedback"]),
}).passthrough();

const BatchEvaluationSchema = z.object({
    feasibility: AgentOutputSchema,
    innovation: AgentOutputSchema,
    risk: AgentOutputSchema,
    finalVerdict: FinalJudgeSchema,
}).passthrough();

const SYSTEM = `You are an AI Jury Panel. Evaluate the given hackathon idea.
Respond ONLY with valid JSON, no markdown, no extra text.
JSON must have keys: "feasibility", "innovation", "risk", "finalVerdict".
Each of feasibility/innovation/risk must have: score(0-100), topPros(array), topCons(array), questions(array), suggestedMVP(array).
finalVerdict must have: finalScore(0-100), verdict(string), decision(string), nextSteps(array).`;

async function test() {
    console.log(`Model: ${MODEL}`);

    let retries = 3;
    for (let i = 0; i <= retries; i++) {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://agent-jury.app',
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: SYSTEM },
                    { role: 'user', content: 'Evaluate: A mobile app to track daily water intake' },
                ],
                temperature: 0.3,
            }),
        });

        console.log(`Attempt ${i + 1} - HTTP ${res.status}`);

        if (res.status === 429) {
            const waitMs = 15000 * (i + 1);
            console.log(`Rate limited. Waiting ${waitMs}ms...`);
            await new Promise(r => setTimeout(r, waitMs));
            continue;
        }

        if (!res.ok) {
            console.error('Error:', await res.text());
            break;
        }

        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (!text) { console.error('Empty content'); break; }

        console.log('\n=== RAW RESPONSE ===');
        console.log(text.substring(0, 1000));
        console.log('=== END RAW ===\n');

        // Parse
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch {
            const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (match) { try { parsed = JSON.parse(match[1].trim()); } catch { } }
            if (!parsed) {
                const s = text.indexOf('{'), e = text.lastIndexOf('}');
                if (s !== -1 && e !== -1) { try { parsed = JSON.parse(text.substring(s, e + 1)); } catch { } }
            }
        }

        if (!parsed) { console.error('COULD NOT PARSE JSON'); break; }

        console.log('TOP-LEVEL KEYS:', Object.keys(parsed));
        if (parsed.feasibility) console.log('feasibility keys:', Object.keys(parsed.feasibility));
        if (parsed.finalVerdict) console.log('finalVerdict keys:', Object.keys(parsed.finalVerdict));

        // Zod
        const result = BatchEvaluationSchema.safeParse(parsed);
        if (result.success) {
            console.log('\n✅ ZOD PASSED!');
            console.log('Scores:', result.data.feasibility.score, result.data.innovation.score, result.data.risk.score, result.data.finalVerdict.finalScore);
        } else {
            console.error('\n❌ ZOD FAILED:');
            console.error(JSON.stringify(result.error.format(), null, 2).substring(0, 2000));
        }
        break;
    }
}

test().catch(console.error);
