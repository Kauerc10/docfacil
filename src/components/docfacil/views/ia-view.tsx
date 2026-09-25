"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, FileText, RefreshCw, Send, Sparkles, Trash2 } from "lucide-react";
import { PageHeader, PageShell } from "./page-shell";
import { useNav } from "@/components/docfacil/nav-context";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/auth/api-fetch";
import type { AIDocumentDraft, AIDocumentSession } from "@/lib/ai/types";

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(url, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message ?? body?.error ?? "Não foi possível concluir esta ação.");
  return body as T;
}

const button = "rounded-xl bg-[var(--blue-royal)] px-4 py-2.5 font-semibold text-white disabled:opacity-50";
const secondary = "rounded-xl border border-[var(--border)] px-4 py-2.5 font-semibold text-ink disabled:opacity-50";

export function IAView() {
  const { navigate, params } = useNav();
  const { user, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<AIDocumentSession[]>([]);
  const [session, setSession] = useState<AIDocumentSession | null>(null);
  const [request, setRequest] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<AIDocumentDraft | null>(null);
  const [revision, setRevision] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = useRef<AIDocumentSession | null>(null);

  const adopt = useCallback((next: AIDocumentSession) => {
    current.current = next;
    setSession(next);
    setDraft(next.draft ?? null);
    setAnswers(next.answers ?? {});
    setDirty(false);
    setSessions((all) => [next, ...all.filter((item) => item.id !== next.id)]);
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    let alive = true;
    apiJson<{ sessions: AIDocumentSession[] }>("/api/ai/sessions")
      .then(({ sessions: loaded }) => {
        if (!alive) return;
        setSessions(loaded);
        const selected = loaded.find((item) => item.id === params.sessionId);
        if (selected) adopt(selected);
      })
      .catch((cause) => { if (alive) setError(cause.message); });
    return () => { alive = false; };
  }, [authLoading, user, params.sessionId, adopt]);

  const start = async () => {
    if (request.trim().length < 15) { setError("Descreva o pedido em pelo menos 15 caracteres."); return; }
    setBusy(true); setError("");
    try {
      const result = await apiJson<{ session: AIDocumentSession }>("/api/ai/sessions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: request.trim(), operationId: crypto.randomUUID() }),
      });
      adopt(result.session);
      setRequest("");
      navigate("ia", { sessionId: result.session.id });
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  };

  const action = async (payload: Record<string, unknown>): Promise<boolean> => {
    const active = current.current;
    if (!active || busy) return false;
    setBusy(true); setError("");
    try {
      const result = await apiJson<{ session: AIDocumentSession }>(`/api/ai/sessions/${active.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, expectedVersion: active.version, operationId: crypto.randomUUID() }),
      });
      adopt(result.session);
      return true;
    } catch (cause) { setError((cause as Error).message); return false; }
    finally { setBusy(false); }
  };

  const scheduleSave = (next: AIDocumentDraft) => {
    setDraft(next); setDirty(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const active = current.current;
      if (!active) return;
      setBusy(true); setError("");
      try {
        const result = await apiJson<{ session: AIDocumentSession }>(`/api/ai/sessions/${active.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save", value: next, expectedVersion: active.version, operationId: crypto.randomUUID() }),
        });
        adopt(result.session);
      } catch (cause) { setError((cause as Error).message); }
      finally { setBusy(false); }
    }, 800);
  };

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const openPreview = async () => {
    if (!session || busy || dirty) return;
    setBusy(true); setError("");
    try {
      const res = await apiFetch(`/api/ai/sessions/${session.id}/preview`);
      if (!res.ok) throw new Error((await res.json()).error?.message ?? "Prévia indisponível.");
      const url = URL.createObjectURL(await res.blob());
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  };

  const download = async (documentId: string) => {
    const result = await apiJson<{ downloadUrl: string }>(`/api/documents/${documentId}/download`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    });
    window.location.assign(result.downloadUrl);
  };

  const finalize = async () => {
    if (!session || busy) return;
    setBusy(true); setError("");
    try {
      const storageKey = `docfacil:ai-finalize:${session.id}`;
      const requestId = window.sessionStorage.getItem(storageKey) ?? crypto.randomUUID();
      window.sessionStorage.setItem(storageKey, requestId);
      const result = await apiJson<{ document: { documentId: string } }>(`/api/ai/sessions/${session.id}/finalize`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, expectedVersion: session.version }),
      });
      const updated = await apiJson<{ session: AIDocumentSession }>(`/api/ai/sessions/${session.id}`);
      adopt(updated.session);
      window.sessionStorage.removeItem(storageKey);
      await download(result.document.documentId);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    setBusy(true); setError("");
    try {
      const res = await apiFetch(`/api/ai/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Não foi possível excluir a sessão.");
      setSessions((all) => all.filter((item) => item.id !== id));
      if (session?.id === id) { setSession(null); current.current = null; navigate("ia"); }
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  };

  return <PageShell>
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <button className="mb-5 inline-flex items-center gap-2 text-ink/70" onClick={() => navigate("home")}><ArrowLeft size={17} />Voltar</button>
      <PageHeader eyebrow="Criar com IA" title="Conte o que precisa documentar" subtitle="Descreva o caso, responda às perguntas e revise cada seção antes do PDF." />
      {!authLoading && !user && <div className="mt-8 rounded-2xl border p-6">Entre na sua conta para usar o piloto. <button className={button} onClick={() => navigate("login")}>Entrar</button></div>}
      {error && <p role="alert" className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">{error}</p>}
      {user && <div className="mt-8 grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl border border-[var(--border)] bg-surface p-4">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Sessões</h2><button className="text-sm text-[var(--blue-royal)]" onClick={() => { setSession(null); current.current = null; navigate("ia"); }}>Nova</button></div>
          <div className="space-y-2">{sessions.map((item) => <div key={item.id} className="flex rounded-xl border border-[var(--border)] p-2">
            <button className="min-w-0 flex-1 text-left text-sm" onClick={() => { adopt(item); navigate("ia", { sessionId: item.id }); }}><span className="block truncate font-semibold">{item.documentType || item.request}</span><span className="text-ink/55">{item.status}</span></button>
            <button aria-label="Excluir sessão" disabled={busy} onClick={() => remove(item.id)}><Trash2 size={15} /></button>
          </div>)}</div>
        </aside>
        <section className="rounded-2xl border border-[var(--border)] bg-surface p-5 sm:p-7">
          {!session && <div className="space-y-4"><label htmlFor="ai-request" className="font-semibold">O que você precisa?</label>
            <textarea id="ai-request" value={request} onChange={(e) => setRequest(e.target.value)} maxLength={2000} rows={6} className="w-full rounded-xl border p-3" placeholder="Ex.: Quero registrar o empréstimo de um notebook para um funcionário por três meses..." />
            <button className={`${button} inline-flex items-center gap-2`} disabled={busy} onClick={start}><Send size={16} />Começar</button></div>}
          {session && <div className="space-y-6">
            <div className="flex items-start gap-3"><Sparkles className="mt-1 text-[var(--blue-royal)]" /><div><h2 className="text-xl font-bold">{session.documentType || "Analisando pedido"}</h2><p className="text-sm text-ink/60">{session.request}</p></div></div>
            {session.status === "blocked" && <p className="rounded-xl bg-amber-50 p-4">Este pedido não pode seguir pelo fluxo de IA. {session.blockReason || "Revise o pedido ou escolha outro documento."}</p>}
            {session.status === "model_choice" && session.modelSuggestion && <div className="rounded-xl bg-[var(--paper)] p-4"><p>Encontrei o modelo <strong>{session.modelSuggestion.name}</strong>.</p><div className="mt-3 flex flex-wrap gap-2"><button disabled={busy} className={button} onClick={async () => { if (await action({ action: "choose", value: "standard" })) navigate("criar", { slug: session.modelSuggestion!.slug }); }}>Usar modelo padrão</button><button disabled={busy} className={secondary} onClick={() => { void action({ action: "choose", value: "ai" }); }}>Continuar com IA</button></div></div>}
            {session.status === "standard" && session.modelSuggestion && <div className="rounded-xl bg-[var(--paper)] p-4"><p>Você escolheu o modelo {session.modelSuggestion.name}.</p><button className={button} onClick={() => navigate("criar", { slug: session.modelSuggestion!.slug })}>Abrir modelo</button></div>}
            {session.status === "collecting" && <div className="space-y-4"><h3 className="font-bold">Informações necessárias</h3>{session.questions.map((q) => <label key={q} className="block text-sm font-medium">{q}<input className="mt-1 w-full rounded-xl border p-3" value={answers[q] ?? ""} maxLength={1500} onChange={(e) => setAnswers((old) => ({ ...old, [q]: e.target.value }))} /></label>)}<button className={button} disabled={busy || session.questions.some((q) => !answers[q]?.trim())} onClick={() => action({ action: "answer", value: answers })}>Gerar rascunho</button></div>}
            {(session.status === "paused" || session.status === "drafting") && <div className="space-y-3"><p>O processo foi pausado ou ainda está em andamento. Seu progresso está salvo.</p><button disabled={busy} className={`${secondary} inline-flex items-center gap-2`} onClick={() => action({ action: "retry" })}><RefreshCw size={16} />Retomar</button></div>}
            {session.warnings.map((warning, index) => <p key={index} className="rounded-xl bg-amber-50 p-3 text-sm">{warning}</p>)}
            {session.status === "reviewing" && draft && <div className="space-y-5"><h3 className="font-bold">Revise o documento</h3><input aria-label="Título" disabled={busy} className="w-full rounded-xl border p-3 text-lg font-bold" value={draft.title} onChange={(e) => scheduleSave({ ...draft, title: e.target.value })} />
              {draft.sections.map((section, i) => <div key={i} className="space-y-2 rounded-xl border p-4"><input aria-label={`Título da seção ${i + 1}`} disabled={busy} className="w-full border-b p-2 font-semibold" value={section.title} onChange={(e) => scheduleSave({ ...draft, sections: draft.sections.map((s, n) => n === i ? { ...s, title: e.target.value } : s) })} />{section.paragraphs.map((p, j) => <textarea key={j} aria-label={`Parágrafo ${j + 1} da seção ${i + 1}`} disabled={busy} rows={4} className="w-full rounded-lg border p-2" value={p} onChange={(e) => scheduleSave({ ...draft, sections: draft.sections.map((s, n) => n === i ? { ...s, paragraphs: s.paragraphs.map((old, k) => k === j ? e.target.value : old) } : s) })} />)}</div>)}
              {session.validation?.issues.map((issue) => <p key={issue} className="text-sm text-red-700">{issue}</p>)}
              <p className="text-xs text-ink/55">{dirty ? "Salvando alterações..." : "Alterações salvas."} Revise nomes, fatos e condições antes de aprovar.</p>
              <div className="flex flex-wrap gap-2"><button className={secondary} disabled={busy || dirty} onClick={() => action({ action: "validate" })}>Validar</button><button className={secondary} disabled={busy || dirty} onClick={openPreview}>Ver PDF</button><button className={button} disabled={busy || dirty || !!session.validation?.issues.length || session.validation?.version !== session.version} onClick={() => action({ action: "approve" })}>Aprovar rascunho</button></div>
              <div className="border-t pt-4"><label className="text-sm font-semibold">Pedir ajuste à IA ({2 - session.revisions} restantes)</label><textarea className="mt-2 w-full rounded-xl border p-3" value={revision} onChange={(e) => setRevision(e.target.value)} rows={2} /><button className={secondary} disabled={busy || dirty || session.revisions >= 2 || revision.trim().length < 3} onClick={() => { action({ action: "revise", instruction: revision }); setRevision(""); }}>Solicitar revisão</button></div></div>}
            {session.status === "approved" && <div className="space-y-3"><p>Rascunho aprovado. Você pode finalizar o PDF do piloto.</p><button className={`${button} inline-flex items-center gap-2`} disabled={busy} onClick={finalize}><FileText size={16} />Gerar PDF</button></div>}
            {session.status === "completed" && session.documentId && <button className={`${button} inline-flex items-center gap-2`} disabled={busy} onClick={() => download(session.documentId!).catch((cause) => setError(cause.message))}><Download size={16} />Baixar PDF</button>}
          </div>}
        </section>
      </div>}
      <p className="mt-6 text-sm text-ink/60">A validação automática auxilia a revisão; ela não garante validade jurídica para todo caso.</p>
    </main>
  </PageShell>;
}
