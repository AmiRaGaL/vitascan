import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      request.user = { id: null };
      return true; // Allow guests
    }

    const token = authHeader.split(' ')[1];
    // Use getUser to validate the JWT securely
    const {
      data: { user },
      error,
    } = await this.supabaseService.supabase.auth.getUser(token);

    request.user = { id: error || !user ? null : user.id };
    return true;
  }
}
