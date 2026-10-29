// Admins are the signed-in players whose usernames are listed in the ADMIN_USERNAMES environment variable
// (comma-separated, for example "haley,ella"). Set it in Vercel's Environment Variables, or in .env.local locally.
export function adminNames() {
  return (process.env.ADMIN_USERNAMES || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}
export const isAdmin = user => !!user && adminNames().includes(String(user.username).toLowerCase());
