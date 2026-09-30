export type Connection = {
  apiUrl: string;
  instanceId: string;
  tokenApi: string;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  message: string;
  isSender: boolean;
};

// Очередь содержит не только сообщения, но и статусы и сервисные события.
export type MessageResponse = {
  receiptId: number;
  body: {
    typeWebhook: string;
    idMessage?: string;
    chatId?: string;
    status?: string;
    senderData?: { chatId: string };
    messageData?: {
      typeMessage: string;
      textMessageData?: { textMessage: string };
      extendedTextMessageData?: { text: string };
    };
  };
};
