 -- ─── Storage Bucket ───────────────────────────────────────────────────────────                                                                         
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'client-assets',
    'client-assets',
    false,
    52428800,  -- 50MB per file
    array['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/quicktime','application/pdf','application/msword','application/vnd.openxmlfor
  mats-officedocument.wordprocessingml.document']
  )
  on conflict (id) do nothing;

  -- ─── Storage RLS ──────────────────────────────────────────────────────────────
  -- Clients upload only to their own client-id subfolder
  create policy "clients upload own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'client-assets'
    and (storage.foldername(name))[1] = (
      select id::text from public.clients where user_id = auth.uid()
    )
  );

  -- Clients read only their own files
  create policy "clients read own files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'client-assets'
    and (storage.foldername(name))[1] = (
      select id::text from public.clients where user_id = auth.uid()
    )
  );

  -- Clients delete their own files
  create policy "clients delete own files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'client-assets'
    and (storage.foldername(name))[1] = (
      select id::text from public.clients where user_id = auth.uid()
    )
  );

  -- Admins read everything
  create policy "admins read all files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'client-assets'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

  -- Admins delete anything (e.g. moderation)
  create policy "admins delete any file"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'client-assets'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );