import type { ChatMessage, MessageResponse } from "./types.ts";

export function isDigits(value: string) {
  return (
    value.length > 0 &&
    [...value].every((character) => character >= "0" && character <= "9")
  );
}

export function normalizePhone(value: string) {
  let phone = "";
  for (const character of value) {
    if (isDigits(character)) {
      phone += character;
    } else if (!"+()-".includes(character) && character.trim() !== "") {
      throw new Error("Введите номер телефона с кодом страны.");
    }
  }
  if (phone.length < 7 || phone.length > 15 || phone.startsWith("0")) {
    throw new Error(
      "Введите международный номер: от 7 до 15 цифр, с кодом страны.",
    );
  }
  return phone;
}

export function incomingMessage(
  body: MessageResponse["body"],
): ChatMessage | null {
  if (
    body.typeWebhook !== "incomingMessageReceived" ||
    !body.senderData?.chatId ||
    !body.idMessage
  )
    return null;
  const message =
    body.messageData?.typeMessage === "textMessage"
      ? body.messageData.textMessageData?.textMessage
      : body.messageData?.typeMessage === "extendedTextMessage"
        ? body.messageData.extendedTextMessageData?.text
        : undefined;
  return message === undefined
    ? null
    : {
        id: body.idMessage,
        chatId: body.senderData.chatId,
        message,
        isSender: false,
      };
}

export function appendMessage(
  current: Record<string, ChatMessage[]>,
  message: ChatMessage,
) {
  const messages = current[message.chatId] ?? [];
  if (messages.some((item) => item.id === message.id)) return current;
  return { ...current, [message.chatId]: [...messages, message] };
}
