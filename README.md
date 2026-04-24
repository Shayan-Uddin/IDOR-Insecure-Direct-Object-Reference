# IDOR Laboratory

## ⚠️ Security Warning

**This application is INTENTIONALLY VULNERABLE** and is designed exclusively for security education and penetration testing training purposes. **DO NOT deploy this application in any production environment.**

## Overview

IDOR Laboratory is a deliberately insecure web application designed to demonstrate the Insecure Direct Object Reference (IDOR) vulnerability in a realistic medical records management system. Built with Node.js, Express, and SQLite, it provides a hands-on learning environment for understanding, identifying, and preventing IDOR vulnerabilities.

## Architecture

### Tech Stack
- **Backend:** Node.js with Express.js
- **Database:** SQLite (better-sqlite3)
- **Frontend:** Single Page Application with Tailwind CSS
- **Authentication:** JWT-based authentication
- **Styling:** Tailwind CSS via CDN (Dark theme with Indigo accents)

### Directory Structure
```
idor-laboratory/
├── server.js          # Main application server
├── seed.js           # Database seeding script
├── package.json      # Dependencies and scripts
├── .env              # Environment configuration
├── public/
│   ├── index.html    # Main application interface
│   └── app.js        # Client-side JavaScript
└── README.md         # This file
```

## Features

### Core Functionality

1. **Authentication System**
   - JWT-based user authentication
   - Secure password hashing with bcrypt
   - Session management via localStorage

2. **Medical Records Dashboard**
   - Sleek, modern dark-themed UI
   - User profile display with current user ID
   - Record creation, listing, and detailed view

3. **CRUD Operations**
   - Create: Add new medical or financial records
   - Read: View owned records and detailed record information
   - List: Display all user-owned records

### The IDOR Vulnerability

#### The Flaw
The application contains an **intentional IDOR vulnerability** in the `/api/records/:id` endpoint:

```javascript
// VULNERABLE CODE - No owner_id validation
app.get('/api/records/:id', authenticateToken, (req, res) => {
  const recordId = req.params.id;
  
  // ❌ VULNERABLE: No owner_id check against req.user.id
  const stmt = db.prepare('SELECT * FROM records WHERE id = ?');
  const record = stmt.get(recordId);
  
  if (!record) {
    return res.status(404).json({ error: 'Record not found' });
  }
  
  // Returns record to ANY authenticated user, regardless of ownership
  res.json({ ... });
});
```

#### The Problem
- **Predictable IDs:** Records use sequential integer IDs (1, 2, 3...)
- **Missing Authorization:** The server verifies authentication (JWT) but **NOT** authorization (ownership)
- **No Access Control:** Any authenticated user can access any record by changing the ID parameter

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   cd IDOR-Insecure-Direct-Object-Reference
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env  # or modify existing .env
   ```
   Edit `.env` to set your JWT secret and database path.

4. **Seed the database**
   ```bash
   npm run seed
   ```
   This creates:
   - 2 test users (`user1` / `password1`, `user2` / `password2`)
   - 20 sample records (10 per user) with medical and financial data

5. **Start the server**
   ```bash
   npm start
   ```

6. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## Usage

### Login Credentials

| User   | Password    | Description              |
|--------|-------------|--------------------------|
| user1  | password1   | Primary test account     |
| user2  | password2   | Secondary test account   |

### Testing the Application

#### 1. Normal Usage (Secure)
1. Login as `user1` (password: `password1`)
2. View your dashboard - you'll see records you own
3. Click on a record to view details
4. Notice the "This is your own record" indicator

#### 2. Testing IDOR Vulnerability

**Method 1: Using the IDOR Testing Lab**
1. Login as `user1`
2. Navigate to the "IDOR Testing Lab" section
3. Enter different record IDs (e.g., 1, 5, 10, 15)
4. Observe that you can access records owned by `user2`
5. The UI highlights this as a "FOREIGN ACCESS" breach

**Method 2: Direct API Testing**
```bash
# Login as user1 and get JWT token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","password":"password1"}'

# Copy the token and access user2's record using IDOR
curl http://localhost:3000/api/records/11 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```
This should return record #11 (owned by user2) even though you're authenticated as user1.

**Method 3: Browser DevTools**
1. Login as any user
2. Open Browser DevTools → Network tab
3. Navigate to the Records page
4. Click on any record and observe the API call: `GET /api/records/:id`
5. Modify the ID in the Network tab and replay the request
6. Access other users' private data

## How to Fix the IDOR Vulnerability

### Solution 1: Authorization Check

Add owner verification before returning records:

```javascript
app.get('/api/records/:id', authenticateToken, (req, res) => {
  const recordId = req.params.id;
  
  const stmt = db.prepare('SELECT * FROM records WHERE id = ? AND owner_id = ?');
  const record = stmt.get(recordId, req.user.id);
  
  if (!record) {
    return res.status(404).json({ error: 'Record not found' });
  }
  
  res.json({ ... });
});
```

### Solution 2: Use Randomized Identifiers

Replace sequential IDs with UUIDs:

```javascript
const { v4: uuidv4 } = require('uuid');

// When creating records
const recordId = uuidv4();
const stmt = db.prepare('INSERT INTO records (id, owner_id, ...) VALUES (?, ?, ...)');
```

### Solution 3: Role-Based Access Control (RBAC)

```javascript
const checkOwnership = (req, res, next) => {
  const recordId = req.params.id;
  const userId = req.user.id;
  
  const stmt = db.prepare('SELECT owner_id FROM records WHERE id = ?');
  const record = stmt.get(recordId);
  
  if (!record) {
    return res.status(404).json({ error: 'Record not found' });
  }
  
  if (record.owner_id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access forbidden' });
  }
  
  next();
};

app.get('/api/records/:id', authenticateToken, checkOwnership, (req, res) => { ... });
```

### Solution 4: Query Parameter Validation

```javascript
const validateRecordAccess = (req, res, next) => {
  const recordId = req.params.id;
  const userId = req.user.id;
  
  // Always check ownership
  const stmt = db.prepare(
    'SELECT * FROM records WHERE id = ? AND owner_id = ?'
  );
  const record = stmt.get(recordId, userId);
  
  if (!record) {
    return res.status(403).json({ 
      error: 'Access denied',
      details: 'You do not have permission to access this record'
    });
  }
  
  req.record = record;
  next();
};

app.get('/api/records/:id', authenticateToken, validateRecordAccess, (req, res) => {
  // Safe to proceed - record is verified
  res.json(req.record);
});
```

## Security Best Practices

### Prevention Techniques

1. **Implement Proper Authorization**
   - Always verify resource ownership
   - Use `AND owner_id = ?` in SQL queries
   - Check permissions at the data access layer

2. **Use Indirect References**
   - Map internal IDs to external tokens
   - Use UUIDs instead of sequential integers
   - Implement reference maps

3. **Defense in Depth**
   - Validate at API gateway
   - Check permissions in middleware
   - Verify ownership at database level

4. **Access Control Lists (ACL)**
   - Implement fine-grained permissions
   - Use role-based or attribute-based access control
   - Log all access attempts

5. **Rate Limiting**
   - Limit requests per user
   - Detect and block enumeration attempts
   - Implement CAPTCHA for sensitive operations

### Additional Security Measures

- **Input Validation:** Validate all user inputs
- **Parameterized Queries:** Prevent SQL injection
- **HTTPS:** Encrypt all communications
- **JWT Security:** Use strong secrets and short expiration
- **Logging:** Audit all data access attempts
- **Penetration Testing:** Regular security assessments

## API Reference

### Authentication

#### POST /api/auth/register
```json
{
  "username": "string",
  "password": "string"
}
```

#### POST /api/auth/login
```json
{
  "username": "user1",
  "password": "password1"
}
```

Response:
```json
{
  "message": "Login successful",
  "token": "JWT_TOKEN_HERE",
  "user": {
    "id": 1,
    "username": "user1"
  }
}
```

### Records (Authenticated)

#### GET /api/records
List user's own records

Headers: `Authorization: Bearer <token>`

#### POST /api/records
Create new record

Headers: `Authorization: Bearer <token>`

Body:
```json
{
  "title": "Annual Physical",
  "content": "Patient examination notes...",
  "record_type": "Medical"
}
```

#### GET /api/records/:id
**VULNERABLE:** Access any record by ID (intentionally insecure)

Headers: `Authorization: Bearer <token>`

Response:
```json
{
  "id": 5,
  "owner_id": 2,
  "title": "MRI Results",
  "content": "Scan results...",
  "record_type": "Medical",
  "created_at": "2026-01-15T10:30:00.000Z",
  "accessed_by_user_id": 1
}
```

## Testing Scenarios

### Scenario 1: Legitimate Access
1. Login as user1
2. Access record #1 (owned by user1)
3. Result: Success - displays record

### Scenario 2: IDOR Attack
1. Login as user1
2. Access record #11 (owned by user2)
3. Result: **Success - VULNERABLE!** (Should return 403)

### Scenario 3: Unauthorized Enumeration
1. Login as user1
2. Enumerate IDs 1-20
3. Result: **Accesses all records - VULNERABLE!**

### Scenario 4: Data Breach
1. Login as user2
2. Access record #5 (owned by user1)
3. Result: **Accesses user1's financial data - VULNERABLE!**

## Educational Purpose

This laboratory demonstrates:

- **OWASP Top 10 - A01:2021 Broken Access Control**
- IDOR vulnerability mechanics
- Impact of missing authorization checks
- Real-world attack scenarios
- Mitigation strategies and best practices

## Disclaimer

**LEGAL NOTICE:** This application is designed solely for educational purposes, security training, and authorized penetration testing. The application contains intentional security vulnerabilities that make it **unsafe for any production use**.

By using this application, you agree to:
- Use it only in authorized, controlled environments
- Not deploy it on public networks
- Not use it to compromise real systems
- Follow all applicable laws and regulations
- Respect privacy and data protection requirements

**NOTICE:** The developers assume no liability for misuse or damage caused by this application.

## Contributing

This is an educational project maintained for security training purposes. Contributions should focus on:
- Improving educational value
- Adding new vulnerability demonstrations
- Enhancing documentation
- Fixing bugs in the educational framework

## License

This project is available for educational purposes under the MIT License.

## Resources

- [OWASP IDOR Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)
- [OWASP Top 10 - A01:2021](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [PortSwigger IDOR Research](https://portswigger.net/web-api-security/idor)

## Support

For issues, questions, or contributions, please refer to the project repository or contact the maintainers.

## Acknowledgments

- OWASP for security education resources
- Security testing community
- Educational institutions using this for training

---

**Remember: With great power comes great responsibility. Use this knowledge to build secure systems, not to exploit them.** 🔒