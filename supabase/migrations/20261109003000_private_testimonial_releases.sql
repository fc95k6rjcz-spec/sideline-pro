create table public.testimonial_releases (
 id uuid primary key,
 full_name text not null check (length(full_name) between 2 and 150),
 date_of_birth date not null,
 role text not null default '' check(length(role)<=150),
 signature text not null check(length(signature) between 2 and 150),
 release_version text not null,
 release_text text not null,
 signed_at timestamptz not null default now(),
 recorded_by uuid not null,
 withdrawn_at timestamptz,
 withdrawn_by uuid,
 constraint withdrawal_pair check ((withdrawn_at is null) = (withdrawn_by is null))
);
alter table public.testimonial_releases enable row level security;
revoke all on public.testimonial_releases from public, anon, authenticated;
grant select, insert on public.testimonial_releases to service_role;
revoke update, delete on public.testimonial_releases from service_role;
grant update (withdrawn_at, withdrawn_by) on public.testimonial_releases to service_role;
comment on table public.testimonial_releases is 'Private adult testimonial consent. Server-only admin access. No public policies; signing terms immutable to application role.';
