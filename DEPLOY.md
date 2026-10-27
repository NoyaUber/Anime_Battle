# Deploy checklist

## Fastest route: Vercel
1. Extract the ZIP on your computer.
2. Upload the folder contents to a new GitHub repository.
3. Go to https://vercel.com/new and import that repository.
4. Keep the framework preset as Next.js, then click Deploy.
5. The prototype runs without Supabase variables.

## Run locally
```bash
npm install
npm run dev
```
Then visit http://localhost:3000.

## Note
This ZIP contains a prototype with local demo saves. Supabase schema is included as a foundation, but authentication and server-side gacha/account sync are not yet connected. Do not expose Supabase service-role keys in frontend variables.


## Character images and expanded roster

The current roster is stored in `lib/characters.ts`; no extra SQL is required to display it. Image thumbnails are requested server-side through `/api/character-images` and cached for a day. If images fail, the app uses initials as a fallback. Verify that each source page matches the intended character incarnation before using the roster for competitive results. The stat values are game-balance estimates, not official VSBW ratings.
