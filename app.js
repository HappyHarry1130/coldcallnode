require('dotenv').config();
require('colors');

const express = require('express');
const ExpressWs = require('express-ws');

const { GptService } = require('./services/gpt-service');
const { StreamService } = require('./services/stream-service');
const { TranscriptionService } = require('./services/transcription-service');
const { TextToSpeechService } = require('./services/tts-service');
const { recordingService } = require('./services/recording-service');
const cors = require('cors');
const VoiceResponse = require('twilio').twiml.VoiceResponse;


const app = express();
ExpressWs(app);

const PORT = process.env.PORT || 3000;
app.use(cors({
  origin: 'https://react-call-theta.vercel.app'
}));
console.log(process.env.TWILIO_ACCOUNT_SID);

app.post('/make-call/:phonenumber', async (req, res) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = require('twilio')(accountSid, authToken);

  const phonenumber = req.params.phonenumber;

  try {
    const call = await client.calls.create({
      url: `https://${process.env.SERVER}/incoming`,
      to: phonenumber,
      from: process.env.FROM_NUMBER
    });

    console.log(call.sid);
    res.status(200).send(`Call initiated with SID: ${call.sid}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to initiate call');
  }
});


app.post('/incoming', (req, res) => {
  try {
    console.log("hi");
    const response = new VoiceResponse();
    const connect = response.connect();
    connect.stream({ url: `wss://${process.env.SERVER}/connection` });
  
    res.type('text/xml');
    res.end(response.toString());
  } catch (err) {
    console.log(err);
  }
});

app.ws('/connection', (ws) => {
  console.log("connection");
  try {
    ws.on('error', console.error);
    // Filled in from start message
    let streamSid;
    let callSid;

    const gptService = new GptService();
    const streamService = new StreamService(ws);
    const transcriptionService = new TranscriptionService();
    const ttsService = new TextToSpeechService({});
  
    let marks = [];
    let interactionCount = 0;
  
    // Incoming from MediaStream
    ws.on('message', function message(data) {
      const msg = JSON.parse(data);
      if (msg.event === 'start') {
        console.log('start');
        streamSid = msg.start.streamSid;
        callSid = msg.start.callSid;
        console.log(streamSid);
        streamService.setStreamSid(streamSid);
        gptService.setCallSid(callSid);

        // Set RECORDING_ENABLED='true' in .env to record calls
        recordingService(ttsService, callSid).then(() => {
          console.log(`Twilio -> Starting Media Stream for ${streamSid}`.underline.red);
          ttsService.generate({partialResponseIndex: null, partialResponse: 'Olá! Como você está? Meu nome é Elina. Prazer em conhecê-lo!'}, 0);
        });
      } else if (msg.event === 'media') {
        //console.log('media')
        transcriptionService.send(msg.media.payload);
      } else if (msg.event === 'mark') {
        const label = msg.mark.name;
        console.log(`Twilio -> Audio completed mark (${msg.sequenceNumber}): ${label}`.red);
        marks = marks.filter(m => m !== msg.mark.name);
      } else if (msg.event === 'stop') {
        console.log(`Twilio -> Media stream ${streamSid} ended.`.underline.red);
      }
    });
  
    transcriptionService.on('utterance', async (text) => {
      // This is a bit of a hack to filter out empty utterances
      if(marks.length > 0 && text?.length > 5) {
        console.log('Twilio -> Interruption, Clearing stream'.red);
        ws.send(
          JSON.stringify({
            streamSid,
            event: 'clear',
          })
        );
      }
    });
  
    transcriptionService.on('transcription', async (text) => {
      if (!text) { return; }
      console.log(`Interaction ${interactionCount} – STT -> GPT: ${text}`.yellow);
      gptService.completion(text, interactionCount);
      interactionCount += 1;
    });
    
    gptService.on('gptreply', async (gptReply, icount) => {
      console.log(`Interaction ${icount}: GPT -> TTS: ${gptReply.partialResponse}`.green );
      ttsService.generate(gptReply, icount);
    });
  
    ttsService.on('speech', (responseIndex, audio, label, icount) => {
      console.log(`Interaction ${icount}: TTS -> TWILIO: ${label}`.blue);
  
      streamService.buffer(responseIndex, audio);
    });
  
    streamService.on('audiosent', (markLabel) => {
      marks.push(markLabel);
    });
  } catch (err) {
    console.log(err);
  }
});

app.listen(PORT);
console.log(`Server running on port ${PORT}`);
