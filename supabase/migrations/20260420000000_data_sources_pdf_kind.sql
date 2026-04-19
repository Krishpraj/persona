-- Add 'pdf' as a valid data_sources.kind. PDFs are stored as a binary in the
-- project-data-assets bucket; extracted text + metadata live in data jsonb so
-- the project-knowledge MCP can search across them like it searches docs.

alter table public.data_sources
  drop constraint if exists data_sources_kind_check;

alter table public.data_sources
  add constraint data_sources_kind_check
  check (kind in ('doc', 'nodegraph', 'csv', 'pdf'));
