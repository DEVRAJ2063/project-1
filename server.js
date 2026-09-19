const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const sessions = new Map();

const Emails = new Set(['devraj@example.com',]);
const Password = 'medidost123';

const medicineFacts = {
  paracetamol: 'Paracetamol (acetaminophen) is commonly used for pain and fever. Follow the label or prescription, avoid taking more than directed, and check with a pharmacist if you have liver disease or use other medicines containing paracetamol.',
  cetirizine: 'Cetirizine is an antihistamine commonly used for allergy symptoms. It may cause drowsiness in some people, so be careful with driving or alcohol until you know how it affects you.',
  omeprazole: 'Omeprazole reduces stomach acid and is commonly used for acid reflux and related conditions. Take it only as directed and ask a clinician if symptoms persist or recur.',
  ors: 'Oral rehydration solution helps replace fluids and electrolytes during dehydration from diarrhoea or vomiting. Follow the packet instructions exactly and seek urgent help for severe dehydration.'
};
const interactions = {
  'paracetamol|warfarin': { severity: 'Moderate', detail: 'Regular or prolonged use may affect bleeding risk. Confirm the combination with a pharmacist, especially if you use warfarin regularly.' },
  'cetirizine|alcohol': { severity: 'Caution', detail: 'Alcohol may increase drowsiness. Avoid driving and ask a pharmacist about your personal situation.' },
  'omeprazole|clopidogrel': { severity: 'Important', detail: 'This combination may need professional review because acid-reducing medicines can affect clopidogrel activation.' }
};

function sendJson(res, status, payload, cookie) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': 'http://localhost:' + PORT, 'Access-Control-Allow-Credentials': 'true' };
  if (cookie) headers['Set-Cookie'] = cookie;
  res.writeHead(status, headers);
  res.end(JSON.stringify(payload));
}
function bodyOf(req) { return new Promise((resolve, reject) => { let body = ''; req.on('data', chunk => { body += chunk; if (body.length > 100000) req.destroy(); }); req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid JSON')); } }); req.on('error', reject); }); }
function sessionFrom(req) { const match = (req.headers.cookie || '').match(/medi_session=([^;]+)/); return match ? sessions.get(match[1]) : null; }
function answerFor(question) {
  const text = question.toLowerCase();
  const medicine = Object.keys(medicineFacts).find(name => text.includes(name));
  let answer = medicine ? medicineFacts[medicine] : 'I can help explain medicines, symptoms, reports, precautions, and interactions in general language. Please include the exact medicine name or describe the symptom, how long it has been present, and its severity.';
  if (/(breath|chest pain|unconscious|seizure|severe bleeding|overdose|allergic reaction)/.test(text)) answer = 'This may need urgent professional attention. Please contact your local emergency service now, especially for severe breathing trouble, chest pain, loss of consciousness, seizure, severe bleeding, or a serious allergic reaction. Do not rely on this chat during an emergency.';
  return { summary: answer, sections: [{ title: 'Important', text: 'This is general health information, not a diagnosis or a personal prescription.' }, { title: 'When to get help', text: 'Speak with a doctor or pharmacist for personal advice, pregnancy or paediatric questions, allergies, chronic conditions, or symptoms that are severe, worsening, or persistent.' }] };
}
function interactionFor(items = []) {
  const names = items.map(item => String(item).toLowerCase());
  const match = Object.entries(interactions).find(([key]) => key.split('|').every(part => names.includes(part)));
  return match ? match[1] : { severity: 'Not confirmed', detail: 'No interaction was found in this small local reference set. That does not prove a combination is safe; confirm important combinations with a doctor or pharmacist.' };
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': 'http://localhost:' + PORT, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }); return res.end(); }
    if (req.url === '/api/session' && req.method === 'GET') { const session = sessionFrom(req); return sendJson(res, 200, { authenticated: Boolean(session), user: session || null }); }
    if (req.url === '/api/login' && req.method === 'POST') {
      const input = await bodyOf(req);
      if (!input.email || !input.password) return sendJson(res, 400, { error: 'Email and password are required.' });
      if (!demoEmails.has(input.email.toLowerCase()) || input.password !== demoPassword) return sendJson(res, 401, { error: 'Incorrect email or password. Use devraj@example.com and medidost123.' });
      const token = crypto.randomBytes(24).toString('hex'); sessions.set(token, demoUser);
      return sendJson(res, 200, { authenticated: true, user: demoUser }, `medi_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`);
    }
    if (req.url === '/api/logout' && req.method === 'POST') { const match = (req.headers.cookie || '').match(/medi_session=([^;]+)/); if (match) sessions.delete(match[1]); return sendJson(res, 200, { authenticated: false }, 'medi_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'); }
    if (req.url === '/api/chat' && req.method === 'POST') { if (!sessionFrom(req)) return sendJson(res, 401, { error: 'Please log in to use Medi Dost AI.' }); const input = await bodyOf(req); if (!input.question || !input.question.trim()) return sendJson(res, 400, { error: 'Ask a health question first.' }); return sendJson(res, 200, { answer: answerFor(input.question), question: input.question }); }
    if (req.url === '/api/interactions' && req.method === 'POST') { if (!sessionFrom(req)) return sendJson(res, 401, { error: 'Please log in first.' }); const input = await bodyOf(req); if (!Array.isArray(input.medicines) || input.medicines.length < 2) return sendJson(res, 400, { error: 'Add at least two medicines.' }); return sendJson(res, 200, { medicines: input.medicines, result: interactionFor(input.medicines) }); }
    if (req.url === '/api/symptoms' && req.method === 'POST') { if (!sessionFrom(req)) return sendJson(res, 401, { error: 'Please log in first.' }); const input = await bodyOf(req); if (!input.symptoms || !input.symptoms.trim()) return sendJson(res, 400, { error: 'Describe a symptom first.' }); const urgent = /(breath|chest pain|unconscious|seizure|severe bleeding)/i.test(input.symptoms); return sendJson(res, 200, { possible: urgent ? ['A potentially urgent symptom pattern'] : ['A common short-term illness', 'Allergy or irritation', 'Another cause that needs clinical context'], selfCare: urgent ? 'Seek urgent professional care now.' : 'Rest, drink fluids if appropriate, and track duration and severity. This is not a diagnosis.', redFlags: 'Seek urgent help for severe or worsening symptoms, breathing trouble, chest pain, confusion, or loss of consciousness.' }); }
    if (req.method === 'GET') { const filePath = path.join(ROOT, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0])); if (filePath.startsWith(ROOT) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) { const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.md': 'text/plain' }; res.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream' }); return fs.createReadStream(filePath).pipe(res); } }
    sendJson(res, 404, { error: 'Not found' });
  } catch (error) { sendJson(res, 500, { error: 'The server could not process that request.' }); }
});
server.listen(PORT, () => console.log(`Medi Dost server running at http://localhost:${PORT}`));
