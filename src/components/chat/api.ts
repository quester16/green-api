import axios from "axios";
import type { Connection, MessageResponse } from "./types";

const url = (connection: Connection, method: string) =>
  `${connection.apiUrl}/waInstance${connection.instanceId}/${method}/${connection.tokenApi}`;

export async function verifyConnection(connection: Connection) {
  const { data } = await axios.get<{ stateInstance: string }>(
    url(connection, "getStateInstance"),
    { timeout: 15000 },
  );
  if (data.stateInstance !== "authorized") {
    throw new Error(
      "Авторизуйте инстанс Telegram в кабинете GREEN-API и попробуйте снова.",
    );
  }
}

export async function checkAccount(
  connection: Connection,
  phoneNumber: string,
) {
  const { data } = await axios.post<{
    exist?: boolean;
    chatId?: string;
    status?: boolean;
  }>(
    url(connection, "checkAccount"),
    { phoneNumber: Number(phoneNumber) },
    { timeout: 20000 },
  );
  if (data.status === false)
    throw new Error(
      "Не удалось проверить номер. Проверьте состояние инстанса и лимит проверок в GREEN-API.",
    );
  if (!data.exist || !data.chatId)
    throw new Error(
      "Аккаунт не найден или номер скрыт настройками приватности Telegram.",
    );
  return data.chatId;
}

export async function sendMessage(
  connection: Connection,
  chatId: string,
  message: string,
) {
  const { data } = await axios.post<{ idMessage?: string }>(
    url(connection, "sendMessage"),
    { chatId, message },
    { timeout: 20000 },
  );
  if (!data.idMessage)
    throw new Error("API не подтвердил отправку. Проверьте лимиты инстанса.");
  return data.idMessage;
}

export async function receiveNotification(
  connection: Connection,
  signal: AbortSignal,
) {
  const { data } = await axios.get<MessageResponse | null>(
    url(connection, "receiveNotification"),
    {
      signal,
      timeout: 15000,
    },
  );
  return data;
}

export async function deleteNotification(
  connection: Connection,
  receiptId: number,
  signal: AbortSignal,
) {
  await axios.delete(`${url(connection, "deleteNotification")}/${receiptId}`, {
    signal,
    timeout: 15000,
  });
}

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    switch (error.response?.status) {
      case 401:
      case 403:
        return "Нет доступа. Проверьте ID, токен и состояние инстанса.";
      case 466:
        return "Достигнут лимит тарифа GREEN-API. Используйте уже разрешённый чат или проверьте квоту в кабинете.";
      case 429:
        return "Слишком много запросов. Попробуйте позже.";
      case 400:
        return "API отклонил запрос. Проверьте данные и настройки инстанса: incomingWebhook включён, webhookUrl пустой.";
      default:
        return "Ошибка сети или GREEN-API. Проверьте соединение. При ошибке отправки проверьте Telegram перед повтором: сообщение могло уйти.";
    }
  }
  return error instanceof Error
    ? error.message
    : "Не удалось выполнить запрос.";
}
