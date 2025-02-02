-- Create the feed_archives table if it doesn't exist
create or replace function create_feed_archives_if_not_exists(table_name text, indexes text[])
returns void as $$
begin
  -- Create table if it doesn't exist
  if not exists (select from pg_tables where schemaname = 'public' and tablename = table_name) then
    execute format('
      create table %I (
        id text primary key,
        feed_id text not null,
        submitted_by text not null,
        submitted_at timestamp with time zone not null,
        status text not null,
        approved_by text,
        approved_at timestamp with time zone,
        content jsonb not null,
        metadata jsonb not null default ''{}'',
        created_at timestamp with time zone not null default now(),
        updated_at timestamp with time zone not null default now()
      )', table_name);

    -- Create indexes
    foreach index_name in array indexes loop
      execute format('
        create index if not exists %I_%I_idx on %I(%I)',
        table_name, index_name, table_name, index_name);
    end loop;
  end if;
end;
$$ language plpgsql security definer;

-- Function to get feed archive statistics
create or replace function get_feed_archive_stats()
returns json as $$
declare
  result json;
begin
  with stats as (
    select
      count(*) as total,
      jsonb_object_agg(status_counts.status, status_counts.count) as by_status,
      jsonb_object_agg(submitter_counts.submitted_by, submitter_counts.count) as by_submitter,
      jsonb_object_agg(approver_counts.approved_by, approver_counts.count) as by_approver
    from feed_archives,
    lateral (
      select status, count(*) as count
      from feed_archives
      group by status
    ) status_counts,
    lateral (
      select submitted_by, count(*) as count
      from feed_archives
      group by submitted_by
    ) submitter_counts,
    lateral (
      select approved_by, count(*) as count
      from feed_archives
      where approved_by is not null
      group by approved_by
    ) approver_counts
    group by true
  )
  select json_build_object(
    'total', total,
    'by_status', by_status,
    'by_submitter', by_submitter,
    'by_approver', by_approver
  ) into result
  from stats;

  return result;
end;
$$ language plpgsql security definer;

-- Add RLS policies
alter table feed_archives enable row level security;

create policy "Enable read access for authenticated users"
  on feed_archives for select
  using (auth.role() = 'authenticated');

create policy "Enable insert for authenticated users"
  on feed_archives for insert
  with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users"
  on feed_archives for update
  using (auth.role() = 'authenticated');
