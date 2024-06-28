const fetch = require('node-fetch');
const fs = require('fs');
const player = require('play-sound')();

const options = {
  method: 'POST',
  headers: {
    'xi-api-key': 'sk_bc7a172cae9b09d75cf6cc83ed1284c37f06d781bbec0333', // Your actual API key
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ text: "Olá! Como você está? Meu nome é Elina. Prazer em conhecê-lo" })
};

fetch('https://api.elevenlabs.io/v1/text-to-speech/JNI7HKGyqNaHqfihNoCi', options)
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.buffer(); 
  })
  .then(buffer => {
    const filePath = 'output.wav';
    fs.writeFileSync(filePath, buffer);
    player.play(filePath, err => {
      if (err) {
        console.error('Error playing audio:', err);
      } else {
        console.log('Audio played successfully.');
      }
    });
  })
  .catch(err => console.error('Fetch or processing error:', err));
