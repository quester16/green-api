import test from "node:test";
import assert from "node:assert/strict";
import { appendMessage, incomingMessage, normalizePhone } from "../src/components/chat/messageUtils.ts";

test("international phone normalization and invalid input", () => {
  assert.equal(normalizePhone("+998 (90) 123-45-67"), "998901234567");
  for (const value of ["", "abc1234567", "123", "0001234567"]) assert.throws(() => normalizePhone(value));
});

test("incoming belongs to sender chat, not connected account", () => {
  const result = incomingMessage({ typeWebhook: "incomingMessageReceived", idMessage: "1", instanceData: { wid: "999@c.us" }, senderData: { chatId: "42" }, messageData: { typeMessage: "textMessage", textMessageData: { textMessage: "Ответ" } } });
  assert.deepEqual(result, { id: "1", chatId: "42", message: "Ответ", isSender: false });
});

test("service events and unsupported messages are skipped", () => {
  assert.equal(incomingMessage({ typeWebhook: "outgoingMessageStatus", status: "read" }), null);
  assert.equal(incomingMessage({ typeWebhook: "incomingMessageReceived", idMessage: "1", senderData: { chatId: "42" }, messageData: { typeMessage: "imageMessage" } }), null);
});

test("URL text is displayed as text", () => {
  assert.equal(incomingMessage({ typeWebhook: "incomingMessageReceived", idMessage: "1", senderData: { chatId: "42" }, messageData: { typeMessage: "extendedTextMessage", extendedTextMessageData: { text: "https://example.com" } } }).message, "https://example.com");
});

test("both directions share chat, retries do not duplicate, other chats survive", () => {
  const outgoing = { id: "1", chatId: "42", message: "Вопрос", isSender: true };
  let state = appendMessage({}, outgoing);
  assert.equal(appendMessage(state, outgoing), state);
  state = appendMessage(state, { id: "2", chatId: "42", message: "Ответ", isSender: false });
  state = appendMessage(state, { id: "1", chatId: "99", message: "Другой чат", isSender: false });
  assert.equal(state["42"].length, 2);
  assert.equal(state["99"].length, 1);
});
