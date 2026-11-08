-- Background sound loops for practice calls, one per place (office.mp3, car.mp3, ...). Generated from the admin
-- console with ElevenLabs sound effects and written with the service role only. Public read: the call screen plays
-- them straight from storage, and they hold nothing private.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ambience', 'ambience', true, 5242880, array['audio/mpeg'])
on conflict (id) do nothing;
