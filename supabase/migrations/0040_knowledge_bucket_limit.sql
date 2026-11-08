-- The app refuses knowledge files over 8 MB, but managers can also write to this bucket through the storage API
-- directly. The same limit at the bucket closes that path.
update storage.buckets set file_size_limit = 8388608 where id = 'knowledge';
