const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();

// Accept any raw text (including multipart) up to 5 MB
app.use(bodyParser.text({ type: '*/*', limit: '5mb' }));

app.post('/', (req, res) => {
    const raw = req.body;

    console.log('\n📩 Event received from device');

    // Try to extract clean JSON from multipart message
    const matches = raw.match(/{[\s\S]*?}\s*(?=(--MIME|$))/);

    if (matches) {
        const jsonStr = matches[0].trim();

        try {
            const event = JSON.parse(jsonStr);

            console.log('✅ Parsed Event JSON:\n', event);

            // Optional: Write JSON to file for recordkeeping
            fs.appendFileSync(
                path.join(__dirname, 'event_log.txt'),
                JSON.stringify(event, null, 2) + '\n\n'
            );

            res.status(200).send('Event received ✅');
        } catch (err) {
            console.error('❌ Failed to parse cleaned JSON:', err);
            res.status(400).send('Invalid JSON');
        }
    } else {
        console.warn('⚠️ No valid JSON found in multipart message.');
        res.status(400).send('No JSON detected');
    }
});

app.listen(8888, () => {
    console.log(`🚀 ISUP Listener running at http://localhost:8888/`);
});
