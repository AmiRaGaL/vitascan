import { Logger } from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge-base.service';

describe('KnowledgeBaseService retrieval fallback behavior', () => {
  let loggerWarn: jest.SpyInstance;

  beforeEach(() => {
    loggerWarn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    loggerWarn.mockRestore();
  });

  function createService(options?: {
    embedding?: number[];
    embedError?: Error;
    rpcResult?: unknown;
  }) {
    const embeddings = {
      embedText: options?.embedError
        ? jest.fn().mockRejectedValue(options.embedError)
        : jest
            .fn()
            .mockResolvedValue(options?.embedding ?? Array(1536).fill(0.01)),
    };
    const supabase = {
      supabase: {
        rpc: jest.fn().mockResolvedValue(
          options?.rpcResult ?? {
            data: [
              {
                chunk_text: 'Chest pain with shortness of breath needs caution.',
                title: 'Chest pain triage basics',
                source: 'Internal',
                metadata: {
                  tags: ['chest pain', 'triage'],
                  last_reviewed: '2026-05-20',
                },
                similarity: 0.91,
              },
            ],
            error: null,
          },
        ),
      },
    };

    return {
      service: new KnowledgeBaseService(supabase as any, embeddings as any),
      embeddings,
      supabase,
    };
  }

  it('returns no context for an empty query without embedding or RPC calls', async () => {
    const { service, embeddings, supabase } = createService();

    await expect(service.retrieveRelevantChunks('   ')).resolves.toEqual([]);

    expect(embeddings.embedText).not.toHaveBeenCalled();
    expect(supabase.supabase.rpc).not.toHaveBeenCalled();
  });

  it('returns retrieved chunks from the match_kb_chunks RPC', async () => {
    const { service, embeddings, supabase } = createService();

    await expect(
      service.retrieveRelevantChunks('chest pain and trouble breathing', 3),
    ).resolves.toEqual([
      {
        chunk_text: 'Chest pain with shortness of breath needs caution.',
        title: 'Chest pain triage basics',
        source: 'Internal',
        metadata: {
          tags: ['chest pain', 'triage'],
          last_reviewed: '2026-05-20',
        },
        similarity: 0.91,
      },
    ]);

    expect(embeddings.embedText).toHaveBeenCalledWith(
      'chest pain and trouble breathing',
    );
    expect(supabase.supabase.rpc).toHaveBeenCalledWith('match_kb_chunks', {
      query_embedding: Array(1536).fill(0.01),
      match_count: 3,
    });
  });

  it('falls back to empty context when embedding generation fails', async () => {
    const { service, supabase } = createService({
      embedError: new Error('Embedding API key is not configured'),
    });

    await expect(service.retrieveRelevantChunks('fever')).resolves.toEqual([]);

    expect(supabase.supabase.rpc).not.toHaveBeenCalled();
  });

  it('falls back to empty context when Supabase vector search fails', async () => {
    const { service } = createService({
      rpcResult: { data: null, error: { message: 'RPC unavailable' } },
    });

    await expect(service.retrieveRelevantChunks('headache')).resolves.toEqual(
      [],
    );
  });
});
