/**
 * Built-in list of bot user-agent substrings (case-insensitive).
 * Covers all major search engines, social crawlers, SEO tools, and ad bots.
 */
const BUILT_IN_BOTS: readonly string[] = [
  'googlebot',
  'bingbot',
  'slurp',
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'sogou',
  'exabot',
  'facebot',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'whatsapp',
  'telegrambot',
  'discordbot',
  'slackbot',
  'applebot',
  'pinterestbot',
  'semrushbot',
  'ahrefsbot',
  'mj12bot',
  'dotbot',
  'screaming frog',
  'gtmetrix',
  'lighthouse',
  'google-inspectiontool',
  'googlebot-image',
  'googlebot-video',
  'mediapartners-google',
  'adsbot-google',
  'apis-google',
  'google favicon',
];

/**
 * Determines whether a given user-agent string belongs to a bot or crawler.
 *
 * Performs a case-insensitive substring match against a built-in list of known
 * bots plus any user-supplied extra patterns.
 *
 * @param userAgent  - The HTTP User-Agent header value to test.
 * @param extraBots  - Optional additional bot substrings provided by the user.
 * @returns `true` if the user-agent matches any known bot pattern, `false` otherwise.
 *
 * @example
 * isBot('Mozilla/5.0 (compatible; Googlebot/2.1)'); // true
 * isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'); // false
 * isBot('my-internal-scanner', ['my-internal-scanner']); // true
 */
export function isBot(userAgent: string, extraBots?: string[]): boolean {
  if (!userAgent || typeof userAgent !== 'string') return false;

  const ua = userAgent.toLowerCase();
  const allBots = extraBots
    ? [...BUILT_IN_BOTS, ...extraBots.map((b) => b.toLowerCase())]
    : BUILT_IN_BOTS;

  for (const bot of allBots) {
    if (ua.includes(bot)) return true;
  }

  return false;
}
