import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import {
  KnowledgeBaseChunk,
  KnowledgeBaseService,
} from '../kb/knowledge-base.service';
import { GroqService } from '../symptom/groq.service';
import { SupabaseService } from '../supabase/supabase.service';

interface CreateThreadBody {
  symptom_session_id?: string;
}

interface CreateMessageBody {
  content?: string;
}

interface ChatThread {
  id: string;
  user_id: string;
  symptom_session_id: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  thread_id: string;
  sender: 'user' | 'ai';
  content: string;
  created_at: string;
}

interface SymptomSessionContext {
  id: string;
  user_id: string;
  initial_input: string | null;
  triage_level: string | null;
  specialty_suggestion: string | null;
  red_flags_detected: boolean;
  summary: string | null;
  user_answers: unknown;
  health_profile_snapshot: unknown;
  created_at: string;
}

const CHAT_LIMITS = {
  free: 10,
  premium: 50,
} as const;

@Controller('chat')
@UseGuards(OptionalAuthGuard)
export class ChatController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly groq: GroqService,
    private readonly knowledgeBase: KnowledgeBaseService,
  ) {}

  @Post('threads')
  async createThread(@Body() body: CreateThreadBody, @Req() req: any) {
    const userId = this.requireUser(req);
    const symptomSessionId = this.requireString(
      body?.symptom_session_id,
      'symptom_session_id is required',
    );

    await this.getOwnedSession(symptomSessionId, userId);

    const { data: existing, error: existingError } = await this.supabase.supabase
      .from('chat_threads')
      .select('id, user_id, symptom_session_id, created_at')
      .eq('user_id', userId)
      .eq('symptom_session_id', symptomSessionId)
      .maybeSingle<ChatThread>();

    if (existingError) this.throwSupabaseError(existingError.message);
    if (existing) return existing;

    const { data, error } = await this.supabase.supabase
      .from('chat_threads')
      .insert({
        user_id: userId,
        symptom_session_id: symptomSessionId,
      })
      .select('id, user_id, symptom_session_id, created_at')
      .single<ChatThread>();

    if (error) this.throwSupabaseError(error.message);
    return data;
  }

  @Get('threads/:id/messages')
  async getMessages(@Param('id') id: string, @Req() req: any) {
    const userId = this.requireUser(req);
    await this.getOwnedThread(id, userId);

    const { data, error } = await this.supabase.supabase
      .from('chat_messages')
      .select('id, thread_id, sender, content, created_at')
      .eq('thread_id', id)
      .order('created_at', { ascending: true });

    if (error) this.throwSupabaseError(error.message);
    return data ?? [];
  }

  @Post('threads/:id/messages')
  async createMessage(
    @Param('id') id: string,
    @Body() body: CreateMessageBody,
    @Req() req: any,
  ) {
    const userId = this.requireUser(req);
    const content = this.requireString(body?.content, 'content is required');
    if (content.length > 2000) {
      throw new HttpException(
        'Message must be 2000 characters or fewer',
        HttpStatus.BAD_REQUEST,
      );
    }

    const thread = await this.getOwnedThread(id, userId);
    const session = await this.getOwnedSession(thread.symptom_session_id, userId);
    const chatLimit = await this.enforceChatLimit(userId);

    const { data: userMessage, error: userMessageError } =
      await this.supabase.supabase
        .from('chat_messages')
        .insert({
          thread_id: id,
          sender: 'user',
          content,
        })
        .select('id, thread_id, sender, content, created_at')
        .single<ChatMessage>();

    if (userMessageError) this.throwSupabaseError(userMessageError.message);

    const { data: history, error: historyError } = await this.supabase.supabase
      .from('chat_messages')
      .select('sender, content, created_at')
      .eq('thread_id', id)
      .order('created_at', { ascending: true })
      .limit(20);

    if (historyError) this.throwSupabaseError(historyError.message);

    const referenceChunks = await this.knowledgeBase.retrieveRelevantChunks(
      this.buildChatKbQuery(content, session),
      5,
    );

    const aiContent = await this.groq.generateFollowUpChatResponse({
      session,
      messages: history ?? [],
      references: referenceChunks,
    });

    const { data: assistantMessage, error: assistantMessageError } =
      await this.supabase.supabase
        .from('chat_messages')
        .insert({
          thread_id: id,
          sender: 'ai',
          content: aiContent,
        })
        .select('id, thread_id, sender, content, created_at')
        .single<ChatMessage>();

    if (assistantMessageError)
      this.throwSupabaseError(assistantMessageError.message);

    await this.incrementChatUsage(userId);

    return {
      userMessage,
      message: assistantMessage,
      limit: chatLimit,
      references: this.formatReferenceSummary(referenceChunks),
    };
  }

  private buildChatKbQuery(
    userMessage: string,
    session: SymptomSessionContext,
  ): string {
    return [
      `User message: ${userMessage}`,
      `Saved concern: ${session.initial_input ?? 'Not provided'}`,
      `Triage level: ${session.triage_level ?? 'Not provided'}`,
      `Summary: ${session.summary ?? 'Not provided'}`,
    ].join('\n');
  }

  private formatReferenceSummary(chunks: KnowledgeBaseChunk[]) {
    return chunks.map((chunk) => ({
      title: chunk.title,
      source: chunk.source,
      metadata: chunk.metadata,
    }));
  }

  private async getOwnedThread(id: string, userId: string): Promise<ChatThread> {
    const { data, error } = await this.supabase.supabase
      .from('chat_threads')
      .select('id, user_id, symptom_session_id, created_at')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle<ChatThread>();

    if (error) this.throwSupabaseError(error.message);
    if (!data) throw new HttpException('Thread not found', HttpStatus.NOT_FOUND);
    return data;
  }

  private async getOwnedSession(
    id: string,
    userId: string,
  ): Promise<SymptomSessionContext> {
    const { data, error } = await this.supabase.supabase
      .from('symptom_sessions')
      .select(
        'id, user_id, initial_input, triage_level, specialty_suggestion, red_flags_detected, summary, user_answers, health_profile_snapshot, created_at',
      )
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle<SymptomSessionContext>();

    if (error) this.throwSupabaseError(error.message);
    if (!data)
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    return data;
  }

  private async enforceChatLimit(userId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: user, error: userError } = await this.supabase.supabase
      .from('users')
      .select('tier')
      .eq('id', userId)
      .maybeSingle<{ tier: 'free' | 'premium' | null }>();

    if (userError) this.throwSupabaseError(userError.message);

    const tier = user?.tier === 'premium' ? 'premium' : 'free';
    const limit = CHAT_LIMITS[tier];
    const { data, error } = await this.supabase.supabase
      .from('usage_counters')
      .select('chats_used')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle<{ chats_used: number }>();

    if (error) this.throwSupabaseError(error.message);
    if ((data?.chats_used ?? 0) >= limit) {
      throw new HttpException(
        `Daily chat limit reached (${limit}/day).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return limit;
  }

  private async incrementChatUsage(userId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const { error: usageError } = await this.supabase.supabase.rpc(
      'increment_chat_usage',
      {
        p_user_id: userId,
        p_date: today,
      },
    );

    if (usageError) this.throwSupabaseError(usageError.message);
  }

  private requireUser(req: any): string {
    if (!req.user?.id)
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return req.user.id;
  }

  private requireString(value: unknown, message: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
    return value.trim();
  }

  private throwSupabaseError(message: string): never {
    throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
