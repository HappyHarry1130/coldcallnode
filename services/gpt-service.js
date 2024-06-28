require('colors');
const EventEmitter = require('events');
const OpenAI = require('openai');
const tools = require('../functions/function-manifest');
const { SocksProxyAgent } = require('socks-proxy-agent');
const agent = new SocksProxyAgent('socks5://14aa439fa63ae:b35b9f9acc@185.101.105.184:12324');
// Import all functions included in function manifest
// Note: the function name and file name must be the same
const availableFunctions = {};
tools.forEach((tool) => {
  let functionName = tool.function.name;
  availableFunctions[functionName] = require(`../functions/${functionName}`);
});

const openaikey = process.env.OPENAI_API_KEY;
class GptService extends EventEmitter {
  constructor() {
    super();
    this.openai = new OpenAI({ apiKey: openaikey, httpAgent: agent });
    this.userContext = [
      {
        'role': 'system', 'content': `"Seu nome é Brandon. Você deve ter uma conversa divertida com seu parceiro de conversa. Assim que a pessoa com quem você está falando começar a falar, interrompa-a e espere que ela termine de falar antes de continuar a conversa.
Como vendedor da empresa, você deve explicar o produto para a outra pessoa em detalhes.
Você deve lembrar o nome da outra pessoa.
E quando você começar a falar, ou seja, quando você responder ou fizer uma pergunta à outra pessoa, você deve dizer olá e chamá-la pelo nome.
Por exemplo, se a outra pessoa disser que seu nome é "Cola", você deve dizer "Oi Cola".
Você não deve perguntar mais do que 2-3 frases por vez. Além disso, suas respostas devem ser as mais curtas possíveis.
Explique à outra pessoa que o preço é baixo, mas a qualidade é alta. Além disso, se a outra pessoa fizer uma pergunta casual, responda adequadamente.
Por exemplo, se a outra pessoa perguntar sobre sua idade, você pode responder com algo como "Minha idade é um segredo" ou "Tenho 30 anos". Além disso, se a outra pessoa lhe perguntar sobre informações de preço,
você pode dizer algo como: “Por favor, diga-me seu orçamento e eu encontrarei um produto que se encaixe em seu orçamento.” Você deve falar apenas em português."`},
      { 'role': 'assistant', 'content': `Seu nome é Brandon. Você deve ter uma conversa divertida com seu parceiro de conversa. Assim que a pessoa com quem você está falando começar a falar, interrompa-a e espere que ela termine de falar antes de continuar a conversa.
Como vendedor da empresa, você deve explicar o produto para a outra pessoa em detalhes.
Você deve lembrar o nome da outra pessoa.
E quando você começar a falar, ou seja, quando você responder ou fizer uma pergunta à outra pessoa, você deve dizer olá e chamá-la pelo nome.
Por exemplo, se a outra pessoa disser que seu nome é "Cola", você deve dizer "Oi Cola".
Você não deve perguntar mais do que 2-3 frases por vez. Além disso, suas respostas devem ser as mais curtas possíveis.
Explique à outra pessoa que o preço é baixo, mas a qualidade é alta. Além disso, se a outra pessoa fizer uma pergunta casual, responda adequadamente.
Por exemplo, se a outra pessoa perguntar sobre sua idade, você pode responder com algo como "Minha idade é um segredo" ou "Tenho 30 anos". Além disso, se a outra pessoa lhe perguntar sobre informações de preço,
você pode dizer algo como: “Por favor, diga-me seu orçamento e eu encontrarei um produto que se encaixe em seu orçamento.” Você deve falar apenas em português."` },
    ],
      this.partialResponseIndex = 0;
  }

  // Add the callSid to the chat context in case
  // ChatGPT decides to transfer the call.
  setCallSid(callSid) {
    this.userContext.push({ 'role': 'system', 'content': `callSid: ${callSid}` });
  }

  validateFunctionArgs(args) {
    try {
      return JSON.parse(args);
    } catch (error) {
      console.log('Warning: Double function arguments returned by OpenAI:', args);
      // Seeing an error where sometimes we have two sets of args
      if (args.indexOf('{') != args.lastIndexOf('{')) {
        return JSON.parse(args.substring(args.indexOf(''), args.indexOf('}') + 1));
      }
    }
  }

  updateUserContext(name, role, text) {
    if (name !== 'user') {
      this.userContext.push({ 'role': role, 'name': name, 'content': text });
    } else {
      this.userContext.push({ 'role': role, 'content': text });
    }
  }

  async completion(text, interactionCount, role = 'user', name = 'user') {
    this.updateUserContext(name, role, text);

    // Step 1: Send user transcription to Chat GPT
    const stream = await this.openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: this.userContext,
      tools: tools,
      stream: true,
    });

    let completeResponse = '';
    let partialResponse = '';
    let functionName = '';
    let functionArgs = '';
    let finishReason = '';

    function collectToolInformation(deltas) {
      let name = deltas.tool_calls[0]?.function?.name || '';
      if (name != '') {
        functionName = name;
      }
      let args = deltas.tool_calls[0]?.function?.arguments || '';
      if (args != '') {
        // args are streamed as JSON string so we need to concatenate all chunks
        functionArgs += args;
      }
    }

    for await (const chunk of stream) {
      let content = chunk.choices[0]?.delta?.content || '';
      let deltas = chunk.choices[0].delta;
      finishReason = chunk.choices[0].finish_reason;

      // Step 2: check if GPT wanted to call a function
      if (deltas.tool_calls) {
        // Step 3: Collect the tokens containing function data
        collectToolInformation(deltas);
      }

      // need to call function on behalf of Chat GPT with the arguments it parsed from the conversation
      if (finishReason === 'tool_calls') {
        // parse JSON string of args into JSON object

        const functionToCall = availableFunctions[functionName];
        const validatedArgs = this.validateFunctionArgs(functionArgs);

        // Say a pre-configured message from the function manifest
        // before running the function.
        const toolData = tools.find(tool => tool.function.name === functionName);
        const say = toolData.function.say;

        this.emit('gptreply', {
          partialResponseIndex: null,
          partialResponse: say
        }, interactionCount);

        let functionResponse = await functionToCall(validatedArgs);

        // Step 4: send the info on the function call and function response to GPT
        this.updateUserContext(functionName, 'function', functionResponse);

        // call the completion function again but pass in the function response to have OpenAI generate a new assistant response
        await this.completion(functionResponse, interactionCount, 'function', functionName);
      } else {
        // We use completeResponse for userContext
        completeResponse += content;
        // We use partialResponse to provide a chunk for TTS
        partialResponse += content;
        // Emit last partial response and add complete response to userContext
        if (content.trim().slice(-1) === '•' || finishReason === 'stop') {
          const gptReply = {
            partialResponseIndex: this.partialResponseIndex,
            partialResponse
          };

          this.emit('gptreply', gptReply, interactionCount);
          this.partialResponseIndex++;
          partialResponse = '';
        }
      }
    }
    this.userContext.push({ 'role': 'assistant', 'content': completeResponse });
    console.log(`GPT -> user context length: ${this.userContext.length}`.green);
  }
}

module.exports = { GptService };
