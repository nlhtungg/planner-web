require('dotenv').config();
const https = require('https');

const apiKey = process.env.GOOGLE_API_KEY;

function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  https.get(url, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log('\n=== Available Models ===\n');
        
        if (json.models) {
          json.models.forEach(model => {
            if (model.supportedGenerationMethods?.includes('generateContent')) {
              console.log(`✅ ${model.name}`);
              console.log(`   Display: ${model.displayName}`);
              console.log(`   Methods: ${model.supportedGenerationMethods.join(', ')}`);
              console.log('');
            }
          });
        } else {
          console.log('Error:', json);
        }
      } catch (error) {
        console.error('Parse error:', error);
        console.log('Response:', data);
      }
    });
  }).on('error', (error) => {
    console.error('Request error:', error);
  });
}

listModels();
