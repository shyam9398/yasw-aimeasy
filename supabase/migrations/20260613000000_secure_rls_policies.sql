-- Define helper to resolve user role
create or replace function public.get_user_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer;

-- Hardening 1: subjects
drop policy if exists "subjects all" on public.subjects;
drop policy if exists "subjects authenticated all" on public.subjects;
create policy "subjects select" on public.subjects for select using (true);
create policy "subjects write" on public.subjects for all to authenticated 
  using (public.get_user_role() in ('content_creator', 'subadmin', 'admin')) 
  with check (public.get_user_role() in ('content_creator', 'subadmin', 'admin'));

-- Hardening 2: units
drop policy if exists "units all" on public.units;
drop policy if exists "units authenticated all" on public.units;
create policy "units select" on public.units for select using (true);
create policy "units write" on public.units for all to authenticated 
  using (public.get_user_role() in ('content_creator', 'subadmin', 'admin')) 
  with check (public.get_user_role() in ('content_creator', 'subadmin', 'admin'));

-- Hardening 3: content_items
drop policy if exists "content all" on public.content_items;
drop policy if exists "content authenticated all" on public.content_items;
create policy "content select" on public.content_items for select using (true);
create policy "content write" on public.content_items for all to authenticated 
  using (public.get_user_role() in ('content_creator', 'subadmin', 'admin')) 
  with check (public.get_user_role() in ('content_creator', 'subadmin', 'admin'));

-- Hardening 4: topics
drop policy if exists "topics all" on public.topics;
drop policy if exists "topics authenticated all" on public.topics;
create policy "topics select" on public.topics for select using (true);
create policy "topics write" on public.topics for all to authenticated 
  using (public.get_user_role() in ('content_creator', 'subadmin', 'admin')) 
  with check (public.get_user_role() in ('content_creator', 'subadmin', 'admin'));

-- Hardening 5: topic_videos
drop policy if exists "topic videos all" on public.topic_videos;
drop policy if exists "topic videos authenticated all" on public.topic_videos;
create policy "topic videos select" on public.topic_videos for select using (true);
create policy "topic videos write" on public.topic_videos for all to authenticated 
  using (public.get_user_role() in ('content_creator', 'subadmin', 'admin')) 
  with check (public.get_user_role() in ('content_creator', 'subadmin', 'admin'));

-- Hardening 6: universities
drop policy if exists "universities read" on public.universities;
drop policy if exists "universities write" on public.universities;
create policy "universities select" on public.universities for select using (true);
create policy "universities write" on public.universities for all to authenticated 
  using (public.get_user_role() in ('subadmin', 'admin')) 
  with check (public.get_user_role() in ('subadmin', 'admin'));

-- Hardening 7: branches
drop policy if exists "branches read" on public.branches;
drop policy if exists "branches write" on public.branches;
create policy "branches select" on public.branches for select using (true);
create policy "branches write" on public.branches for all to authenticated 
  using (public.get_user_role() in ('subadmin', 'admin')) 
  with check (public.get_user_role() in ('subadmin', 'admin'));

-- Hardening 8: regulations
drop policy if exists "Allow regs reads" on public.regulations;
drop policy if exists "Allow regs writes" on public.regulations;
create policy "regulations select" on public.regulations for select using (true);
create policy "regulations write" on public.regulations for all to authenticated 
  using (public.get_user_role() in ('subadmin', 'admin')) 
  with check (public.get_user_role() in ('subadmin', 'admin'));

-- Hardening 9: curriculums
drop policy if exists "curriculums all read" on public.curriculums;
drop policy if exists "curriculums all write" on public.curriculums;
create policy "curriculums select" on public.curriculums for select using (true);
create policy "curriculums write" on public.curriculums for all to authenticated 
  using (public.get_user_role() in ('content_creator', 'subadmin', 'admin')) 
  with check (public.get_user_role() in ('content_creator', 'subadmin', 'admin'));

-- Hardening 10: curriculum_units
drop policy if exists "curriculum units all" on public.curriculum_units;
create policy "curriculum_units select" on public.curriculum_units for select using (true);
create policy "curriculum_units write" on public.curriculum_units for all to authenticated 
  using (public.get_user_role() in ('content_creator', 'subadmin', 'admin')) 
  with check (public.get_user_role() in ('content_creator', 'subadmin', 'admin'));

-- Hardening 11: curriculum_topics
drop policy if exists "curriculum topics all" on public.curriculum_topics;
create policy "curriculum_topics select" on public.curriculum_topics for select using (true);
create policy "curriculum_topics write" on public.curriculum_topics for all to authenticated 
  using (public.get_user_role() in ('content_creator', 'subadmin', 'admin')) 
  with check (public.get_user_role() in ('content_creator', 'subadmin', 'admin'));

-- Hardening 12: curriculum_assignments
drop policy if exists "curriculum assignments all" on public.curriculum_assignments;
create policy "curriculum_assignments select" on public.curriculum_assignments for select using (true);
create policy "curriculum_assignments write" on public.curriculum_assignments for all to authenticated 
  using (public.get_user_role() in ('content_creator', 'subadmin', 'admin')) 
  with check (public.get_user_role() in ('content_creator', 'subadmin', 'admin'));

-- Hardening 13: curriculum_content_items
drop policy if exists "curriculum content all" on public.curriculum_content_items;
create policy "curriculum_content_items select" on public.curriculum_content_items for select using (true);
create policy "curriculum_content_items write" on public.curriculum_content_items for all to authenticated 
  using (public.get_user_role() in ('content_creator', 'subadmin', 'admin')) 
  with check (public.get_user_role() in ('content_creator', 'subadmin', 'admin'));
