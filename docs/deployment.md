# Deployment Notes

This repository is configured for local development. Use the steps below as a starting point for deploying the backend (Fly.io) and frontend (Vercel). Adjust to match your hosting preferences.

## Backend (Fly.io)

1. Install the Fly CLI and log in:
   ```bash
   scoop install flyctl # or download from https://fly.io/docs/hands-on/install-flyctl/
   fly auth login
   ```
2. From `backend/`, create the Fly app:
   ```bash
   fly launch --no-deploy --name cad-showcase-api
   ```
   - Accept Dockerfile detection (provided below).
   - Choose a region close to your audience.
3. Review `backend/Dockerfile` (add it if missing) and ensure FreeCAD/CadQuery dependencies are available in the image. If you rely on Docker-in-Docker for CadQuery fallback, consider dedicated conversion workers instead.
4. Set environment variables on Fly:
   ```bash
   fly secrets set \
     NODE_ENV=production \
     SUPABASE_URL=... \
     SUPABASE_ANON_KEY=... \
     SUPABASE_SERVICE_ROLE_KEY=... \
     SUPABASE_STORAGE_BUCKET_UPLOADS=cad-uploads \
     SUPABASE_STORAGE_BUCKET_CONVERTED=cad-converted \
     FREECAD_CMD=/usr/local/bin/FreeCADCmd \
     CADQUERY_DOCKER_IMAGE=ghcr.io/cadquery/cadquery:latest
   ```
   Adjust paths/values to match your deployment target. If FreeCAD is not installed inside the container, mount it or ship a custom image.
5. Deploy:
   ```bash
   fly deploy
   ```
6. Monitor logs:
   ```bash
   fly logs
   ```

### Example Dockerfile

```dockerfile
FROM node:20-bullseye
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
CMD ["node", "dist/server.js"]
```
Customize the image to include FreeCAD (`apt-get install freecadcmd`) or other conversion dependencies.

## Frontend (Vercel)

1. From `frontend/`, run `npm run build` to ensure the production build succeeds.
2. Create a Vercel project and link the `frontend/` folder.
3. Set environment variables in Vercel:
   - `VITE_API_BASE_URL` – public URL of your backend (Fly app).
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_BUCKET_UPLOADS`
   - `VITE_SUPABASE_BUCKET_CONVERTED`
   - `VITE_SUPABASE_REDIRECT_URL` – production frontend domain (e.g., `https://cad-showcase.vercel.app`).
4. Configure Supabase Google OAuth redirect URLs to include the production frontend domain.
5. Deploy via Vercel dashboard or CLI:
   ```bash
   vercel --prod
   ```

## Supabase

- Update **Authentication → URL Configuration** with both local (`http://localhost:5173`) and production callback URLs.
- Ensure storage buckets (`cad-uploads`, `cad-converted`) are public if you rely on direct public URLs. Alternatively, switch to signed URLs and adjust the backend to generate them on demand.
- Monitor the showcases table and storage usage for growth; consider adding cleanup jobs or object lifecycle rules.

## Future Enhancements

- Separate conversion workers (queue + background jobs) for heavy CAD processing.
- Auto-generate signed download URLs instead of exposing public buckets.
- Add analytics or view counters on showcase pages.
- Add custom domains and SEO metadata for published showcases.
