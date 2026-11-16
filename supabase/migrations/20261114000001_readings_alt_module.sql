-- Hỗ trợ ngành có số bài/phần khác 12 (ngành gọn) + bài đọc phụ (data.alt)
alter table public.readings add column if not exists module_id int;

create or replace function public.get_reading(p_major text, p_lesson int, p_track text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare d jsonb; m int;
begin
  if p_track not in ('en','ja') then raise exception 'invalid track'; end if;
  select r.data, coalesce(r.module_id, (p_lesson - 1) / 12 + 1) into d, m
    from public.readings r where r.major = p_major and r.lesson = p_lesson;
  if d is null then
    m := (p_lesson - 1) / 12 + 1;
  end if;
  if not public.is_free_module(m) and not public.has_access(p_track, p_major) then
    raise exception 'LOCKED' using errcode = '42501';
  end if;
  if d is null then return null; end if;
  return jsonb_build_object(
    'lesson', p_lesson,
    'title', d -> ('title_' || p_track), 'title_vi', d -> 'title_vi',
    'text',  d -> ('text_'  || p_track), 'text_vi',  d -> 'text_vi',
    'used',  d -> 'used',
    'questions', d -> ('q_' || p_track),
    'qa', d -> ('qa_' || p_track),
    'alt', (select coalesce(jsonb_agg(jsonb_build_object(
              'title', a -> ('title_' || p_track), 'title_vi', a -> 'title_vi',
              'text', a -> ('text_' || p_track), 'text_vi', a -> 'text_vi',
              'used', a -> 'used', 'questions', a -> ('q_' || p_track))), '[]'::jsonb)
            from jsonb_array_elements(coalesce(d -> 'alt', '[]'::jsonb)) a));
end $$;
grant execute on function public.get_reading(text, int, text) to anon, authenticated;
