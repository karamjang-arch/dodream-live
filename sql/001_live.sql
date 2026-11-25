-- 두드림 세미나 라이브 투표 (Jubilee-bridge 프로젝트 안, live_ 접두어로 분리)
-- 참여자(anon)는 표에 직접 접근하지 못하고, 아래 함수로만 읽고 쓴다.
-- 강사 기능은 방(room)마다 정한 PIN으로만 열린다.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.live_rooms (
  room         text primary key check (room ~ '^[a-z0-9-]{3,30}$'),
  pin_hash     text not null,
  current_poll text,
  poll_open    boolean not null default false,
  updated_at   timestamptz not null default now()
);

create table if not exists public.live_votes (
  room       text not null references public.live_rooms(room) on delete cascade,
  poll       text not null,
  voter      uuid not null,
  choices    text[] not null,
  created_at timestamptz not null default now(),
  primary key (room, poll, voter)
);

create table if not exists public.live_posts (
  id         bigserial primary key,
  room       text not null references public.live_rooms(room) on delete cascade,
  voter      uuid not null,
  kind       text not null check (kind in ('question','decision')),
  body       text not null check (char_length(body) between 1 and 400),
  status     text not null default 'pending' check (status in ('pending','approved','hidden')),
  created_at timestamptz not null default now()
);
create index if not exists live_posts_room_idx on public.live_posts(room, status, created_at);

alter table public.live_rooms enable row level security;
alter table public.live_votes enable row level security;
alter table public.live_posts enable row level security;
revoke all on public.live_rooms, public.live_votes, public.live_posts from anon, authenticated;
revoke all on sequence public.live_posts_id_seq from anon, authenticated;

-- 허용 선택지
create or replace function public.live_allowed(p_poll text)
returns text[] language sql immutable set search_path = '' as $$
  select case
    when p_poll = 'pic' then array['A','B']
    when p_poll ~ '^ox[0-9]$' then array['O','X']
    when p_poll ~ '^card[0-9]$' then array['R','G','B']
    when p_poll = 'stuck' then array['1','2','3','4','5']
    else array[]::text[] end
$$;

-- 참여자: 지금 열린 질문
create or replace function public.live_state(p_room text)
returns table(current_poll text, poll_open boolean)
language sql stable security definer set search_path = '' as $$
  select r.current_poll, r.poll_open from public.live_rooms r where r.room = p_room
$$;

-- 참여자: 투표 (다시 누르면 바뀜)
create or replace function public.live_vote(p_room text, p_poll text, p_voter uuid, p_choices text[])
returns void language plpgsql security definer set search_path = '' as $$
declare r public.live_rooms; allowed text[];
begin
  select * into r from public.live_rooms where room = p_room;
  if r.room is null or r.current_poll is distinct from p_poll or not r.poll_open then
    raise exception 'poll_closed';
  end if;
  allowed := public.live_allowed(p_poll);
  if p_choices is null or cardinality(p_choices) < 1 or cardinality(p_choices) > 3
     or not (p_choices <@ allowed)
     or (cardinality(p_choices) > 1 and p_poll !~ '^card[0-9]$') then
    raise exception 'bad_choice';
  end if;
  insert into public.live_votes(room, poll, voter, choices)
  values (p_room, p_poll, p_voter, (select array_agg(distinct c order by c) from unnest(p_choices) c))
  on conflict (room, poll, voter) do update set choices = excluded.choices, created_at = now();
end $$;

-- 누구나: 결과
create or replace function public.live_counts(p_room text, p_poll text)
returns table(choice text, n bigint, total bigint)
language sql stable security definer set search_path = '' as $$
  with v as (select choices from public.live_votes where room = p_room and poll = p_poll),
       t as (select count(*) as total from v)
  select a.c, (select count(*) from v where a.c = any(v.choices)), t.total
  from unnest(public.live_allowed(p_poll)) as a(c), t
$$;

-- 참여자: 익명 글 (질문 / 내 결정)
create or replace function public.live_post(p_room text, p_voter uuid, p_kind text, p_body text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.live_rooms where room = p_room) then raise exception 'no_room'; end if;
  if (select count(*) from public.live_posts where room = p_room and voter = p_voter) >= 6 then
    raise exception 'too_many';
  end if;
  if exists (select 1 from public.live_posts where room = p_room and voter = p_voter
             and created_at > now() - interval '15 seconds') then
    raise exception 'too_fast';
  end if;
  insert into public.live_posts(room, voter, kind, body) values (p_room, p_voter, p_kind, btrim(p_body));
end $$;

-- 누구나: 승인된 글
create or replace function public.live_approved(p_room text)
returns table(id bigint, kind text, body text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select id, kind, body, created_at from public.live_posts
  where room = p_room and status = 'approved' order by created_at
$$;

-- 강사: PIN 확인
create or replace function public.live_host_ok(p_room text, p_pin text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.live_rooms
                 where room = p_room and pin_hash = extensions.crypt(p_pin, pin_hash))
$$;

-- 강사: 질문 열기/닫기
create or replace function public.live_host_set(p_room text, p_pin text, p_poll text, p_open boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.live_host_ok(p_room, p_pin) then raise exception 'bad_pin'; end if;
  update public.live_rooms set current_poll = p_poll, poll_open = p_open, updated_at = now() where room = p_room;
end $$;

-- 강사: 글 목록 (대기 포함)
create or replace function public.live_host_posts(p_room text, p_pin text)
returns table(id bigint, kind text, body text, status text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.live_host_ok(p_room, p_pin) then raise exception 'bad_pin'; end if;
  return query select p.id, p.kind, p.body, p.status, p.created_at from public.live_posts p
    where p.room = p_room order by p.created_at desc;
end $$;

-- 강사: 승인 / 숨김
create or replace function public.live_host_moderate(p_room text, p_pin text, p_id bigint, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.live_host_ok(p_room, p_pin) then raise exception 'bad_pin'; end if;
  update public.live_posts set status = p_status where id = p_id and room = p_room;
end $$;

-- 강사: 회차 초기화 (투표와 글 지우기)
create or replace function public.live_host_reset(p_room text, p_pin text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.live_host_ok(p_room, p_pin) then raise exception 'bad_pin'; end if;
  delete from public.live_votes where room = p_room;
  delete from public.live_posts where room = p_room;
  update public.live_rooms set current_poll = null, poll_open = false where room = p_room;
end $$;

revoke all on function public.live_allowed(text), public.live_host_ok(text,text) from public, anon, authenticated;
grant execute on function
  public.live_state(text), public.live_vote(text,text,uuid,text[]), public.live_counts(text,text),
  public.live_post(text,uuid,text,text), public.live_approved(text),
  public.live_host_set(text,text,text,boolean), public.live_host_posts(text,text),
  public.live_host_moderate(text,text,bigint,text), public.live_host_reset(text,text)
to anon;
