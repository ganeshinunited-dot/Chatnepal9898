import { useState } from "react";
import { Link } from "wouter";
import { Menu, PanelLeft, Send, Sparkles, Copy, RefreshCw } from "lucide-react";
import { Streamdown } from "streamdown";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";

type Message = { role: "user" | "assistant"; content: string };
const prompts = ["नेपालको संघीय संरचना सरल भाषामा बुझाऊ", "Romanized Nepali लाई शुद्ध नेपालीमा बदल", "काठमाडौंबाट पोखरा जाने विकल्पहरू के हुन्?", "मलाई एउटा छोटो नेपाली कविता लेख"];

export default function ChatPage() {
  const { user, isAuthenticated } = useAuth();
  const [sidebar, setSidebar] = useState(true);
  const [model, setModel] = useState("np1-moni");
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [localMessages, setLocalMessages] = useState<Message[]>([]); const [lastPrompt, setLastPrompt] = useState("");
  const conversations = trpc.chat.conversations.useQuery(undefined, { enabled: !!isAuthenticated });
  const create = trpc.chat.createConversation.useMutation();
  const send = trpc.chat.send.useMutation();
  const savedMessages = trpc.chat.messages.useQuery({ conversationId: conversationId ?? 0 }, { enabled: !!conversationId });
  const messages: Message[] = conversationId && savedMessages.data ? savedMessages.data.filter(m => m.role !== "system").map(m => ({ role: m.role as "user" | "assistant", content: m.content })) : localMessages;

  async function submit(event?: React.FormEvent) {
    event?.preventDefault();
    const content = input.trim();
    if (!content) return;
    setLastPrompt(content);
    setInput("");
    if (!isAuthenticated) {
      setLocalMessages(previous => [...previous, { role: "user", content }, { role: "assistant", content: "यो preview mode हो। Real NP1 MONI response का लागि sign in गर्नुहोस्।" }]);
      return;
    }
    let id = conversationId;
    if (!id) {
      const created = await create.mutateAsync({ title: content.slice(0, 50), model });
      id = created.id;
      setConversationId(id);
    }
    setLocalMessages(previous => [...previous, { role: "user", content }]);
    try { const answer = await send.mutateAsync({ conversationId: id, model, content }); setLocalMessages(previous => [...previous, { role: "assistant", content: answer.content }]); savedMessages.refetch(); conversations.refetch(); } catch { setLocalMessages(previous => [...previous, { role: "assistant", content: "उत्तर तयार गर्न समस्या भयो। फेरि प्रयास गर्नुहोस्।" }]); }
  }

  async function retryLast() { if (!lastPrompt) return; if (!isAuthenticated) { setLocalMessages(previous => [...previous, { role: "user", content: lastPrompt }, { role: "assistant", content: "यो preview mode हो। Real NP1 MONI response का लागि sign in गर्नुहोस्।" }]); return; } let id = conversationId; try { if (!id) { const created = await create.mutateAsync({ title: lastPrompt.slice(0, 48) }); id = created.id; setConversationId(id); } setLocalMessages(previous => [...previous, { role: "user", content: lastPrompt }]); const answer = await send.mutateAsync({ conversationId: id, model, content: lastPrompt }); setLocalMessages(previous => [...previous, { role: "assistant", content: answer.content }]); savedMessages.refetch(); conversations.refetch(); } catch { setLocalMessages(previous => [...previous, { role: "assistant", content: "उत्तर तयार गर्न समस्या भयो। फेरि प्रयास गर्नुहोस्।" }]); } }

  return <main className="flex h-screen overflow-hidden bg-[#171615] text-[#f5e6ca]">
    {sidebar && <aside className="fixed inset-y-0 left-0 z-40 flex w-[285px] flex-col border-r border-white/10 bg-[#1e1c1a] md:relative">
      <div className="flex h-20 items-center justify-between border-b border-white/10 px-5"><Link href="/"><b>Chat<span className="text-[#e58b55]">NP</span> <span className="text-xs text-white/35">च्याट</span></b></Link><button className="md:hidden" onClick={() => setSidebar(false)}>×</button></div>
      <div className="p-4"><button onClick={() => { setConversationId(null); setLocalMessages([]); }} className="w-full rounded-xl bg-[#e58b55] px-4 py-3 font-semibold text-[#211915]">＋ New conversation</button></div>
      <div className="flex-1 p-4 text-sm text-white/40">{conversations.data?.length ? conversations.data.map(c => <button key={c.id} onClick={() => setConversationId(c.id)} className="mb-1 block w-full rounded-xl p-3 text-left hover:bg-white/5">{c.title}</button>) : "Your conversations will appear here after sign in."}</div>
      <div className="border-t border-white/10 p-4 text-sm">{user?.name ?? "Preview mode"}</div>
    </aside>}
    {!sidebar && <button onClick={() => setSidebar(true)} className="fixed left-4 top-4 z-30 rounded-xl border border-white/10 bg-[#24211f] p-3"><PanelLeft className="size-4" /></button>}
    <section className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-20 items-center justify-between border-b border-white/10 px-4 md:px-8"><div className="flex items-center gap-3"><button onClick={() => setSidebar(!sidebar)} className="md:hidden"><Menu /></button><div><p className="text-sm">{conversationId ? "MONI conversation" : "New conversation"}</p><p className="text-xs text-white/35">Nepal-first intelligence layer</p></div></div><select value={model} onChange={e => setModel(e.target.value)} className="rounded-full border border-[#e58b55]/40 bg-[#e58b55]/10 px-3 py-2 text-xs text-[#f1a06c]"><option value="np1-moni">NP1 MONI · flagship</option><option value="gpt-5">GPT-5 · general</option><option value="claude-sonnet-4-6">Claude · reasoning</option></select></header>
      <div className="flex-1 overflow-auto"><div className="mx-auto flex min-h-full max-w-4xl flex-col justify-center gap-8 px-4 py-8 md:px-8">{!messages.length ? <><div className="text-center"><div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#e58b55]/15"><Sparkles className="text-[#f1a06c]" /></div><h1 className="mt-6 text-3xl font-semibold">कसरी सहयोग गरूँ?</h1><p className="mt-3 text-sm text-white/45">Ask in Nepali, English, or romanized Nepali.</p></div><div className="grid gap-3 sm:grid-cols-2">{prompts.map(prompt => <button key={prompt} onClick={() => setInput(prompt)} className="rounded-2xl border border-white/10 bg-white/[.035] p-4 text-left text-sm text-white/55 hover:border-[#e58b55]/40">{prompt}</button>)}</div></> : <div className="space-y-7">{messages.map((message, index) => <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-3xl px-5 py-4 text-sm leading-7 ${message.role === "user" ? "bg-[#e58b55] text-[#211915]" : "border border-white/10 bg-white/[.04] text-white/75"}`}>{message.role === "assistant" ? <Streamdown>{message.content}</Streamdown> : message.content}<div className="mt-2 flex gap-2 text-white/40"><button onClick={() => navigator.clipboard?.writeText(message.content)}><Copy className="size-3" /></button>{message.role === "assistant" && <button onClick={retryLast} title="Retry previous prompt"><RefreshCw className="size-3" /></button>}</div></div></div>)}{send.isPending && <p className="animate-pulse text-sm text-white/40">MONI is thinking…</p>}</div>}</div></div>
      <div className="mx-auto w-full max-w-4xl px-4 pb-5 md:px-8"><form onSubmit={submit} className="flex rounded-3xl border border-white/10 bg-[#24211f] p-2"><textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} rows={1} placeholder="Ask NP1 MONI… / सोध्नुहोस्…" className="min-h-12 flex-1 resize-none bg-transparent px-4 py-3 text-sm outline-none" /><button disabled={!input.trim()} className="grid size-12 place-items-center rounded-2xl bg-[#e58b55] text-[#211915]"><Send className="size-5" /></button></form>{!isAuthenticated && <p className="mt-3 text-center text-xs text-white/35">Preview mode. <button onClick={() => startLogin()} className="text-[#f1a06c]">Sign in</button> to save chats.</p>}</div>
    </section>
  </main>;
}
