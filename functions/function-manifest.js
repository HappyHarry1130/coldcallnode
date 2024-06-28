const tools = [
  {
    type: 'function',
    function: {
      name: 'checkInventory',
      say: 'Deixe-me verificar nosso inventário agora mesmo.',
      description: 'Verifica o inventário de diferentes modelos de AirPods: AirPods, AirPods Pro ou AirPods Max.',
      parameters: {
        type: 'object',
        properties: {
          model: {
            type: 'string',
            'enum': ['airpods', 'airpods pro', 'airpods max'],
            description: 'O modelo de AirPods, seja AirPods, AirPods Pro ou AirPods Max.',
          },
        },
        required: ['model'],
      },
      returns: {
        type: 'object',
        properties: {
          stock: {
            type: 'integer',
            description: 'Um número inteiro que contém quantos modelos estão atualmente em estoque.'
          }
        }
      }
    },
  },
  {
    type: 'function',
    function: {
      name: 'checkPrice',
      say: 'Deixe-me verificar o preço, um momento.',
      description: 'Verifica o preço do modelo fornecido de AirPods, AirPods Pro ou AirPods Max.',
      parameters: {
        type: 'object',
        properties: {
          model: {
            type: 'string',
            'enum': ['airpods', 'airpods pro', 'airpods max'],
            description: 'O modelo de AirPods, seja AirPods, AirPods Pro ou AirPods Max.',
          },
        },
        required: ['model'],
      },
      returns: {
        type: 'object',
        properties: {
          price: {
            type: 'integer',
            description: 'O preço do modelo.'
          }
        }
      }
    },
  },
  {
    type: 'function',
    function: {
      name: 'placeOrder',
      say: 'Tudo bem, vou registrar isso em nosso sistema.',
      description: 'Faz um pedido de um conjunto de AirPods.',
      parameters: {
        type: 'object',
        properties: {
          model: {
            type: 'string',
            'enum': ['airpods', 'airpods pro'],
            description: 'O modelo de AirPods, seja o regular ou Pro.',
          },
          quantity: {
            type: 'integer',
            description: 'O número de AirPods que desejam pedir.',
          },
        },
        required: ['model', 'quantity'],
      },
      returns: {
        type: 'object',
        properties: {
          price: {
            type: 'integer',
            description: 'O preço total do pedido, incluindo impostos.'
          },
          orderNumber: {
            type: 'integer',
            description: 'O número do pedido associado ao pedido.'
          }
        }
      }
    },
  },
  {
    type: 'function',
    function: {
      name: 'transferCall',
      say: 'Um momento enquanto eu transfiro sua ligação.',
      description: 'Transfere o cliente para um atendente ao vivo caso solicite ajuda de uma pessoa real.',
      parameters: {
        type: 'object',
        properties: {
          callSid: {
            type: 'string',
            description: 'O identificador único para a chamada telefônica ativa.',
          },
        },
        required: ['callSid'],
      },
      returns: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Se a chamada do cliente foi transferida com sucesso ou não.'
          },
        }
      }
    },
  },
];

module.exports = tools;
