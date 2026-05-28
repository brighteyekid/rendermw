import { isBot } from '../src/detect';

describe('isBot()', () => {
  // --- Built-in bots should return true ---
  const knownBots: [string, string][] = [
    ['Googlebot', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'],
    ['Bingbot', 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'],
    ['Slurp', 'Mozilla/5.0 (Slurp/1.0)'],
    ['DuckDuckBot', 'DuckDuckBot/1.0; (+http://duckduckgo.com/duckduckbot.html)'],
    ['Baiduspider', 'Baiduspider+(+http://www.baidu.com/search/spider.htm)'],
    ['YandexBot', 'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)'],
    ['Sogou', 'Sogou web spider/4.0'],
    ['Exabot', 'Mozilla/5.0 (compatible; Exabot/3.0; +http://www.exabot.com/go/robot)'],
    ['facebot', 'facebot'],
    ['facebookexternalhit', 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'],
    ['Twitterbot', 'Twitterbot/1.0'],
    ['LinkedInBot', 'LinkedInBot/1.0 (compatible; Mozilla/5.0)'],
    ['WhatsApp', 'WhatsApp/2.19.81 A'],
    ['TelegramBot', 'TelegramBot (like TwitterBot)'],
    ['Discordbot', 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)'],
    ['Slackbot', 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)'],
    ['Applebot', 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_1 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12B410 Safari/600.1.4 (Applebot/0.1)'],
    ['Pinterestbot', 'Mozilla/5.0 (compatible; Pinterestbot/1.0; +http://www.pinterest.com/bot.html)'],
    ['Semrushbot', 'Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)'],
    ['Ahrefsbot', 'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)'],
    ['Mj12bot', 'Mozilla/5.0 (compatible; MJ12bot/v1.4.8; http://mj12bot.com/)'],
    ['DotBot', 'Mozilla/5.0 (compatible; DotBot/1.2; +https://opensiteexplorer.org/dotbot)'],
    ['Screaming Frog', 'Screaming Frog SEO Spider/17.0'],
    ['GTmetrix', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) GTmetrix Chrome/108.0.5359.124 Safari/537.36'],
    ['Lighthouse', 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse'],
    ['Google-InspectionTool', 'Mozilla/5.0 (compatible; Google-InspectionTool/1.0)'],
    ['Googlebot-Image', 'Googlebot-Image/1.0'],
    ['Googlebot-Video', 'Googlebot-Video/1.0'],
    ['Mediapartners-Google', 'Mediapartners-Google'],
    ['AdsBot-Google', 'AdsBot-Google (+http://www.google.com/adsbot.html)'],
    ['APIs-Google', 'APIs-Google (+https://developers.google.com/webmasters/APIs-Google.html)'],
    ['Google Favicon', 'Mozilla/5.0 (compatible; Google Favicon)'],
  ];

  test.each(knownBots)('detects %s as a bot', (_name, ua) => {
    expect(isBot(ua)).toBe(true);
  });

  // --- Real browsers should return false ---
  const realBrowsers: [string, string][] = [
    ['Chrome Windows', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'],
    ['Firefox Linux', 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/109.0'],
    ['Safari macOS', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'],
    ['Edge Windows', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'],
    ['Chrome Android', 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.5481.77 Mobile Safari/537.36'],
    ['Safari iOS', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'],
  ];

  test.each(realBrowsers)('allows %s through', (_name, ua) => {
    expect(isBot(ua)).toBe(false);
  });

  // --- Custom extra bots ---
  it('detects a custom extra bot by substring', () => {
    expect(isBot('my-internal-health-scanner/1.0', ['my-internal-health-scanner'])).toBe(true);
  });

  it('does not match a custom bot pattern when not present', () => {
    expect(isBot('Mozilla/5.0 Chrome/120', ['my-internal-scanner'])).toBe(false);
  });

  it('custom extra bot matching is case-insensitive', () => {
    expect(isBot('MY-CUSTOM-BOT/1.0', ['my-custom-bot'])).toBe(true);
  });

  // --- Edge cases ---
  it('returns false for an empty string', () => {
    expect(isBot('')).toBe(false);
  });

  it('handles null gracefully without throwing', () => {
    // TypeScript won't allow null, but JS callers might pass it
    expect(isBot(null as unknown as string)).toBe(false);
  });

  it('handles undefined gracefully without throwing', () => {
    expect(isBot(undefined as unknown as string)).toBe(false);
  });

  it('returns false for a numeric value', () => {
    expect(isBot(42 as unknown as string)).toBe(false);
  });
});
