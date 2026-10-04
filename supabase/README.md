# Supabase setup

The teaching repository needs the database table, private Storage bucket, and row-level security policies defined in:

`migrations/202609220001_create_module_repository.sql`

If the first migration was already applied, also run:

`migrations/202609220002_allow_module_announcements.sql`

Before releasing student registration, run:

`migrations/20261004163030_create_app_config.sql`

Then run:

`migrations/20261004220838_student_access.sql`

The first migration records the sole owner of existing posts as the teacher.
If there are no posts, it uses the only existing Supabase Auth user. With
multiple users and no posts, identify the teacher before the second migration.
The second migration changes database and private Storage policies so new
accounts can only read the teacher's posts and attached resources. It also
removes older policies with different capitalization that could allow students
to write.

If the repository is empty and multiple Auth users already exist, identify the
teacher's user ID in **Authentication → Users**. After the first migration,
insert `(true, '<teacher user ID>')` into `app_config` using the SQL Editor,
then run the second migration. Do not choose a student's ID: this record grants
all teacher write permissions.

To apply it without a local Supabase CLI:

1. Open the Supabase dashboard for this project.
2. Select **SQL Editor** and create a new query.
3. Paste each unapplied migration file in filename order and select **Run**.
4. Confirm that **Table Editor** contains `modules` and `app_config`, that
   `app_config` has exactly one teacher ID, and that **Storage** contains the
   private `module-resources` bucket.
5. In **Authentication**, enable email and password sign-up. If email
   confirmation is enabled, students confirm the message sent by Supabase and
   then return to the app to sign in.

## Confirmation email redirects

The app sends `emailRedirectTo` with sign-up and resend requests. In the
Supabase dashboard, open **Authentication → URL Configuration** and add
`supaprofel://sign-in` to **Redirect URLs**. Replace the default
`http://localhost:3000` **Site URL** with the same app link for a mobile-only
deployment, or with your actual hosted web URL if you publish the web app.
If you customized the confirmation email template, keep Supabase's
`{{ .ConfirmationURL }}` link. A link built from `{{ .SiteURL }}` can ignore the
redirect requested by the app.

The custom `supaprofel` scheme requires a new development or production build
after changing `app.json`. Expo Go uses a temporary `exp://.../--/sign-in`
address; add that running development address to Supabase's Redirect URLs when
testing in Expo Go. A development build provides a stable app link. Existing
emails still contain the old redirect; use **Resend confirmation email** on the
sign-in screen after updating the dashboard settings.

The first migration is safe to rerun for the expected fresh project setup. It
recreates its named policies and updates the bucket's privacy and file-size
settings. Do not rerun it after the student access migration, because it would
restore the old owner-only policies until the student migration is rerun.
