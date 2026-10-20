"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { apiFetch } from "@/lib/auth/api-fetch";
import type { CheckoutStatusResult } from "@/lib/services/checkout-service";

export default function PurchaseAccessPage() {
  const [redeemedOrderId, setOrderId] = useState<string | null>(null);
  const query = useSyncExternalStore(subscribeLocation, () => window.location.search, () => "");
  const orderId = redeemedOrderId ?? new URLSearchParams(query).get("orderId");
  const [purchase, setPurchase] = useState<CheckoutStatusResult | null>(null);
  const [message, setMessage] = useState("Use o link recebido ou informe o e-mail da compra para recuperar o acesso.");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !query) return;
    started.current = true;
    const params = new URLSearchParams(query);
    const token = params.get("token");
    if (token) {
      window.history.replaceState({}, "", "/purchases/access");
      void fetch("/api/purchases/access/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
        .then(async response => {
          const body = await response.json();
          if (!response.ok) throw new Error("expired");
          setOrderId(body.orderId);
          window.history.replaceState({}, "", "/purchases/access?orderId=" + encodeURIComponent(body.orderId));
        })
        .catch(() => setMessage("Não foi possível usar este link. Solicite um novo acesso abaixo."));
    }
  }, [query]);

  useEffect(() => {
    if (!orderId) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    async function poll() {
      attempts++;
      try {
        const response = await apiFetch("/api/checkout/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }) });
        if (!response.ok) throw new Error("unavailable");
        const status: CheckoutStatusResult = await response.json();
        if (disposed) return;
        setPurchase(status);
        if (status.status === "refunded") { setMessage("Esta compra foi reembolsada. Novos downloads não estão disponíveis."); return; }
        if (status.status === "failed") { setMessage("O pagamento não foi aprovado."); return; }
        if (status.deliveryStatus === "completed") { setMessage("Seu documento está pronto."); return; }
        if (status.deliveryStatus === "failed") { setMessage("Seu pagamento foi confirmado. Você pode tentar preparar o documento novamente sem cobrança."); return; }
        setMessage(status.status === "pending" ? "Aguardando confirmação do pagamento. Você pode fechar esta página e voltar depois." : "Pagamento confirmado. Estamos preparando seu documento.");
        if (attempts < 20) timer = setTimeout(() => void poll(), Math.min(2000 * attempts, 15000));
      } catch { if (!disposed) setMessage("Não conseguimos acessar a compra agora. Use o e-mail abaixo para recuperar seu acesso."); }
    }
    void poll();
    return () => { disposed = true; clearTimeout(timer); };
  }, [orderId]);

  async function resend(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await apiFetch("/api/purchases/access/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, orderId }) });
      setMessage("Se houver uma compra disponível para esse e-mail, enviaremos um novo link. Confira também o spam.");
    } catch { setMessage("Não foi possível solicitar o acesso agora. Tente novamente em instantes."); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-lg px-6 py-16">
    <h1 className="text-2xl font-semibold">Sua compra</h1>
    <p className="mt-4" role="status">{message}</p>
    {purchase?.deliveryStatus === "completed" && purchase.status !== "refunded" && orderId &&
      <a className="mt-6 inline-block rounded bg-ink px-5 py-3 text-white" href={"/api/purchases/download?orderId=" + encodeURIComponent(orderId)}>Baixar documento</a>}
    {purchase?.deliveryStatus === "failed" && orderId && <button disabled={busy} className="mt-6 underline" onClick={async () => {
      setBusy(true);
      try {
        const response = await apiFetch("/api/checkout/retry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }) });
        if (!response.ok) throw new Error("retry failed");
        window.location.reload();
      } catch { setMessage("Sua compra continua salva. Não foi possível concluir a nova tentativa agora."); }
      finally { setBusy(false); }
    }}>Tentar novamente sem cobrança</button>}
    <form onSubmit={resend} className="mt-10 space-y-3 border-t pt-6">
      <label className="block text-sm font-medium" htmlFor="purchase-email">Recuperar acesso pelo e-mail da compra</label>
      <input id="purchase-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="w-full rounded border px-3 py-2" required />
      <button disabled={busy} className="rounded border px-4 py-2 disabled:opacity-50" type="submit">{busy ? "Aguarde…" : "Receber novo link"}</button>
    </form>
  </main>;
}

function subscribeLocation(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}
