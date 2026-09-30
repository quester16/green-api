import { useState, type FormEvent } from "react";
import type { Connection } from "./types";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-700 bg-[#17202e] px-3 py-2.5 text-sm outline-none focus:border-blue-400 disabled:opacity-50";
const buttonClass =
  "w-full rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

type Props = {
  connected: boolean;
  busy: boolean;
  onConnect: (connection: Connection) => Promise<void>;
  onOpenChat: (phone: string) => Promise<void>;
  onDisconnect: () => void;
};

export const ConnectInstances = ({
  connected,
  busy,
  onConnect,
  onOpenChat,
  onDisconnect,
}: Props) => {
  const [instanceId, setInstanceId] = useState("");
  const [tokenApi, setTokenApi] = useState("");
  const [apiUrl, setApiUrl] = useState("https://4100.api.green-api.com");
  const [phone, setPhone] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const address = apiUrl.trim();
    void onConnect({
      instanceId: instanceId.trim(),
      tokenApi: tokenApi.trim(),
      apiUrl: address.endsWith("/") ? address.slice(0, -1) : address,
    });
  };

  return (
    <div className="mx-4 mb-4 space-y-5 rounded-xl border border-slate-700/50 bg-slate-800 p-4">
      <form className="space-y-3" onSubmit={handleSubmit}>
        <h2 className="text-sm font-semibold">Подключение</h2>
        <fieldset disabled={connected || busy} className="space-y-3">
          <label className="block text-xs text-slate-400">
            ID инстанса
            <input
              required
              inputMode="numeric"
              value={instanceId}
              onChange={(event) => setInstanceId(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-xs text-slate-400">
            Токен доступа
            <input
              required
              type="password"
              autoComplete="off"
              value={tokenApi}
              onChange={(event) => setTokenApi(event.target.value)}
              className={inputClass}
            />
          </label>
          <details>
            <summary className="cursor-pointer text-xs text-slate-400">
              Адрес API из кабинета
            </summary>
            <label className="mt-2 block text-xs text-slate-400">
              apiUrl
              <input
                required
                type="url"
                value={apiUrl}
                onChange={(event) => setApiUrl(event.target.value)}
                className={inputClass}
              />
            </label>
          </details>
        </fieldset>
        {connected ? (
          <button
            type="button"
            disabled={busy}
            className={buttonClass}
            onClick={() => {
              onDisconnect();
              setTokenApi("");
              setPhone("");
            }}
          >
            Отключиться
          </button>
        ) : (
          <button disabled={busy} className={buttonClass}>
            {busy ? "Проверка..." : "Подключиться"}
          </button>
        )}
      </form>
      {connected && (
        <form
          className="space-y-3 border-t border-slate-700 pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onOpenChat(phone);
          }}
        >
          <label className="block text-xs text-slate-400">
            Номер телефона собеседника
            <input
              required
              disabled={busy}
              type="tel"
              placeholder="+998 90 123 45 67"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={inputClass}
            />
          </label>
          <button disabled={busy} className={buttonClass}>
            {busy ? "Проверка..." : "Открыть чат"}
          </button>
        </form>
      )}
    </div>
  );
};
