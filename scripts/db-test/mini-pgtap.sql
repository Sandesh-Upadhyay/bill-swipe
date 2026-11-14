-- =============================================================================
-- LOCAL TEST SHIM ONLY: a tiny subset of pgTAP for PGlite (which doesn't ship pgTAP).
--
-- Implements the functions BillSwipe's tests use, with pgTAP's output format, so the same
-- supabase/tests/database/*.test.sql files run here and under `supabase test db`:
--   plan(int), ok(bool, text), is(anyelement, anyelement, text), isnt(...),
--   throws_ok(sql, errcode, errmsg, description), lives_ok(sql, description), finish()
-- Test SQL runs as the current role (e.g. authenticated); only result numbering is
-- SECURITY DEFINER so it works after a role switch.
-- =============================================================================

create sequence extensions._tap_seq;
create table extensions._tap_state (id int primary key default 1, planned int, failed int not null default 0);
insert into extensions._tap_state (planned) values (null);

create function extensions._tap_emit(p_ok boolean, p_description text, p_diag text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  n bigint := nextval('extensions._tap_seq');
  line text;
begin
  if not coalesce(p_ok, false) then
    update extensions._tap_state set failed = failed + 1 where id = 1;
  end if;
  line := case when coalesce(p_ok, false) then 'ok ' else 'not ok ' end || n || coalesce(' - ' || p_description, '');
  if not coalesce(p_ok, false) and p_diag is not null then
    line := line || E'\n# ' || replace(p_diag, E'\n', E'\n# ');
  end if;
  return line;
end;
$$;

create function extensions.plan(p_count int)
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform setval('extensions._tap_seq', 1, false);
  update extensions._tap_state set planned = p_count, failed = 0 where id = 1;
  return next '1..' || p_count;
end;
$$;

create function extensions.ok(p_ok boolean, p_description text default null)
returns text
language sql
as $$ select extensions._tap_emit(p_ok, p_description); $$;

create function extensions.is(p_have anyelement, p_want anyelement, p_description text default null)
returns text
language sql
as $$
  select extensions._tap_emit(
    p_have is not distinct from p_want,
    p_description,
    format('have: %s  want: %s', coalesce(p_have::text, 'NULL'), coalesce(p_want::text, 'NULL'))
  );
$$;

create function extensions.isnt(p_have anyelement, p_want anyelement, p_description text default null)
returns text
language sql
as $$
  select extensions._tap_emit(p_have is distinct from p_want, p_description, format('both: %s', coalesce(p_have::text, 'NULL')));
$$;

-- Runs p_sql as the CURRENT role and passes if it raises the expected SQLSTATE
-- (and, when p_errmsg is not null, exactly that message).
create function extensions.throws_ok(p_sql text, p_errcode text, p_errmsg text, p_description text)
returns text
language plpgsql
as $$
begin
  execute p_sql;
  return extensions._tap_emit(false, p_description, format('expected error %s, but the statement succeeded', coalesce(p_errcode, '(any)')));
exception when others then
  if (p_errcode is null or sqlstate = p_errcode) and (p_errmsg is null or sqlerrm = p_errmsg) then
    return extensions._tap_emit(true, p_description);
  end if;
  return extensions._tap_emit(false, p_description, format('expected %s %s, got %s: %s', coalesce(p_errcode, ''), coalesce(p_errmsg, ''), sqlstate, sqlerrm));
end;
$$;

create function extensions.lives_ok(p_sql text, p_description text default null)
returns text
language plpgsql
as $$
begin
  execute p_sql;
  return extensions._tap_emit(true, p_description);
exception when others then
  return extensions._tap_emit(false, p_description, format('died: %s %s', sqlstate, sqlerrm));
end;
$$;

create function extensions.finish()
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
declare
  s extensions._tap_state%rowtype;
  ran bigint;
begin
  select * into s from extensions._tap_state where id = 1;
  select last_value - case when is_called then 0 else 1 end into ran from extensions._tap_seq;
  if s.planned is not null and ran <> s.planned then
    return next format('# Looks like you planned %s tests but ran %s', s.planned, ran);
  end if;
  if s.failed > 0 then
    return next format('# Looks like you failed %s test(s) of %s', s.failed, ran);
  end if;
end;
$$;

grant usage on sequence extensions._tap_seq to public;
grant execute on all functions in schema extensions to public;
