# Backend Upload Flow (Draft)

High-level sequence the API will follow when handling `POST /api/showcases`:

1. **Request validation**
   - Accept multipart form-data with fields: `title` (string), `description` (optional string), `file` (single CAD file).
   - Restrict extensions to `.stl`, `.step`, `.stp`, `.iges`, `.igs`, `.f3z`. Enforce a sensible size limit (~100 MB to start).

2. **Slug generation**
   - Derive a URL-friendly slug from the title (fallback to random id via `nanoid` when needed).
   - Ensure slug uniqueness by checking the Supabase table; append short random suffix if the slug already exists.

3. **Upload original file**
   - Keep uploads in memory (`multer` memory storage).
   - Push buffer to Supabase Storage bucket `cad-uploads` using service client. Paths will follow `uploads/{slug}/{original filename}`.

4. **Conversion pipeline**
   - If file already STL, skip conversion.
   - Otherwise write buffer to a temp directory and invoke FreeCAD CLI (`FREECAD_CMD`) with the bundled Python script.
   - On failure, retry using the CadQuery Docker image (`CADQUERY_DOCKER_IMAGE`) by mounting the same temp directory.
   - Upload resulting STL to `cad-converted` bucket at `converted/{slug}/{slug}.stl`.
   - Capture stdout/stderr for logging and bubble detailed errors back to the client when conversion fails.
   - Conversion timeout is controlled via `CAD_CONVERSION_TIMEOUT_MS` (default 180 seconds).

5. **Persist metadata**
   - Insert into `public.showcases` with slug, title, description, owner, storage paths, and visibility (`public`/`private`).
   - Insert call should handle unique constraint on slug gracefully; re-run slug collision logic as needed.

6. **Response**
   - Return `201 Created` with showcase metadata (paths are relative; frontend resolves public URLs via Supabase Storage).

## Environment variables

- `FREECAD_CMD`: Absolute path to `FreeCADCmd` (e.g. `C:\Program Files\FreeCAD 0.21\bin\FreeCADCmd.exe`). Optional, but required for direct conversion.
- `CADQUERY_DOCKER_IMAGE`: Docker image reference for CadQuery CLI fallback (e.g. `ghcr.io/cadquery/cadquery:latest`). Pull it ahead of time with `docker pull ghcr.io/cadquery/cadquery:latest`.
- `CAD_CONVERSION_TIMEOUT_MS`: Timeout applied to each conversion attempt (default 180000 ms).

If neither `FREECAD_CMD` nor `CADQUERY_DOCKER_IMAGE` is set, the API will reject non-STL uploads with a `503` status describing the missing configuration.
