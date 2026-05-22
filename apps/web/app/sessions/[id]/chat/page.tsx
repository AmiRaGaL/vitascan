"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { useUser } from "@/hooks/useUser";
import { ApiError, apiFetch } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

interface ChatThread {
  id: string;
  symptom_session_id: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  thread_id: string;
  sender: "user" | "ai";
  content: string;
  created_at: string;
}


export default function SessionChatPage() {
  const params = useParams();
  const router = useRouter();
  const { isGuest, loading } = useUser();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const sessionId = useMemo(() => {
    const value = params.id;
    return Array.isArray(value) ? value[0] : value;
  }, [params.id]);

  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new ApiError("Authentication required", 401);
    }

    return { Authorization: `Bearer ${session.access_token}` };
  }, []);

  const loadMessages = useCallback(
    async (threadId: string) => {
      const authHeaders = await getAuthHeaders();
      const data = await apiFetch<ChatMessage[]>(
        `/chat/threads/${threadId}/messages`,
        {
          headers: authHeaders,
        },
      );
      setMessages(Array.isArray(data) ? data : []);
    },
    [getAuthHeaders],
  );

  useEffect(() => {
    if (loading || isGuest || !sessionId) return;

    const loadThread = async () => {
      setInitialLoading(true);
      setError(null);

      try {
        const authHeaders = await getAuthHeaders();
        const openedThread = await apiFetch<ChatThread>("/chat/threads", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({ symptom_session_id: sessionId }),
        });

        setThread(openedThread);
        await loadMessages(openedThread.id);
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) {
          router.push("/");
          return;
        }
        setError(
          err instanceof Error ? err.message : "Failed to open follow-up chat",
        );
      } finally {
        setInitialLoading(false);
      }
    };

    loadThread();
  }, [getAuthHeaders, isGuest, loadMessages, loading, router, sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!thread || sending) return;

    const content = input.trim();
    if (!content) return;

    const optimisticMessage: ChatMessage = {
      id: `pending-${Date.now()}`,
      thread_id: thread.id,
      sender: "user",
      content,
      created_at: new Date().toISOString(),
    };

    setInput("");
    setSending(true);
    setError(null);
    setMessages((current) => [...current, optimisticMessage]);

    try {
      const authHeaders = await getAuthHeaders();
      const data = await apiFetch<{
        userMessage: ChatMessage;
        message: ChatMessage;
      }>(`/chat/threads/${thread.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ content }),
      });

      setMessages((current) => [
        ...current.filter((message) => message.id !== optimisticMessage.id),
        data.userMessage as ChatMessage,
        data.message as ChatMessage,
      ]);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        router.push("/");
        return;
      }
      setMessages((current) =>
        current.filter((message) => message.id !== optimisticMessage.id),
      );
      setInput(content);
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (loading || (!isGuest && initialLoading)) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (isGuest) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/symptom-check" className="text-sm text-blue-600 hover:underline">
          Back to symptom check
        </Link>
        <div className="mt-6">
          <EmptyState
            title="Sign in to use follow-up chat"
            description="Follow-up chat is available for saved symptom checks after you sign in."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-3xl flex-col px-4 py-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/sessions/${sessionId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            Back to session
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">
            Follow-up questions
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            This chat uses your saved triage context.
          </p>
        </div>
      </div>

      <MedicalDisclaimer className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900" />

      {error && (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      )}

      <section className="flex min-h-[420px] flex-1 flex-col rounded-2xl border border-gray-200 bg-white">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[300px] items-center justify-center">
              <EmptyState
                title="No messages yet"
                description="Ask a follow-up question about this triage session."
              />
            </div>
          ) : (
            messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))
          )}

          {sending && (
            <div className="max-w-[82%] rounded-2xl rounded-bl-sm bg-gray-100 px-4 py-3 text-sm text-gray-500">
              VitaScan is thinking...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={sendMessage}
          className="border-t border-gray-100 p-3 sm:flex sm:gap-3"
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Ask about next steps, warning signs, or preparing for care..."
            className="min-h-14 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={sending || !input.trim() || !thread}
            className="mt-3 w-full rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 sm:mt-0 sm:w-auto"
          >
            Send
          </button>
        </form>
      </section>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.sender === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
          isUser
            ? "rounded-br-sm bg-blue-600 text-white"
            : "rounded-bl-sm bg-gray-100 text-gray-900"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
