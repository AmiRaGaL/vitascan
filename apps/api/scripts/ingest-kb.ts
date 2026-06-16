import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '../../.env', quiet: true });

interface KbDocument {
  id: string;
  title: string;
  source: string;
  content: string;
  tags: string[] | null;
  emergency_red_flags: string[] | null;
  last_reviewed: string | null;
}

interface EmbeddingResponse {
  data?: Array<{ embedding?: number[] }>;
  embedding?: { values?: number[] };
  embeddings?: Array<{ values?: number[] }>;
  error?: { message?: string };
}

type EmbeddingProvider = 'gemini' | 'openai';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const embeddingProvider = getEmbeddingProvider();
const embeddingModel =
  process.env.EMBEDDING_MODEL ??
  (embeddingProvider === 'gemini'
    ? 'gemini-embedding-2'
    : 'text-embedding-3-small');
const embeddingDimensions = getEmbeddingDimensions();
const embeddingApiUrl =
  process.env.EMBEDDING_API_URL ??
  getDefaultEmbeddingApiUrl(embeddingProvider, embeddingModel);
const embeddingApiKey =
  embeddingProvider === 'gemini'
    ? process.env.GEMINI_API_KEY
    : (process.env.EMBEDDING_API_KEY ?? process.env.OPENAI_API_KEY);

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

if (!embeddingApiKey) {
  throw new Error(
    embeddingProvider === 'gemini'
      ? 'GEMINI_API_KEY is required when EMBEDDING_PROVIDER is gemini'
      : 'EMBEDDING_API_KEY or OPENAI_API_KEY is required when EMBEDDING_PROVIDER is openai',
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data: documents, error } = await supabase
    .from('kb_documents')
    .select(
      'id, title, source, content, tags, emergency_red_flags, last_reviewed',
    )
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  for (const document of (documents ?? []) as KbDocument[]) {
    const chunks = chunkDocument(document.content);

    await supabase
      .from('kb_embeddings')
      .delete()
      .eq('document_id', document.id);

    for (const [index, chunkText] of chunks.entries()) {
      const embedding = await embedText(chunkText);
      const { error: insertError } = await supabase
        .from('kb_embeddings')
        .insert({
          document_id: document.id,
          chunk_id: index,
          chunk_text: chunkText,
          embedding,
          metadata: {
            title: document.title,
            source: document.source,
            tags: document.tags ?? [],
            emergency_red_flags: document.emergency_red_flags ?? [],
            last_reviewed: document.last_reviewed,
          },
        });

      if (insertError) throw new Error(insertError.message);
    }

    console.log(`Embedded ${chunks.length} chunk(s): ${document.title}`);
  }
}

function chunkDocument(content: string): string[] {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs.length > 0 ? paragraphs : [content]) {
    if ((current + '\n\n' + paragraph).trim().length > 1200 && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = [current, paragraph].filter(Boolean).join('\n\n');
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function embedText(text: string): Promise<number[]> {
  const response = await fetch(embeddingApiUrl, {
    method: 'POST',
    headers: getEmbeddingHeaders(),
    body: JSON.stringify(getEmbeddingRequestBody(text)),
  });

  const payload = (await response
    .json()
    .catch(() => null)) as EmbeddingResponse | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? 'Failed to generate embedding');
  }

  const embedding = extractEmbedding(payload);
  if (!Array.isArray(embedding) || embedding.length !== embeddingDimensions) {
    throw new Error('Embedding provider returned an invalid vector');
  }

  return embedding;
}

function getEmbeddingProvider(): EmbeddingProvider {
  const provider = (process.env.EMBEDDING_PROVIDER ?? 'gemini').toLowerCase();
  return provider === 'openai' ? 'openai' : 'gemini';
}

function getEmbeddingDimensions() {
  const dimensions = Number(process.env.EMBEDDING_DIMENSIONS ?? '1536');
  return Number.isInteger(dimensions) && dimensions > 0 ? dimensions : 1536;
}

function getDefaultEmbeddingApiUrl(provider: EmbeddingProvider, model: string) {
  if (provider === 'gemini') {
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`;
  }

  return 'https://api.openai.com/v1/embeddings';
}

function getEmbeddingHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (embeddingProvider === 'gemini') {
    headers['x-goog-api-key'] = embeddingApiKey!;
  } else {
    headers.Authorization = `Bearer ${embeddingApiKey}`;
  }

  return headers;
}

function getEmbeddingRequestBody(text: string) {
  if (embeddingProvider === 'gemini') {
    return {
      model: `models/${embeddingModel}`,
      content: {
        parts: [{ text }],
      },
      embedContentConfig: {
        outputDimensionality: embeddingDimensions,
      },
    };
  }

  return {
    model: embeddingModel,
    input: text,
    dimensions: embeddingDimensions,
  };
}

function extractEmbedding(payload: EmbeddingResponse | null) {
  if (embeddingProvider === 'gemini') {
    return payload?.embeddings?.[0]?.values ?? payload?.embedding?.values;
  }

  return payload?.data?.[0]?.embedding;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
