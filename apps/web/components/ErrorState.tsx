import type { ReactNode } from "react";

export function ErrorState({
  title = "Something went wrong",
  message,
  action,
}: {
  title?: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <h3 className="text-sm font-semibold text-red-900">{title}</h3>
      <p className="mt-1 text-sm text-red-700">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
