// The one main admin. Set SUPER_ADMIN_EMAIL in .env to change it.
const MAIN = () => (process.env.SUPER_ADMIN_EMAIL || 'heetshah@gmail.com').toLowerCase().trim();

exports.mainEmail = MAIN;
// True only for the main admin's own admin account, whatever ADMIN_EMAIL says in .env.
exports.isMainAdmin = (u) => !!u && u.role === 'admin' && String(u.email || '').toLowerCase().trim() === MAIN();
