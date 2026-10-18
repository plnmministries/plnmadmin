import "server-only";
import { db, ready } from "../db";

// Tables for the mobile app (users, daily prayers, updates, prayer requests, volunteer attendance).
// Created on first use, idempotent. Shared with the admin app, which manages the same tables.

const g = globalThis as { __plnmAppSchema?: Promise<void> };

export function appReady(): Promise<void> {
  g.__plnmAppSchema ??= (async () => {
    await ready();
    const sql = db();
    await sql`create table if not exists app_users (
      id bigserial primary key,
      username text unique,                          -- lowercase, 3-20 of a-z 0-9 _ . (login is handled by the site)
      password_hash text,                            -- scrypt, hex
      password_salt text,
      email text unique,                             -- optional, only for password reset
      phone text unique,
      name text not null default '',
      photo text,
      role text not null default 'member',          -- member | volunteer | admin
      lang text not null default 'en',
      blocked boolean not null default false,
      token_version integer not null default 0,
      created_at timestamptz not null default now(),
      last_seen_at timestamptz
    )`;
    await sql`alter table app_users add column if not exists username text unique`;
    await sql`alter table app_users add column if not exists password_hash text`;
    await sql`alter table app_users add column if not exists password_salt text`;
    await sql`create table if not exists app_otps (
      id bigserial primary key,
      target text not null,                          -- email (later: phone)
      code_hash text not null,
      attempts integer not null default 0,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    )`;
    await sql`create index if not exists app_otps_target on app_otps (target, created_at desc)`;
    await sql`create table if not exists app_push_tokens (
      token text primary key,
      user_id bigint not null references app_users(id) on delete cascade,
      platform text not null default '',
      updated_at timestamptz not null default now()
    )`;
    await sql`create table if not exists app_daily_prayers (
      id bigserial primary key,
      video_id text not null unique,
      title text not null,
      for_date date not null,
      published_at timestamptz not null default now(),
      source text not null default 'auto',           -- auto (YouTube sync) | manual
      notified_at timestamptz,
      hidden boolean not null default false,
      created_at timestamptz not null default now()
    )`;
    await sql`create table if not exists app_prayer_replies (
      id bigserial primary key,
      prayer_id bigint not null references app_daily_prayers(id) on delete cascade,
      user_id bigint not null references app_users(id) on delete cascade,
      text text not null,
      created_at timestamptz not null default now()
    )`;
    await sql`create index if not exists app_prayer_replies_prayer on app_prayer_replies (prayer_id, created_at)`;
    await sql`create table if not exists app_updates (
      id bigserial primary key,
      title text not null,
      body text not null default '',
      image text,                                    -- /media/... or full URL
      link text,
      published_at timestamptz not null default now(),
      notified_at timestamptz,
      hidden boolean not null default false,
      created_at timestamptz not null default now()
    )`;
    await sql`create table if not exists app_prayer_requests (
      id bigserial primary key,
      user_id bigint not null references app_users(id) on delete cascade,
      text text not null,
      status text not null default 'new',            -- new | praying | answered
      reply text,
      replied_by bigint references app_users(id),
      replied_at timestamptz,
      reply_seen boolean not null default false,
      created_at timestamptz not null default now()
    )`;
    await sql`create index if not exists app_prayer_requests_user on app_prayer_requests (user_id, created_at desc)`;
    await sql`create table if not exists app_attendance (
      id bigserial primary key,
      user_id bigint not null references app_users(id) on delete cascade,
      check_in_at timestamptz not null default now(),
      check_out_at timestamptz,
      lat double precision,
      lng double precision,
      accuracy double precision,
      biometric boolean not null default false,
      selfie_key text,                               -- R2 key attendance/YYYY-MM-DD/{id}.jpg; the object is deleted after 15 days
      device text not null default '',
      note text not null default ''
    )`;
    // tables created before selfies moved to R2 (the bytea column never held real data)
    await sql`alter table app_attendance add column if not exists selfie_key text`;
    await sql`alter table app_attendance drop column if exists selfie`;
    await sql`create index if not exists app_attendance_user on app_attendance (user_id, check_in_at desc)`;
    await sql`create table if not exists app_volunteer_requests (
      id bigserial primary key,
      user_id bigint not null references app_users(id) on delete cascade,
      note text not null default '',
      status text not null default 'pending',        -- pending | approved | declined
      decided_by bigint references app_users(id) on delete set null,
      decided_at timestamptz,
      created_at timestamptz not null default now()
    )`;
    await sql`create table if not exists app_verses (
      id bigserial primary key,
      text text not null,
      reference text not null default '',
      created_by bigint references app_users(id) on delete set null,
      created_at timestamptz not null default now()
    )`;
    await sql`create table if not exists app_notifications (
      id bigserial primary key,
      kind text not null,                            -- daily | update | prayer-reply | custom
      ref_id bigint,
      title text not null,
      body text not null default '',
      audience text not null default 'all',          -- all | volunteers | user:<id>
      sent_count integer not null default 0,
      sent_at timestamptz not null default now()
    )`;
  })().catch((e) => {
    g.__plnmAppSchema = undefined; // retry next time
    throw e;
  });
  return g.__plnmAppSchema;
}

export type AppUser = {
  id: number;
  username: string | null;
  email: string | null;
  phone: string | null;
  name: string;
  photo: string | null;
  role: "member" | "volunteer" | "admin";
  lang: string;
  blocked: boolean;
  token_version: number;
  created_at: Date;
  last_seen_at: Date | null;
};

/** The fields the app may see about a user. */
export function publicUser(u: AppUser) {
  return { id: Number(u.id), email: u.email, phone: u.phone, name: u.name, photo: u.photo, role: u.role, lang: u.lang, createdAt: u.created_at };
}
