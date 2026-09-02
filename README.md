# IndexCheck — Check Which URLs Are Visible on Google

> **A professional, 100% free, API-free web application to check which URLs from your website sitemap or bulk URL list are publicly observable in Google search results.**

---

## 🚨 Absolute API-Free Architecture

**IndexCheck does NOT use:**
- Google Search Console API
- Google URL Inspection API
- Google OAuth
- SerpAPI, DataForSEO, Ahrefs, Semrush, Moz APIs
- Paid proxies or CAPTCHA bypass networks
- Third-party indexing services

**The application works 100% without API keys, accounts, or paid infrastructure.**

---

## 🌟 Key Features

1. **Website Index Checker**:
   - Validates target domain and performs SSRF security checks.
   - Inspects `/robots.txt` for `Sitemap:` directives and crawling permissions.
   - Probes and discovers standard sitemaps (`/sitemap.xml`, `/sitemap_index.xml`, `/sitemap-index.xml`, `/wp-sitemap.xml`).
   - Automatically unpacks multi-level Sitemap Indexes (e.g. `sitemap-posts.xml`, `sitemap-pages.xml`) and `.xml.gz` archives.
   - Extracts, normalizes, and deduplicates URLs.
   - Checks public Google search observability per URL via controlled queueing.
   - Calculates the **Google Observable Index Rate**.

2. **Bulk URL Checker**:
   - Paste custom lists of URLs (one per line).
   - Real-time pre-validation: instantly reports valid URLs, duplicate count, and invalid lines.
   - Controlled concurrent scanning with cancel and retry support.

3. **Technical SEO Audits**:
   - HTTP Status Code verification (200, 301/302 redirects, 404/500 errors).
   - Canonical Link tag analysis (Self-referencing, Divergent, or Missing).
   - Meta Robots & `X-Robots-Tag` detection (`noindex`, `nofollow`).
   - Robots.txt Googlebot permissions.

4. **Rich Results Dashboard**:
   - Metric summary cards (Total URLs, Google Observable, Not Observable, Unknown, Observable Rate).
   - Interactive SVG Visibility Donut Chart.
   - Filter by status (`All`, `Observable`, `Not Observable`, `Unknown`, `Errors`).
   - Filter by HTTP response code and sitemap source.
   - Search across URLs, Canonical URLs, and sitemap filenames.
   - URL Detail Modal with actionable manual GSC recommendations.

5. **Instant Index Request Hub (100% Free)**:
   - **IndexNow Protocol**: 1-click notification to Microsoft Bing, Yandex, Seznam, and Naver with zero setup.
   - **Google Indexing API**: Automated direct push to Googlebot using your free Google Cloud Service Account (200 URLs/day free).
   - **1-Click GSC Inspection Links**: Direct deep links to Google Search Console URL inspection without needing any API keys.
   - Secure local storage of credentials with built-in 2-minute visual setup guide in Bengali & English.

6. **Instant Export & Copy**:
   - Download RFC 4180 CSV report.
   - One-click Copy Found URLs, Copy Not Found URLs, Copy All URLs.

7. **Interactive Demo Mode**:
   - 1-click test with complete realistic dataset for `example.com` (500 sitemap URLs, 342 Found, 158 Not Found, 68.4% Observable Rate).
   - Clearly labeled with `DEMO DATA` banner to avoid mixing with real scans.

---

## 📖 Result Terminology & Disclaimer

> [!IMPORTANT]
> **Mandatory Disclaimer**: Google search results are not exhaustive. A URL marked **"Not Observable"** is not proof that Google has not indexed it.

- **Google Observable**: The URL was observed in Google's public search results.
- **Not Observable**: The URL was not observed in the checked public search result.
- **Unknown**: The check could not be reliably completed (e.g., rate limits or network timeout).
- **Google Observable Index Rate**: Percentage of checked sitemap URLs observable in public search (`Found / Total * 100`).

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router) + React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom SaaS tokens and dark/light themes
- **Icons**: [Lucide React](https://lucide.dev/)
- **XML Parsing**: `fast-xml-parser` with native `zlib` decompression

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ (Node 20+ recommended)
- npm or pnpm

### 2. Installation
```bash
# Clone repository
git clone https://github.com/your-org/indexcheck.git
cd indexcheck

# Install dependencies
npm install
```

### 3. Running Locally
```bash
# Start development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Running Tests
```bash
npm test
```

### 5. Production Build
```bash
npm run build
npm start
```

---

## 🔒 Security & SSRF Protection

IndexCheck includes enterprise-grade server-side request protection:
- Restricts protocols strictly to `http:` and `https:`.
- Rejects loopback (`127.0.0.1`, `localhost`), internal IPv4 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local (`169.254.0.0/16`), and AWS/GCP metadata endpoints (`169.254.169.254`).
- DNS verification before network requests to prevent DNS rebinding attacks.
- Response payload size caps (max 15MB) and strict request timeouts.

---

## 🛡️ Privacy Policy

- All URL and sitemap checks are processed **ephemerally in memory**.
- Zero database storage of user queries or URLs.
- No user tracking, analytics cookies, or account sign-ups.

---

## 📄 License

MIT License — Free to use, deploy, and distribute.
