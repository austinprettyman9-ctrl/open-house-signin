# Open House QR Sign-In (Hosted-Ready Frontend)

## Run locally (Windows/Mac)
1) Install Node.js
2) In this folder:
   - `npm install`
   - `npm run dev`
3) Open the link shown (usually http://localhost:5173)

## Reuse per listing
Add a listing id in the URL:
- http://localhost:5173/?listing=1303StoneRidge
- https://your-domain.com/?listing=801MahoneyWinslow

Each listing ID stores its own:
- property settings
- agent info
- leads (NOTE: in this version, leads are stored in the browser localStorage)

## Admin access
Double-click the bottom-right corner (invisible hotspot)
Password: openhouse2026

## Documents (Flyer / MLS sheet)
Admin can paste links to PDFs in Settings.
After sign-in, visitors can open/download them.

## IMPORTANT: Hosting & Lead Storage
If you host this as-is (static hosting), leads will be stored on EACH visitor’s phone (localStorage).
That is NOT what you want for real open houses.

Recommended production setup:
- Host frontend on Vercel/Netlify
- Use a backend (Supabase or Firebase) to store leads centrally and store documents.
See instructions in the assistant guidance.
