create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  ingredients jsonb not null default '[]'::jsonb,
  instructions text not null,
  tags text[] not null default '{}',
  conditions_supported text[] not null default '{}',
  diet_labels text[] not null default '{}',
  source_url text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  constraint recipes_title_unique unique (title),
  constraint recipes_ingredients_array_check check (jsonb_typeof(ingredients) = 'array')
);

alter table public.recipes add column if not exists id uuid default gen_random_uuid();
alter table public.recipes add column if not exists title text;
alter table public.recipes add column if not exists ingredients jsonb not null default '[]'::jsonb;
alter table public.recipes add column if not exists instructions text;
alter table public.recipes add column if not exists tags text[] not null default '{}';
alter table public.recipes add column if not exists conditions_supported text[] not null default '{}';
alter table public.recipes add column if not exists diet_labels text[] not null default '{}';
alter table public.recipes add column if not exists source_url text;
alter table public.recipes add column if not exists is_verified boolean not null default false;
alter table public.recipes add column if not exists created_at timestamptz not null default now();

create index if not exists recipes_verified_idx on public.recipes (is_verified);
create unique index if not exists recipes_title_unique_idx on public.recipes (title);
create index if not exists recipes_tags_gin_idx on public.recipes using gin (tags);
create index if not exists recipes_conditions_gin_idx on public.recipes using gin (conditions_supported);
create index if not exists recipes_diet_labels_gin_idx on public.recipes using gin (diet_labels);

alter table public.recipes enable row level security;

drop policy if exists "Anyone can read verified recipes" on public.recipes;
create policy "Anyone can read verified recipes"
  on public.recipes for select
  using (is_verified = true);

insert into public.recipes (
  title,
  ingredients,
  instructions,
  tags,
  conditions_supported,
  diet_labels,
  source_url,
  is_verified
)
values
  (
    'Ginger Rice Porridge',
    '["1/2 cup rice", "4 cups low-sodium vegetable broth", "1 tsp grated ginger", "1 carrot, diced", "1 tsp olive oil"]'::jsonb,
    'Simmer rice, broth, ginger, and carrot for 35 to 40 minutes until soft. Stir in olive oil and serve warm.',
    array['gentle', 'digestive', 'warm'],
    array['nausea', 'stomach', 'fatigue'],
    array['vegetarian', 'dairy-free'],
    null,
    true
  ),
  (
    'Banana Oat Bowl',
    '["1/2 cup rolled oats", "1 banana", "1 tbsp chia seeds", "1 cup water or milk", "1 tsp honey"]'::jsonb,
    'Cook oats with water or milk until creamy. Top with sliced banana, chia seeds, and honey.',
    array['breakfast', 'fiber', 'soft'],
    array['fatigue', 'digestive', 'heart'],
    array['vegetarian'],
    null,
    true
  ),
  (
    'Lemon Lentil Soup',
    '["1 cup red lentils", "5 cups low-sodium broth", "1 lemon", "1 carrot", "1 celery stalk", "1 tsp olive oil"]'::jsonb,
    'Simmer lentils, broth, carrot, and celery for 25 minutes. Finish with lemon juice and olive oil.',
    array['soup', 'protein', 'hydrating'],
    array['cold', 'fatigue', 'inflammation'],
    array['vegan', 'vegetarian', 'dairy-free'],
    null,
    true
  ),
  (
    'Baked Salmon With Greens',
    '["1 salmon fillet", "2 cups spinach", "1 tsp olive oil", "1 lemon wedge", "1/2 cup cooked quinoa"]'::jsonb,
    'Bake salmon at 400 F for 12 to 15 minutes. Serve with spinach, quinoa, olive oil, and lemon.',
    array['omega-3', 'protein', 'heart'],
    array['heart', 'inflammation', 'fatigue'],
    array['gluten-free', 'dairy-free'],
    null,
    true
  ),
  (
    'Turkey Vegetable Rice Bowl',
    '["3 oz cooked turkey", "1/2 cup brown rice", "1 cup steamed zucchini", "1/2 avocado", "1 tsp olive oil"]'::jsonb,
    'Layer rice, turkey, zucchini, and avocado. Drizzle with olive oil and serve warm.',
    array['protein', 'balanced', 'simple'],
    array['fatigue', 'muscle', 'recovery'],
    array['gluten-free', 'dairy-free'],
    null,
    true
  ),
  (
    'White Bean Spinach Stew',
    '["1 can white beans, rinsed", "2 cups spinach", "2 cups low-sodium broth", "1 tomato, diced", "1 tsp olive oil"]'::jsonb,
    'Simmer beans, broth, and tomato for 15 minutes. Stir in spinach and olive oil before serving.',
    array['fiber', 'iron', 'stew'],
    array['fatigue', 'heart', 'inflammation'],
    array['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
    null,
    true
  ),
  (
    'Cucumber Yogurt Plate',
    '["1 cup plain yogurt", "1/2 cucumber", "1 tbsp dill", "1 tsp lemon juice", "1 slice whole grain toast"]'::jsonb,
    'Mix yogurt with cucumber, dill, and lemon. Serve chilled with toast.',
    array['cooling', 'light', 'protein'],
    array['throat', 'digestive', 'heat'],
    array['vegetarian'],
    null,
    true
  ),
  (
    'Sweet Potato Black Bean Bowl',
    '["1 roasted sweet potato", "1/2 cup black beans", "1/2 cup corn", "1 tbsp pumpkin seeds", "1 tsp olive oil"]'::jsonb,
    'Top roasted sweet potato with warmed beans, corn, pumpkin seeds, and olive oil.',
    array['fiber', 'magnesium', 'balanced'],
    array['fatigue', 'muscle', 'heart'],
    array['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
    null,
    true
  ),
  (
    'Chicken Noodle Soup',
    '["3 oz cooked chicken", "4 cups low-sodium broth", "1/2 cup noodles", "1 carrot", "1 celery stalk"]'::jsonb,
    'Simmer broth, carrot, celery, and noodles until tender. Add chicken and warm through.',
    array['soup', 'hydrating', 'comfort'],
    array['cold', 'throat', 'fatigue'],
    array['dairy-free'],
    null,
    true
  ),
  (
    'Berry Kefir Smoothie',
    '["1 cup kefir", "1/2 cup berries", "1/2 banana", "1 tbsp ground flaxseed", "1/2 cup ice"]'::jsonb,
    'Blend all ingredients until smooth. Serve immediately.',
    array['probiotic', 'smoothie', 'antioxidant'],
    array['digestive', 'fatigue', 'inflammation'],
    array['vegetarian', 'gluten-free'],
    null,
    true
  )
on conflict (title) do update set
  ingredients = excluded.ingredients,
  instructions = excluded.instructions,
  tags = excluded.tags,
  conditions_supported = excluded.conditions_supported,
  diet_labels = excluded.diet_labels,
  source_url = excluded.source_url,
  is_verified = excluded.is_verified;
