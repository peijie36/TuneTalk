# Supabase Schema

Run SQL migrations inside `migrations/` with the Supabase CLI:

```
supabase migration up
```

`0001_initial.sql` provisions lobby primitives plus starter Row Level Security that limits access to members/hosts. Extend these migrations as you finalize playback persistence or skip-vote workflows.
