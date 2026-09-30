import test from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { checkAccount, sendMessage, receiveNotification, deleteNotification, verifyConnection, errorMessage } from "../src/components/chat/api.ts";

const connection = { apiUrl: "https://4100.api.green-api.com", instanceId: "123", tokenApi: "test-token" };

test("API flow uses supplied connection and resolved chat ID without real network", async () => {
  const previous = axios.defaults.adapter;
  const calls = [];
  axios.defaults.adapter = async (config) => {
    calls.push(config);
    const method = config.url.split("/")[4];
    const results = {
      getStateInstance: { stateInstance: "authorized" },
      checkAccount: { exist: true, chatId: "42" },
      sendMessage: { idMessage: "1" },
      receiveNotification: { receiptId: 7, body: { typeWebhook: "incomingMessageReceived" } },
      deleteNotification: { result: true },
    };
    return { data: results[method], status: 200, statusText: "OK", headers: {}, config };
  };
  try {
    await verifyConnection(connection);
    const chatId = await checkAccount(connection, "998901234567");
    assert.equal(await sendMessage(connection, chatId, "Привет"), "1");
    const controller = new AbortController();
    const notification = await receiveNotification(connection, controller.signal);
    await deleteNotification(connection, notification.receiptId, controller.signal);
    assert.ok(calls.every((call) => call.url.startsWith(`${connection.apiUrl}/waInstance123/`) && call.url.includes("test-token")));
    assert.deepEqual(JSON.parse(calls[2].data), { chatId: "42", message: "Привет" });
    assert.equal(calls[4].method, "delete");
    assert.ok(calls[4].url.endsWith("/7"));
    assert.equal(calls[3].signal, controller.signal);
  } finally { axios.defaults.adapter = previous; }
});

test("unavailable account and rejected send are not treated as success", async () => {
  const previous = axios.defaults.adapter;
  axios.defaults.adapter = async (config) => ({ data: { exist: false }, status: 200, statusText: "OK", headers: {}, config });
  try {
    await assert.rejects(checkAccount(connection, "998901234567"), /не найден/);
    await assert.rejects(sendMessage(connection, "42", "Текст"), /не подтвердил/);
    await assert.rejects(verifyConnection(connection), /Авторизуйте/);
  } finally { axios.defaults.adapter = previous; }
});

test("quota error is actionable without leaking request URL or token", () => {
  const error = new axios.AxiosError("secret request", "ERR_BAD_REQUEST", undefined, undefined, { status: 466 });
  assert.match(errorMessage(error), /лимит/);
  assert.ok(!errorMessage(error).includes("secret"));
});
