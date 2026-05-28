# Security Policy

## Supported Versions

| Version | Supported |
|:---|:---:|
| 0.1.x (latest) | ✅ |

Only the latest published version receives security fixes. We recommend always running the latest version.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in rendermw, please report it responsibly:

1. **Open a private GitHub Security Advisory** at:
   `https://github.com/brighteyekid/rendermw/security/advisories/new`

2. **Or email the maintainer directly.** You can find contact details on the [GitHub profile](https://github.com/brighteyekid).

Please include as much of the following as possible:

- A description of the vulnerability and its potential impact
- The version(s) of rendermw affected
- Steps to reproduce the issue (proof-of-concept code is welcome)
- Any suggested mitigations or fixes

You will receive a response within **72 hours** acknowledging the report. If the issue is confirmed, we will:

- Work with you to understand the full scope
- Develop and test a fix
- Publish a patched release
- Credit you in the release notes (unless you prefer to remain anonymous)

## Security Design Notes

rendermw is designed with a minimal attack surface:

### Zero runtime dependencies

rendermw has no production npm dependencies. There is no supply-chain risk from transitive packages. The only peer dependency is `express`, which you already control.

### No code execution from user input

The `render()` function is defined entirely by you, the developer. rendermw never evaluates, parses, or executes strings from incoming HTTP requests. The only data from the request that rendermw touches is:

- `req.headers['user-agent']` — substring matched against a fixed list
- `req.path` — split on `/` and matched positionally against your route patterns
- `req.query` — passed as-is to your `render()` function

None of these are eval'd, passed to `new Function()`, or used to construct filesystem paths.

### HTML injection

The `html` field in `RenderPayload` is inserted directly into the document body **without escaping**. This is intentional — you are providing the HTML. If you include user-generated content in `payload.html`, you are responsible for sanitizing it before passing it to rendermw.

### Caching

The cache stores rendered HTML strings in a plain `Map`. Cache keys are derived from `req.path + JSON.stringify(req.query)`. No user-supplied content is used to construct keys in a way that could cause cache poisoning beyond what Express itself already allows.

### Bot detection

The `isBot()` function performs read-only substring matching. It has no side effects, makes no network calls, and cannot be exploited to bypass security controls — it is purely advisory. If an attacker spoofs a bot user-agent to receive pre-rendered HTML, the consequence is that they receive the same content a real bot would receive, which is already public.

## Scope

The following are **in scope** for security reports:

- Cache poisoning via crafted HTTP requests
- Information disclosure via response headers or HTML output
- Denial-of-service via crafted inputs to `isBot()`, `matchPath()`, or `buildShell()`
- ReDoS (Regular Expression Denial of Service) — note: rendermw uses no regex, but report anyway if found
- Prototype pollution via `req.query` or `req.params`

The following are **out of scope**:

- Vulnerabilities in Express itself (report to the Express project)
- Security issues in your own `render()` function
- HTML injection caused by passing unsanitized user content into `payload.html`
- Bot detection bypass (this is not a security boundary — bots and users intentionally receive different responses)
