-- IS Riadenie odboru v0.48.1
-- ServiceDesk Ticket Workflow & Handover
-- Adds server-side notifications when a ticket is moved to another resolver group.
-- No existing ServiceDesk data is deleted or rewritten.

begin;

do $preflight$
begin
  if to_regclass('public.service_tickets') is null
     or to_regclass('public.service_queues') is null
     or to_regclass('public.profiles') is null
     or to_regprocedure('public.service_enqueue_notification(uuid,uuid,text,uuid,text,text,text,text,text,text,boolean)') is null then
    raise exception 'ServiceDesk v0.48.1 vyzaduje nasadene ServiceDesk migracie v0.45+.';
  end if;
end;
$preflight$;

create or replace function public.service_ticket_handover_notifications_v0481()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_queue public.service_queues%rowtype;
  v_profile record;
  v_requester_email text:=lower(coalesce(new.requester_email,''));
  v_stamp text:=extract(epoch from coalesce(new.updated_at,now()))::bigint::text;
begin
  if new.queue_id is not distinct from old.queue_id then return new; end if;

  if new.queue_id is null then
    perform public.service_enqueue_notification(
      new.organization_id,new.id,new.code,null,v_requester_email,
      'queue_changed','info','Zmena riešiteľskej skupiny · '||new.code,
      'Ticket momentálne nie je zaradený do riešiteľskej skupiny.',
      'handover:requester:'||new.id::text||':'||v_stamp,false
    );
    return new;
  end if;

  select * into v_queue from public.service_queues q
  where q.id=new.queue_id and q.organization_id=new.organization_id;
  if v_queue.id is null then return new; end if;

  perform public.service_enqueue_notification(
    new.organization_id,new.id,new.code,null,v_requester_email,
    'queue_changed','info','Ticket '||new.code||' bol presunutý',
    'Nová riešiteľská skupina: '||v_queue.name||'.',
    'handover:requester:'||new.id::text||':'||new.queue_id::text||':'||v_stamp,
    coalesce(v_queue.email_notifications,true)
  );

  for v_profile in
    select distinct p.id,p.email
    from public.profiles p
    where p.organization_id=new.organization_id and p.is_active=true
      and exists(
        select 1 from jsonb_array_elements_text(coalesce(v_queue.members,'[]'::jsonb)) m(value)
        where lower(m.value)=lower(p.full_name) or lower(m.value)=lower(p.email)
      )
  loop
    perform public.service_enqueue_notification(
      new.organization_id,new.id,new.code,v_profile.id,v_profile.email,
      'queue_handover',case when new.priority in ('Kritická','Vysoká') then 'warning' else 'info' end,
      'Presunutý ticket do fronty '||v_queue.name,
      new.code||' · '||new.title,
      'handover:queue:'||new.id::text||':'||new.queue_id::text||':'||v_profile.id::text||':'||v_stamp,
      coalesce(v_queue.email_notifications,true)
    );
  end loop;

  if trim(coalesce(v_queue.email,''))<>'' then
    perform public.service_enqueue_notification(
      new.organization_id,new.id,new.code,null,v_queue.email,
      'queue_handover',case when new.priority in ('Kritická','Vysoká') then 'warning' else 'info' end,
      'Presunutý ticket do fronty '||v_queue.name,
      new.code||' · '||new.title,
      'handover:queue-mailbox:'||new.id::text||':'||new.queue_id::text||':'||v_stamp,
      coalesce(v_queue.email_notifications,true)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists service_ticket_handover_notifications_v0481 on public.service_tickets;
create trigger service_ticket_handover_notifications_v0481
after update of queue_id on public.service_tickets
for each row
when (old.queue_id is distinct from new.queue_id)
execute function public.service_ticket_handover_notifications_v0481();

revoke all on function public.service_ticket_handover_notifications_v0481() from public;

notify pgrst, 'reload schema';
commit;

select
  to_regprocedure('public.service_ticket_handover_notifications_v0481()') is not null as handover_notification_function_ready,
  exists(
    select 1 from pg_trigger
    where tgname='service_ticket_handover_notifications_v0481'
      and not tgisinternal
  ) as handover_notification_trigger_ready;
