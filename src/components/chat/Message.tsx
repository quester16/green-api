import { cn } from "cn";

type Params = {
  isSender?: boolean;
  message: string;
};

export const Message = ({ isSender = false, message }: Params) => {
  return (
    <div
      className={cn(
        "mb-3 w-fit max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-6 shadow-sm sm:max-w-[75%]",
        isSender
          ? "ml-auto rounded-br-sm bg-blue-600 text-white"
          : "mr-auto rounded-bl-sm border border-slate-700 bg-slate-800 text-slate-100",
      )}
    >
      {message}
    </div>
  );
};
