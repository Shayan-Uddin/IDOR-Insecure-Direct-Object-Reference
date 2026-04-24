const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DATABASE_PATH = process.env.DATABASE_PATH || './database.sqlite';
const db = new Database(DATABASE_PATH);

// Initialize tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    record_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );
`);

// Clear existing data
db.prepare('DELETE FROM records').run();
db.prepare('DELETE FROM users').run();

// Create users
const user1Pass = bcrypt.hashSync('password1', 10);
const user2Pass = bcrypt.hashSync('password2', 10);

const user1Result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('user1', user1Pass);
const user2Result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('user2', user2Pass);

const userId1 = user1Result.lastInsertRowid;
const userId2 = user2Result.lastInsertRowid;

console.log(`Created user1 (id: ${userId1}) with password: password1`);
console.log(`Created user2 (id: ${userId2}) with password: password2`);

// Sample medical records for user1
const user1Records = [
  {
    title: 'Annual Physical - Jan 2026',
    content: 'Patient presented for annual checkup. Blood pressure: 120/80. Weight: 150 lbs. All vitals normal. Recommended routine blood work.',
    record_type: 'Medical'
  },
  {
    title: 'MRI Results - Brain Scan',
    content: 'MRI performed on 01/15/2026. No abnormalities detected. Brain structure appears normal. No signs of trauma or tumor.',
    record_type: 'Medical'
  },
  {
    title: 'Prescription: Lisinopril 10mg',
    content: 'Prescribed for hypertension management. Take one tablet daily. Refill in 90 days. Monitor blood pressure weekly.',
    record_type: 'Medical'
  },
  {
    title: 'Blood Work - Lipid Panel',
    content: 'Total Cholesterol: 185 mg/dL (Desirable). LDL: 110 mg/dL (Near optimal). HDL: 55 mg/dL (Optimal). Triglycerides: 90 mg/dL.',
    record_type: 'Medical'
  },
  {
    title: 'Dental Cleaning - Feb 2026',
    content: 'Routine dental cleaning and examination. No cavities detected. Gingivitis present - recommend improved flossing routine.',
    record_type: 'Medical'
  },
  {
    title: 'Account Balance - Primary Checking',
    content: 'Account ending in 4421. Current balance: $45,230.87. Available: $45,230.87. Last transaction: Direct deposit $5,000.00',
    record_type: 'Financial'
  },
  {
    title: 'Credit Card Statement - Visa',
    content: 'Card ending in 9921. Statement balance: $2,340.15. Due date: 03/15/2026. Minimum payment: $46.80. Credit limit: $15,000.',
    record_type: 'Financial'
  },
  {
    title: 'Investment Portfolio - Q1 2026',
    content: 'Total portfolio value: $125,600.00. 401k: $85,000. Roth IRA: $25,000. Individual stocks: $15,600. Performance: +8.2% YTD.',
    record_type: 'Financial'
  },
  {
    title: 'Insurance Policy - Life Insurance',
    content: 'Policy #LI-448291. Coverage: $500,000. Beneficiary: Spouse. Premium: $89/month. Next payment due: 04/01/2026. Policy active.',
    record_type: 'Financial'
  },
  {
    title: 'Tax Return 2025 - Filed',
    content: 'Federal tax return filed 04/10/2026. Refund amount: $3,420.00. Direct deposit completed 04/18/2026. Adjusted gross income: $95,000.',
    record_type: 'Financial'
  }
];

// Sample financial records for user2
const user2Records = [
  {
    title: 'Cardiology Consultation',
    content: 'Patient reported chest discomfort. EKG performed - results normal. Stress test scheduled for next week. Prescribed nitroglycerin PRN.',
    record_type: 'Medical'
  },
  {
    title: 'Lab Results - A1C Test',
    content: 'A1C: 6.8% (Elevated - Prediabetes range). Fasting glucose: 118 mg/dL. Recommend dietary consultation and repeat test in 3 months.',
    record_type: 'Medical'
  },
  {
    title: 'Thyroid Panel Results',
    content: 'TSH: 4.2 uIU/mL (Slightly elevated). Free T4: 0.9 ng/dL. Recommend follow-up in 6 weeks. Possible subclinical hypothyroidism.',
    record_type: 'Medical'
  },
  {
    title: 'Allergy Test Results',
    content: 'Patient tested positive for: Ragweed, Dust mites, Cat dander. Negative for: Pollen, Mold. Prescribed Claritin 10mg daily.',
    record_type: 'Medical'
  },
  {
    title: 'Physical Therapy Notes',
    content: 'Session 1 of 6 for lower back pain. Patient demonstrated poor lifting mechanics. Taught proper form. Homework: Stretching exercises daily.',
    record_type: 'Medical'
  },
  {
    title: 'Mortgage Statement - March 2026',
    content: 'Property: 123 Oak Street. Principal & Interest: $1,850.00. Escrow: $450.00. Total payment: $2,300.00. Balance: $285,000.',
    record_type: 'Financial'
  },
  {
    title: 'Auto Loan Payment',
    content: 'Vehicle: 2022 Toyota Camry. Loan #AL-99281. Payment: $485.00. Balance remaining: $18,450.00. Next payment: 05/01/2026.',
    record_type: 'Financial'
  },
  {
    title: 'Pay Stub - February 2026',
    content: 'Gross pay: $5,200.00. Federal tax: $850.00. State tax: $208.00. FICA: $398.00. Net pay: $3,744.00. Year-to-date: $14,976.',
    record_type: 'Financial'
  },
  {
    title: 'Retirement Account - 403(b)',
    content: 'Current balance: $67,800.00. Employer match: 5%. Contributions this year: $8,000.00. Target retirement: 2045 fund.',
    record_type: 'Financial'
  },
  {
    title: 'Homeowners Insurance Premium',
    content: 'Policy #HO-448291-02. Annual premium: $1,850.00. Paid in full 01/15/2026. Coverage: $350,000 dwelling, $100,000 contents.',
    record_type: 'Financial'
  }
];

const insertRecord = db.prepare('INSERT INTO records (owner_id, title, content, record_type) VALUES (?, ?, ?, ?)');

// Insert records for user1
user1Records.forEach(rec => {
  insertRecord.run(userId1, rec.title, rec.content, rec.record_type);
});

// Insert records for user2
user2Records.forEach(rec => {
  insertRecord.run(userId2, rec.title, rec.content, rec.record_type);
});

console.log(`\nSeeded ${user1Records.length} records for user1 (id: ${userId1})`);
console.log(`Seeded ${user2Records.length} records for user2 (id: ${userId2})`);
console.log('\nDatabase seeded successfully!');

// Display record IDs for reference
const allRecords = db.prepare('SELECT id, owner_id, title FROM records ORDER BY id').all();
console.log('\nRecord IDs (for IDOR testing):');
allRecords.forEach(rec => {
  console.log(`  ID ${rec.id} -> User ${rec.owner_id}: ${rec.title.substring(0, 50)}...`);
});

db.close();