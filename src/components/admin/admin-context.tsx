import { createContext, useContext } from "react";
import { toast } from "sonner";

export type AdminCtxValue = {
  token: string;
  setToken: (t: string) => void;
  logout: (msg?: string) => void;
};
export const AdminCtx = createContext<AdminCtxValue>({
  token: "",
  setToken: () => {},
  logout: () => {},
});
export const useAdmin = () => useContext(AdminCtx);

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e ?? "");
}

/** Shows a friendly toast, or signs out when the session has expired. */
export function reportError(e: unknown, logout: AdminCtxValue["logout"]) {
  const msg = errorMessage(e);
  if (msg.includes("SESSION_EXPIRED")) {
    logout("Session expired — please enter your PIN again.");
    return;
  }
  toast.error(msg || "Something went wrong. Please try again.");
}

export function xhrUpload(
  url: string,
  form: FormData,
  headers: Record<string, string>,
  onProgress: (pct: number) => void,
): Promise<{ status: number; json: unknown }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let json: unknown = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        json = null;
      }
      resolve({ status: xhr.status, json });
    };
    xhr.onerror = () => reject(new Error("Network error — check your internet connection."));
    xhr.send(form);
  });
}
