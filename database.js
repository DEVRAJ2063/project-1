const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const seedMedicines = [
  { name: 'Paracetamol', generic: 'Acetaminophen', className: 'Analgesic / antipyretic', use: 'Pain and fever relief', form: 'Tablet', strength: 'Source-dependent', warnings: 'Do not combine products containing paracetamol. Ask a pharmacist if you have liver disease or drink heavily.', adverseEffects: 'Nausea or rash can occur. Seek urgent help for facial swelling, trouble breathing, or a severe skin reaction.', source: 'Medi Dost local reference set', sourceUrl: '', sourceDate: '2026-09-20' },
  { name: 'Cetirizine', generic: 'Cetirizine hydrochloride', className: 'Antihistamine', use: 'Allergy symptom relief', form: 'Tablet', strength: 'Source-dependent', warnings: 'May cause drowsiness. Take care with driving or alcohol until you know how it affects you.', adverseEffects: 'Drowsiness, dry mouth, or tiredness can occur. Seek help for swelling or breathing trouble.', source: 'Medi Dost local reference set', sourceUrl: '', sourceDate: '2026-09-20' },
  { name: 'Omeprazole', generic: 'Omeprazole', className: 'Proton pump inhibitor', use: 'Acid reflux and related stomach-acid conditions', form: 'Capsule or tablet', strength: 'Source-dependent', warnings: 'Ask a clinician if symptoms persist, recur, or include difficulty swallowing, vomiting blood, or unexplained weight loss.', adverseEffects: 'Headache, stomach upset, or diarrhoea can occur.', source: 'Medi Dost local reference set', sourceUrl: '', sourceDate: '2026-09-20' },
  { name: 'ORS', generic: 'Oral rehydration salts', className: 'Electrolyte solution', use: 'Replacing fluids and electrolytes during dehydration', form: 'Powder for solution', strength: 'Packet-dependent', warnings: 'Mix exactly according to the packet instructions. Seek urgent help for severe dehydration.', adverseEffects: 'Incorrect mixing can be harmful. Seek help for confusion, inability to drink, very little urine, or worsening weakness.', source: 'Medi Dost local reference set', sourceUrl: '', sourceDate: '2026-09-20' }
];

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}
function verifyPassword(password, stored) {
  const [salt, digest] = String(stored).split(':');
  if (!salt || !digest) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(digest, 'hex'));
}

function createDatabase(filename = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'medidost.sqlite')) {
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, language TEXT NOT NULL DEFAULT 'EN', notifications INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS medicines (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE COLLATE NOCASE, generic TEXT NOT NULL, class_name TEXT NOT NULL, use_text TEXT NOT NULL, dosage_form TEXT, strength TEXT, warnings TEXT NOT NULL, adverse_effects TEXT NOT NULL, source TEXT NOT NULL, source_url TEXT, source_date TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE INDEX IF NOT EXISTS idx_medicines_search ON medicines(name, generic, class_name);
    CREATE TABLE IF NOT EXISTS saved_medicines (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, medicine_id INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id, medicine_id));
    CREATE TABLE IF NOT EXISTS reminders (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, medicine_name TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', scheduled_at TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  `);
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get('devraj@example.com');
  if (!user) db.prepare('INSERT INTO users (name,email,password_hash) VALUES (?,?,?)').run('Devraj Anand', 'devraj@example.com', hashPassword('medidost123'));
  const count = db.prepare('SELECT COUNT(*) AS count FROM medicines').get().count;
  if (count === 0) {
    const insert = db.prepare('INSERT INTO medicines (name,generic,class_name,use_text,dosage_form,strength,warnings,adverse_effects,source,source_url,source_date) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    for (const medicine of seedMedicines) insert.run(medicine.name, medicine.generic, medicine.className, medicine.use, medicine.form, medicine.strength, medicine.warnings, medicine.adverseEffects, medicine.source, medicine.sourceUrl, medicine.sourceDate);
  }
  return db;
}

module.exports = { createDatabase, hashPassword, verifyPassword, seedMedicines };
