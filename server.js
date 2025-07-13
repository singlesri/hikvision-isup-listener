const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');

const app = express();
const PORT = 8888;

// Body parser to accept raw text
app.use(bodyParser.text({ type: '*/*', limit: '10mb' }));

// MySQL connection setup
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // Set your DB password here
  database: 'access_control'
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('❌ DB Connection Error:', err.message);
  } else {
    console.log('✅ Connected to MySQL');
  }
});

app.post('/', (req, res) => {
  const raw = req.body;

  console.log('\n📩 Event received from device');
  console.log(`📦 Raw length: ${raw.length}`);

  // Match the JSON inside multipart
  const match = raw.match(/{[\s\S]*?}\s*(?=(--MIME|$))/);
  if (!match) {
    console.warn('❌ Failed to parse JSON: No valid JSON found in payload');
    return res.status(400).send('Invalid JSON');
  }

  const jsonStr = match[0].trim();

  try {
    const event = JSON.parse(jsonStr);

    console.log('✅ Parsed Event JSON:\n', event);

    // Save to event_log.txt
    fs.appendFileSync(
      path.join(__dirname, 'event_log.txt'),
      JSON.stringify(event, null, 2) + '\n\n'
    );

    // Extract event fields
    const e = event.AccessControllerEvent;

    if (e && e.subEventType === 75) {
      const q = `
        INSERT INTO access_logs (device_id, event_time, event_type, verify_mode, serial_no)
        VALUES (?, ?, ?, ?, ?)
      `;
      const values = [
        event.deviceID,
        new Date(event.dateTime),
        event.eventType,
        e.currentVerifyMode,
        e.serialNo
      ];

      db.query(q, values, (err, result) => {
        if (err) {
          console.error('❌ DB Insert Error:', err.message);
        } else {
          console.log(`✅ Inserted into DB: ID ${result.insertId}`);
        }
      });
    } else {
      console.log(`ℹ️ Ignored subEventType: ${e?.subEventType}`);
    }

    res.status(200).send('Event OK');
  } catch (err) {
    console.error('❌ Failed to parse cleaned JSON:', err.message);
    res.status(400).send('JSON Parse Error');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Listening on http://localhost:${PORT}`);
});
