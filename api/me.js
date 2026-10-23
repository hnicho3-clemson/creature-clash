// GET /api/me: who is signed in (or null).
import { route } from '../lib/http.js';
import { currentUser, publicUser } from '../lib/session.js';

export default route(['GET'], async ({ req }) => ({ user: publicUser(await currentUser(req)) || null }));
