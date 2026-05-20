import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { SupabaseService } from '../supabase/supabase.service';

interface RecipeRow {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string;
  tags: string[];
  conditions_supported: string[];
  diet_labels: string[];
  source_url: string | null;
  is_verified: boolean;
  created_at: string;
}

interface SessionProfileSnapshot {
  diet_prefs?: string[];
  chronic_conditions?: string[];
  allergies?: string[];
}

interface SymptomSessionForRecipes {
  id: string;
  triage_level: string | null;
  initial_input: string | null;
  health_profile_snapshot: SessionProfileSnapshot | null;
}

@Controller('symptom-sessions')
@UseGuards(OptionalAuthGuard)
export class RecipesController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get(':id/recipes')
  async getSessionRecipes(@Param('id') id: string, @Req() req: any) {
    if (!req.user?.id)
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const { data: session, error: sessionError } = await this.supabase.supabase
      .from('symptom_sessions')
      .select('id, triage_level, initial_input, health_profile_snapshot')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .maybeSingle<SymptomSessionForRecipes>();

    if (sessionError)
      throw new HttpException(
        sessionError.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    if (!session)
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);

    const { data: recipes, error: recipesError } = await this.supabase.supabase
      .from('recipes')
      .select(
        'id, title, ingredients, instructions, tags, conditions_supported, diet_labels, source_url, is_verified, created_at',
      )
      .eq('is_verified', true);

    if (recipesError)
      throw new HttpException(
        recipesError.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

    return this.rankRecipes(session, (recipes ?? []) as RecipeRow[]).slice(
      0,
      5,
    );
  }

  private rankRecipes(
    session: SymptomSessionForRecipes,
    recipes: RecipeRow[],
  ): RecipeRow[] {
    const profile = session.health_profile_snapshot ?? {};
    const dietPrefs = this.normalizeList(profile.diet_prefs);
    const chronicConditions = this.normalizeList(profile.chronic_conditions);
    const sessionTokens = this.tokenize(
      [session.initial_input, session.triage_level, ...chronicConditions]
        .filter(Boolean)
        .join(' '),
    );
    const allergies = this.normalizeList(profile.allergies);

    return recipes
      .map((recipe) => ({
        recipe,
        score: this.scoreRecipe(recipe, dietPrefs, sessionTokens, allergies),
      }))
      .filter(({ score }) => score > Number.NEGATIVE_INFINITY)
      .sort((a, b) => b.score - a.score || a.recipe.title.localeCompare(b.recipe.title))
      .map(({ recipe }) => recipe)
      .slice(0, 5);
  }

  private scoreRecipe(
    recipe: RecipeRow,
    dietPrefs: string[],
    sessionTokens: Set<string>,
    allergies: string[],
  ) {
    const recipeText = this.tokenize(
      [
        recipe.title,
        ...(recipe.tags ?? []),
        ...(recipe.conditions_supported ?? []),
        ...(recipe.diet_labels ?? []),
      ].join(' '),
    );
    const ingredientText = this.tokenize((recipe.ingredients ?? []).join(' '));
    const dietLabels = this.normalizeList(recipe.diet_labels);

    if (
      allergies.some((allergy) =>
        [...ingredientText].some((ingredientToken) =>
          ingredientToken.includes(allergy),
        ),
      )
    ) {
      return Number.NEGATIVE_INFINITY;
    }

    let score = recipe.is_verified ? 2 : 0;

    for (const pref of dietPrefs) {
      if (dietLabels.includes(pref)) score += 3;
      if (pref === 'vegetarian' && dietLabels.includes('vegan')) score += 2;
      if (pref === 'dairy-free' && !ingredientText.has('milk')) score += 1;
      if (pref === 'gluten-free' && !ingredientText.has('wheat')) score += 1;
    }

    for (const token of sessionTokens) {
      if (recipeText.has(token)) score += 2;
      if (ingredientText.has(token)) score += 1;
    }

    if (dietPrefs.length === 0 && score === 2) score += 1;

    return score;
  }

  private normalizeList(value?: string[] | null): string[] {
    return (value ?? [])
      .filter((item) => typeof item === 'string')
      .map((item) => item.toLowerCase().trim())
      .filter(Boolean);
  }

  private tokenize(value: string): Set<string> {
    return new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9-]+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 2),
    );
  }
}
