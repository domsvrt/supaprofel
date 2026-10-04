# Supabase setup

The teaching repository needs the database table, private Storage bucket, and row-level security policies defined in:

`migrations/202609220001_create_module_repository.sql`

If the first migration was already applied, also run:

`migrations/202609220002_allow_module_announcements.sql`

To apply it without a local Supabase CLI:

1. Open the Supabase dashboard for this project.
2. Select **SQL Editor** and create a new query.
3. Paste each unapplied migration file in filename order and select **Run**.
4. Confirm that **Table Editor** contains `modules` and **Storage** contains the private `module-resources` bucket.

The migration is safe to rerun for the expected fresh project setup. It recreates the named policies and updates the existing bucket's privacy and file-size settings.
