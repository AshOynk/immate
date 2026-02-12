# CNAME walkthrough: immate.oynk.co.uk → Vercel

This gets **immate.oynk.co.uk** serving your iMmate app by pointing the subdomain at Vercel.

---

## 1. Add the domain in Vercel (get the target)

1. Open [Vercel](https://vercel.com) and go to your **iMmate project** (the one that deploys the frontend).
2. **Settings** → **Domains**.
3. Click **Add** and type: **immate.oynk.co.uk**
4. Add it. Vercel will show something like:
   - **Configure:** “Add the following record to your DNS provider”
   - **Type:** CNAME  
   - **Name:** `immate` (or sometimes they show `immate.oynk.co.uk` — see step 2 below)  
   - **Value:** `cname.vercel-dns.com` (or another `*.vercel-dns.com` host — **use the value Vercel shows you**)
5. Leave this tab open or copy the **Name** and **Value** — you’ll use them in your DNS.

---

## 2. Add the CNAME in your DNS (where oynk.co.uk is managed)

Where you manage DNS for **oynk.co.uk** (e.g. Cloudflare, Namecheap, GoDaddy, 123-reg, etc.):

1. Open the **DNS** / **DNS records** / **Manage DNS** section for **oynk.co.uk**.
2. **Add a new record** (often “Add record” or “Add CNAME”).
3. Set:

   | Field   | What to enter |
   |--------|----------------|
   | **Type** | **CNAME** |
   | **Name / Host** | **immate** (just the subdomain part; some providers want `immate.oynk.co.uk` or “immate” in a dropdown for oynk.co.uk — use what your provider expects so the full name is `immate.oynk.co.uk`) |
   | **Value / Target / Points to** | **cname.vercel-dns.com** (or the exact value Vercel showed in step 1) |
   | **TTL** | Default (e.g. Auto or 3600) is fine |

4. Save the record.

**Notes:**

- **Name:** If the provider has a field that’s “subdomain only”, use **immate**. If it asks for “full hostname”, use **immate.oynk.co.uk**. The result must be that a lookup for **immate.oynk.co.uk** uses this CNAME.
- **Value:** No `https://`, no trailing dot unless your provider requires it. Just the hostname, e.g. **cname.vercel-dns.com**.

---

## 3. Wait and verify

- DNS can take a few minutes (sometimes up to 48 hours; often 5–15 minutes).
- In Vercel **Settings → Domains**, the domain **immate.oynk.co.uk** should eventually show as **Valid** (and get a certificate).
- Open **https://immate.oynk.co.uk** in your browser — you should see the iMmate app.

---

## Quick reference

| Where        | What |
|-------------|------|
| **Domain**  | immate.oynk.co.uk |
| **Record type** | CNAME |
| **Name (subdomain)** | immate |
| **Target**  | cname.vercel-dns.com (or whatever Vercel shows) |

If Vercel shows a different target (e.g. `cname-china.vercel-dns.com` or a project-specific host), use that value instead of `cname.vercel-dns.com`.
