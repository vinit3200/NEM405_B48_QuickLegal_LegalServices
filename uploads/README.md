# uploads/

This directory is used at runtime to store user-uploaded files and generated documents.

**Structure (recommended)**

- `avatars/`      — user profile images (small/resized)
- `documents/`    — generated PDFs and user-uploaded documents (persisted)
- `temp/`         — temporary files during upload/processing
- `thumbnails/`   — generated image previews (small)
- `processed/`    — output files after background processing (e.g., encrypted copies)

**Important**
- Do **not** commit user files to the repo. Add `uploads/` (or subfolders) to `.gitignore`.
- In production, prefer cloud storage (S3, GCS) and store only file metadata/URLs in the database.
- Implement periodic cleanup for `temp/` and optionally old files in `documents/` (e.g., older than 90 days).

**Permissions**
- Ensure your app process can read/write to this directory.
- Avoid world-writable permissions; prefer an app-specific user/group in production.

