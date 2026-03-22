require('dotenv').config();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-1.5-flash';
const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const payload = {
    system_instruction: { parts: [{ text: 'You are a helpful assistant. Respond ONLY with valid JSON.' }] },
    contents: [{ parts: [{ text: 'Return a JSON with key test and value hello' }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 512, responseMimeType: 'application/json' }
};

fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    .then(r => r.json())
    .then(d => {
        if (d.error) {
            console.log('GEMINI ERROR:', d.error.code, d.error.message);
        } else {
            console.log('GEMINI OK:', JSON.stringify(d.candidates?.[0]?.content?.parts?.[0]?.text).slice(0, 200));
        }
    })
    .catch(e => console.error('FETCH ERROR:', e.message));
