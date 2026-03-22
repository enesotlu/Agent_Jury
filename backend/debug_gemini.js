require('dotenv').config();
const { z } = require('zod');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';

const PROMPT = `You are an AI Jury Panel with three expert agents and one Final Judge. Evaluate the given startup/hackathon idea.

You MUST respond ONLY with a valid JSON object — no explanation, no markdown, no extra text. The JSON must have exactly these four top-level keys: "feasibility", "innovation", "risk", "finalVerdict".

Required JSON structure:
{
  "feasibility": {
    "score": <integer 0-100>,
    "topPros": ["pro1", "pro2"],
    "topCons": ["con1", "con2"],
    "questions": ["question1"],
    "suggestedMVP": ["step1", "step2"]
  },
  "innovation": {
    "score": <integer 0-100>,
    "topPros": ["pro1"],
    "topCons": ["con1"],
    "questions": ["question1"],
    "suggestedMVP": ["step1"]
  },
  "risk": {
    "score": <integer 0-100, high=safe low=risky>,
    "topPros": ["pro1"],
    "topCons": ["con1"],
    "questions": ["question1"],
    "suggestedMVP": ["step1"]
  },
  "finalVerdict": {
    "finalScore": <weighted avg: feasibility*0.45 + innovation*0.35 + risk*0.20, integer>,
    "verdict": <"Ship MVP" if finalScore>=70, "Iterate" if >=40, "Reject" if <40>,
    "decision": "<2-3 sentence summary>",
    "nextSteps": ["step1", "step2", "step3"]
  }
}

Project idea to evaluate:`;

const CASE = "A mobile app to track daily water intake";

async function test() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    console.log(`Testing Gemini: ${GEMINI_MODEL}`);
    console.log(`API Key starts: ${GEMINI_API_KEY?.substring(0, 8)}...`);

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: PROMPT }] },
                contents: [{ parts: [{ text: CASE }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 2048, responseMimeType: 'application/json' },
            }),
        });

        console.log(`HTTP Status: ${res.status}`);

        if (!res.ok) {
            const errText = await res.text();
            console.error('ERROR BODY:', errText);
            return;
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log('\nRAW TEXT:', text?.substring(0, 500));

        if (text) {
            try {
                const parsed = JSON.parse(text);
                console.log('\nPARSED KEYS:', Object.keys(parsed));
                console.log('feasibility.score:', parsed.feasibility?.score);
                console.log('innovation.score:', parsed.innovation?.score);
                console.log('risk.score:', parsed.risk?.score);
                console.log('finalVerdict.finalScore:', parsed.finalVerdict?.finalScore);
            } catch (e) {
                console.error('JSON PARSE ERROR:', e.message);
            }
        }
    } catch (e) {
        console.error('FETCH ERROR:', e.message);
    }
}

test();
