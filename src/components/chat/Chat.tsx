import { useEffect, useRef, useState } from "react";
import { Message } from "./Message";
import { ConnectInstances } from "./ConnectInstances";
import type { ChatMessage, Connection } from "./types";
import {
  checkAccount,
  deleteNotification,
  errorMessage,
  receiveNotification,
  sendMessage,
  verifyConnection,
} from "./api";
import {
  appendMessage,
  incomingMessage,
  isDigits,
  normalizePhone,
} from "./messageUtils";

export const Chat = () => {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [messagesByChat, setMessagesByChat] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [activeChat, setActiveChat] = useState<{
    chatId: string;
    phone: string;
  } | null>(null);
  const [status, setStatus] = useState(
    "Введите данные GREEN-API для подключения.",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const actionLock = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const chatId = activeChat?.chatId ?? "";
  const visibleMessages = messagesByChat[chatId] ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [chatId, visibleMessages.length]);

  const handleConnectInstances = async (data: Connection) => {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError("");
    try {
      const prefix = "https://";
      const suffix = ".api.green-api.com";
      const serverId = data.apiUrl.slice(prefix.length, -suffix.length);
      if (
        !data.apiUrl.startsWith(prefix) ||
        !data.apiUrl.endsWith(suffix) ||
        !isDigits(serverId)
      ) {
        throw new Error(
          "Укажите apiUrl инстанса из кабинета, например https://1234.api.green-api.com.",
        );
      }
      if (!isDigits(data.instanceId) || !data.tokenApi) {
        throw new Error("Заполните ID и токен инстанса.");
      }
      await verifyConnection(data);
      setMessagesByChat({});
      setActiveChat(null);
      setMessageInput("");
      setConnection(data);
      setStatus("Подключено. Ожидание сообщений...");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };

  const handleOpenChat = async (value: string) => {
    if (!connection || actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError("");
    try {
      const phone = normalizePhone(value);
      const resolvedChatId = await checkAccount(connection, phone);
      setActiveChat({ chatId: resolvedChatId, phone });
      setMessageInput("");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };

  const handleDisconnect = () => {
    if (actionLock.current) return;
    setConnection(null);
    setActiveChat(null);
    setMessagesByChat({});
    setMessageInput("");
    setError("");
    setStatus("Подключение завершено.");
  };

  const handleSendMessage = async () => {
    const text = messageInput.trim();
    if (
      !connection ||
      !activeChat ||
      !text ||
      text.length > 4096 ||
      actionLock.current
    )
      return;
    actionLock.current = true;
    setIsSending(true);
    setError("");
    try {
      const id = await sendMessage(connection, chatId, text);
      setMessagesByChat((current) =>
        appendMessage(current, { id, chatId, message: text, isSender: true }),
      );
      setMessageInput("");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      actionLock.current = false;
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (!connection) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let pendingReceiptId: number | null = null;
    const receiveNext = async () => {
      let delay = 0;
      try {
        if (pendingReceiptId === null) {
          const data = await receiveNotification(connection, controller.signal);
          if (controller.signal.aborted) return;
          if (!data) {
            setStatus("Подключено. Ожидание сообщений...");
            delay = 500;
            return;
          }
          const message = incomingMessage(data.body);
          if (message)
            setMessagesByChat((current) => appendMessage(current, message));
          if (data.body.typeWebhook === "quotaExceeded")
            setError(
              "Достигнут лимит чатов GREEN-API. Проверьте тариф в кабинете.",
            );
          if (
            data.body.typeWebhook === "outgoingMessageStatus" &&
            ["failed", "noAccount"].includes(data.body.status ?? "")
          ) {
            setError(
              `Не удалось доставить сообщение в чат ${data.body.chatId ?? ""}. Проверьте получателя и ограничения аккаунта.`,
            );
          }
          pendingReceiptId = data.receiptId;
        }
        await deleteNotification(
          connection,
          pendingReceiptId,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        pendingReceiptId = null;
        setStatus("Подключено. Ожидание сообщений...");
      } catch (cause) {
        if (controller.signal.aborted) return;
        delay = 3000;
        setStatus(`${errorMessage(cause)} Повтор получения через 3 секунды.`);
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(receiveNext, delay);
      }
    };
    timer = setTimeout(receiveNext, 0);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [connection]);
  return (
    <main className="min-h-svh bg-[#0b1019] [color-scheme:dark] p-2 font-sans text-slate-100 sm:p-5 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-6xl overflow-hidden rounded-2xl border border-slate-700/50 bg-[#17202e] shadow-xl shadow-black/30 md:h-[calc(100svh-4rem)] md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-slate-700/50 md:border-r md:border-b-0">
          <header className="flex items-center gap-3 px-5 py-5">
            <div
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-xl font-bold text-white"
            >
              М
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                Сообщения
              </h1>
              <p className="text-xs text-slate-400">Telegram · GREEN-API</p>
            </div>
          </header>
          <ConnectInstances
            connected={!!connection}
            busy={busy || isSending}
            onConnect={handleConnectInstances}
            onOpenChat={handleOpenChat}
            onDisconnect={handleDisconnect}
          />
        </aside>

        <section
          aria-label="Переписка"
          className="flex min-h-[65svh] min-w-0 flex-col md:min-h-0"
        >
          <header className="flex min-h-20 items-center gap-3 border-b border-slate-700/50 px-5 sm:px-7">
            <div
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-full bg-violet-500/20 font-semibold text-violet-300"
            >
              {activeChat?.phone
                ? String(activeChat?.phone).trim().slice(-2)
                : "—"}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">
                {activeChat?.phone || "Введите номер телефона"}
              </h2>
              <p className="mt-1 text-xs text-slate-400">Личные сообщения</p>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto bg-[#101722] bg-[radial-gradient(#202b3c_1px,transparent_1px)] bg-[size:20px_20px] px-5 py-6 sm:px-8">
            {visibleMessages.length === 0 && (
              <div className="flex h-full min-h-52 items-center justify-center">
                <div className="max-w-72 rounded-2xl bg-slate-800/90 px-7 py-6 text-center shadow-sm">
                  <div
                    aria-hidden="true"
                    className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-400"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      className="size-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l-3 3V11.5A7.5 7.5 0 0 1 9.5 4h3a7.5 7.5 0 0 1 7.5 7.5Z"
                      />
                      <path strokeLinecap="round" d="M7 10h8M7 14h5" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold">
                    {activeChat?.phone
                      ? "Пока нет сообщений"
                      : "Начните общение"}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    {activeChat?.phone
                      ? "Новые сообщения этого чата появятся здесь."
                      : "Введите номер собеседника в панели слева, чтобы открыть переписку."}
                  </p>
                </div>
              </div>
            )}
            {visibleMessages.map((message) => (
              <Message
                key={`${message.chatId}:${message.id}`}
                isSender={message.isSender}
                message={message.message}
              />
            ))}
            <div ref={endRef} />
          </div>

          <footer className="border-t border-slate-700/50 bg-[#17202e] px-4 py-4 sm:px-6">
            <form
              className="flex items-center gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSendMessage();
              }}
            >
              <input
                type="text"
                aria-label="Текст сообщения"
                placeholder="Написать сообщение..."
                className="min-w-0 flex-1 rounded-2xl border border-transparent bg-slate-800 px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-[#17202e] focus:ring-2 focus:ring-blue-500/20"
                onChange={(e) => setMessageInput(e.target.value)}
                value={messageInput}
                maxLength={4096}
                disabled={!activeChat || busy || isSending}
              />
              <button
                type="submit"
                disabled={
                  !connection ||
                  !activeChat ||
                  busy ||
                  isSending ||
                  !messageInput.trim()
                }
                aria-label="Отправить сообщение"
                className="disabled:cursor-not-allowed disabled:opacity-40 flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-950/50 transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="size-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 3-7 18-4-7-7-4L21 3ZM10 14 21 3"
                  />
                </svg>
              </button>
            </form>
            {error && (
              <p role="alert" className="mt-3 text-sm text-red-300">
                {error}
              </p>
            )}
            <p role="status" className="mt-3 text-xs leading-5 text-slate-400">
              {status}
            </p>
          </footer>
        </section>
      </div>
    </main>
  );
};
