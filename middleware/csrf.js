const crypto = require('crypto');
const { ForbiddenError } = require('../lib/errors');

// Подписанный double-submit CSRF (без внешних зависимостей).
// Токен = `${random}.${HMAC(random, SECRET)}`; хранится в читаемой cookie XSRF-TOKEN,
// клиент дублирует его в заголовке X-CSRF-Token. Cross-origin атакующий не может
// прочитать cookie, чтобы выставить заголовок → запрос отклоняется.
const SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET || 'dev_csrf_secret_change_me';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
// Bootstrap-эндпоинты аутентификации освобождены (сессии/токена ещё нет).
const EXEMPT = [/^\/api\/auth\/(login|register|refresh-token|logout|csrf-token)\/?$/];

function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('hex');
}

function makeToken() {
  const r = crypto.randomBytes(24).toString('hex');
  return `${r}.${sign(r)}`;
}

function isValid(token) {
  if (typeof token !== 'string' || !token.includes('.')) return false;
  const [r, sig] = token.split('.');
  if (!r || !sig) return false;
  const expected = sign(r);
  if (expected.length !== sig.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: false, // фронт должен прочитать токен и положить в заголовок
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    path: '/',
  };
}

// GET /api/auth/csrf-token — выдаёт токен + ставит cookie.
function issueCsrfToken(req, res) {
  const token = makeToken();
  res.cookie('XSRF-TOKEN', token, cookieOptions());
  res.json({ csrfToken: token });
}

function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (EXEMPT.some((re) => re.test(req.path))) return next();

  // Bearer-аутентифицированные запросы CSRF-безопасны: кастомный заголовок нельзя
  // выставить cross-origin без CORS-префлайта. Пропускаем (API-клиенты, тесты).
  const authz = req.headers.authorization || '';
  if (authz.startsWith('Bearer ')) return next();

  // CSRF защищает cookie-СЕССИЮ. Если её нет (нет cookie `token`) — запрос всё равно
  // будет отклонён аутентификацией (401), CSRF не нужен (публичные/анонимные роуты).
  const hasCookieSession = req.cookies && req.cookies['token'];
  if (!hasCookieSession) return next();

  const headerToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies && req.cookies['XSRF-TOKEN'];
  if (!headerToken || !cookieToken || headerToken !== cookieToken || !isValid(cookieToken)) {
    return next(new ForbiddenError('Недействительный или отсутствующий CSRF-токен'));
  }
  return next();
}

module.exports = { csrfProtection, issueCsrfToken };
