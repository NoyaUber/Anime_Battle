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
