require('dotenv').config();
const { Buffer } = require('node:buffer');
const EventEmitter = require('events');
const fetch = require('node-fetch');
const axios = require('axios');
class TextToSpeechService extends EventEmitter {
  constructor() {
    super();
    this.nextExpectedIndex = 0;
    this.speechBuffer = {};
  }

  async generate(gptReply, interactionCount) {
    const { partialResponseIndex, partialResponse } = gptReply;

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/JNI7HKGyqNaHqfihNoCi/stream?output_format=ulaw_8000&optimize_streaming_latency=3`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': "sk_bc7a172cae9b09d75cf6cc83ed1284c37f06d781bbec0333",
            'Content-Type': 'application/json',
            accept: 'audio/wav',
          },
          body: JSON.stringify({
            model_id: process.env.XI_MODEL_ID,
            text: partialResponse,
            voice_settings: {
                   stability: 0.5,
                   similarity_boost: 0.7
                }
          }),
        }
      );
      
      if (response.status === 200) {
        const audioArrayBuffer = await response.arrayBuffer();
        this.emit('speech', partialResponseIndex, Buffer.from(audioArrayBuffer).toString('base64'), partialResponse, interactionCount);
      } else {
        console.log('Eleven Labs Error:');
        console.log(response);
      }
    } catch (err) {
      console.error('Error occurred in XI LabsTextToSpeech service');
      console.error(err);
    }
  
}
}

module.exports = { TextToSpeechService };
