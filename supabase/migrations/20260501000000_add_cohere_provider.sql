-- add Cohere as a fourth value of the llm_provider enum
alter type public.llm_provider add value if not exists 'cohere';
