-- Supabase SQL Editor에서 한 번 실행하세요.
create table if not exists public.study_plans (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  start_date date not null,
  target_date date not null,
  created_at timestamptz not null default now(),
  constraint study_plans_date_order check (target_date >= start_date),
  constraint study_plans_id_user_unique unique (id, user_id)
);

create table if not exists public.study_subjects (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  name text not null,
  lecture_count integer not null check (lecture_count > 0),
  avg_minutes integer not null default 60 check (avg_minutes > 0 and avg_minutes <= 600),
  color text not null default '#e4f0ff',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint study_subjects_plan_owner_fk foreign key (plan_id, user_id)
    references public.study_plans(id, user_id) on delete cascade,
  constraint study_subjects_plan_owner_unique unique (id, plan_id, user_id)
);

create table if not exists public.study_tasks (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  subject_id uuid not null references public.study_subjects(id) on delete cascade,
  study_date date not null,
  type text not null check (type in ('lecture', 'ox')),
  lecture_number integer,
  range_start integer,
  range_end integer,
  created_at timestamptz not null default now(),
  constraint study_tasks_lecture_number check (
    (type = 'lecture' and lecture_number > 0)
    or (type = 'ox' and range_start > 0 and range_end >= range_start)
  ),
  constraint study_tasks_plan_owner_fk foreign key (plan_id, user_id)
    references public.study_plans(id, user_id) on delete cascade,
  constraint study_tasks_subject_owner_fk foreign key (subject_id, plan_id, user_id)
    references public.study_subjects(id, plan_id, user_id) on delete cascade,
  constraint study_tasks_id_plan_user_unique unique (id, plan_id, user_id)
);

create index if not exists study_tasks_plan_date_idx on public.study_tasks(plan_id, study_date);

create table if not exists public.study_progress (
  task_id uuid primary key references public.study_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  completed_at timestamptz not null default now(),
  constraint study_progress_task_owner_fk foreign key (task_id, plan_id, user_id)
    references public.study_tasks(id, plan_id, user_id) on delete cascade
);

alter table public.study_plans enable row level security;
alter table public.study_subjects enable row level security;
alter table public.study_tasks enable row level security;
alter table public.study_progress enable row level security;

drop policy if exists "Users manage own study plans" on public.study_plans;
create policy "Users manage own study plans" on public.study_plans
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own study subjects" on public.study_subjects;
create policy "Users manage own study subjects" on public.study_subjects
  for all to authenticated using (
    auth.uid() = user_id and exists (
      select 1 from public.study_plans p where p.id = plan_id and p.user_id = auth.uid()
    )
  ) with check (
    auth.uid() = user_id and exists (
      select 1 from public.study_plans p where p.id = plan_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "Users manage own study tasks" on public.study_tasks;
create policy "Users manage own study tasks" on public.study_tasks
  for all to authenticated using (
    auth.uid() = user_id and exists (
      select 1 from public.study_plans p where p.id = plan_id and p.user_id = auth.uid()
    )
  ) with check (
    auth.uid() = user_id and exists (
      select 1 from public.study_plans p where p.id = plan_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "Users manage own study progress" on public.study_progress;
create policy "Users manage own study progress" on public.study_progress
  for all to authenticated using (
    auth.uid() = user_id and exists (
      select 1 from public.study_tasks t where t.id = task_id and t.plan_id = plan_id and t.user_id = auth.uid()
    )
  ) with check (
    auth.uid() = user_id and exists (
      select 1 from public.study_tasks t where t.id = task_id and t.plan_id = plan_id and t.user_id = auth.uid()
    )
  );

-- 실시간 기기 동기화를 위해 변경 사항을 Realtime 발행에 포함합니다.
do $$ begin
  alter publication supabase_realtime add table public.study_progress;
exception when duplicate_object then null;
end $$;
