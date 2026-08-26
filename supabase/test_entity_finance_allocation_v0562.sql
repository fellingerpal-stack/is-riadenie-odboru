-- Read-only diagnostika v0.56.2 Entity Financial Allocation
select
  to_regclass('public.entity_financial_allocations') is not null as entity_finance_table_ready,
  to_regprocedure('public.entity_finance_allocation_read()') is not null as entity_finance_read_ready,
  to_regprocedure('public.entity_finance_allocation_upsert(jsonb)') is not null as entity_finance_write_ready,
  to_regprocedure('public.entity_finance_allocation_delete(text)') is not null as entity_finance_delete_ready,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='entity_financial_allocations' and column_name='allocated_amount') as entity_finance_amount_ready;

select entity_id,module_code,task_code,count(*) as zaznamy,round(sum(allocated_amount),2) as alokovane
from public.entity_financial_allocations
group by entity_id,module_code,task_code
order by entity_id,module_code,task_code;
