create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  password text not null,
  "createdAt" timestamptz not null default now()
);

create table if not exists public.teams (
  id text primary key,
  access_code text unique,
  team_name text,
  proponents text not null default '[]',
  program text,
  class text,
  email text,
  contact_num text,
  adviser text,
  "createdAt" timestamptz not null default now()
);

create table if not exists public.projects (
  id text primary key,
  "teamId" text references public.teams(id) on delete cascade,
  project_title text,
  school_year text,
  description text,
  objectives text,
  status text,
  "createdAt" timestamptz not null default now()
);

create table if not exists public.defenses (
  id text primary key,
  "teamId" text references public.teams(id) on delete cascade,
  defense_type text,
  defense_date date,
  defense_time time,
  panelists text not null default '[]',
  recommendations text not null default '',
  suggestions text not null default '',
  status text,
  "createdAt" timestamptz not null default now()
);

create table if not exists public.consultations (
  id text primary key,
  "teamId" text references public.teams(id) on delete cascade,
  issues text,
  recommendations text,
  "createdAt" timestamptz not null default now()
);

create table if not exists public.panelists (
  id text primary key,
  name text,
  designation text,
  position text,
  email text,
  contact text,
  "createdAt" timestamptz not null default now()
);
