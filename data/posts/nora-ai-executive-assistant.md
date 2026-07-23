## Project Overview

[Nora](https://nora-bennett.com/) is an email-native AI executive assistant. You forward
an email thread to your private Nora address with a short command code — `S` to
summarize, `RE` to draft a reply, `SM` to propose a meeting — or just plain English. She
reads the thread, drafts in your voice, and replies to you with a copy-ready result. You
send it. **She never sends as you.**

That one rule — drafts, you send — is the whole trust model, and it's also the hardest
part of the system to actually build, not just promise.

---

## Key Concepts

- **Two load-bearing promises, not one feature.** (1) Nora never *is* you — anything in
  your voice comes back as a draft, never sent from your address. (2) Beyond drafting,
  she can *act* — propose a meeting, share a file — but only through **propose → you
  confirm → she acts**, and always from her own transparently labeled identity ("I'm
  Nora Bennett, executive assistant, writing on his behalf"). No confirmation, no action.
- **Sender authentication is cryptographic, not a policy.** A request is only trusted
  when it lands on a registered per-person secret address *and* the DKIM-verified `From`
  matches that person's registered address — checked in code
  (`app/auth/sender.py`), not assumed from the inbox it happened to arrive in.
- **The assurance ladder — data trust is per-relationship, not per-account.** The same
  person can use light handling for their own mail and stricter handling for a specific
  client, at the same time: R1 runs on the hosted service today; R2 keeps mail inside the
  user's own Google/Microsoft tenant under a DPA; R3 is fully self-hosted with a local
  model behind the company's own walls. A message can also be marked **keep-local** and
  processed on an on-device model that never sends its content out at all.
- **An agentic layer that watches itself.** A nightly "Dreamer" and "Keeper" review the
  system's own behavior and propose changes; a draft-feedback loop learns from deleted
  drafts (if you delete instead of send, Nora stops drafting that way for that sender).
  Consequential changes are proposed for a human to merge, not applied automatically.

---

## Architecture

```
Email thread forwarded  →  per-user secret address + DKIM check (app/auth/sender.py)
                        →  command interpreter (code or plain English)
                        →  drafting (Claude / local model, per assurance-ladder rung)
                        →  reply to the user: draft, summary, or analysis
                        →  [optional] propose an action (meeting, file share)
                        →  user confirms  →  Nora acts, from her own labeled identity
```

Deployed today as a real, running service (not just a demo): FastAPI on a Mac Mini and
Cloudflare, Gmail/Microsoft Graph mailbox providers, Postmark/Resend/SMTP send paths, and
a metrics pipeline tracking draft-acceptance rate in production.

---

## The part that's actually hard

Everyone can promise "the AI won't impersonate you." Making it structurally true is a
different problem. Nora's send path only ever originates from her own address, gated
behind an explicit user confirmation — there is no code path where a draft becomes an
outbound email without that confirmation happening first. The DKIM check on the way in
is the same idea applied to trust in the other direction: a command is only honored if
it's cryptographically provable that the registered person sent it, not just that it
showed up at the right address.

That pairing — provable identity in, provable non-impersonation out — is what makes
"she drafts, you send" a guarantee instead of a feature description.

---

## Takeaway

Nora is in active use today, not just demoed: real threads, real drafts, a real
draft-acceptance metric being tracked in production. The interesting engineering isn't
the LLM call in the middle — it's everything wrapped around it that makes an AI
assistant something a CEO can actually hand real correspondence to: cryptographic sender
verification, a consent gate with no bypass, and a data-trust ladder that lets the same
assistant handle a casual email and a sensitive client thread with genuinely different
guarantees.

Full documentation, including the assurance ladder and how sender verification works,
is at [docs.nora-bennett.com](https://docs.nora-bennett.com).
