-- Si ya aplicaste 20260513140000 con el trigger antiguo (auth.uid() pisaba a null), ejecuta este parche.
create or replace function public.tfg_set_owner_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.user_id := coalesce(auth.uid(), new.user_id);
  end if;
  return new;
end;
$$;
