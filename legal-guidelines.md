# SafeNeighbor Legal Guidelines

## The Core First Amendment Argument (In Your Favor)

The strongest legal consensus is that reporting ICE locations based on public observations is constitutionally protected speech. The Supreme Court has repeatedly held that if truthful information about a matter of public significance is lawfully obtained, the government cannot punish its publication absent a compelling, overriding interest.

David Greene of the Electronic Frontier Foundation has stated that these apps are publishing constitutionally protected speech — truthful information about matters of public interest that people obtained by witnessing public events.

Seven federal circuit courts — the 1st, 3rd, 5th, 7th, 9th, 10th, and 11th — have confirmed that the First Amendment protects the right to film police and federal agents in public spaces. That's not a gray area.

---

## The Key Legal Line

Where it gets complicated is the distinction between **reporting** and **obstructing**.

A recent federal case from Los Angeles illustrates exactly where the line is: three women were indicted on felony charges after they followed an ICE agent from a public location to his home and livestreamed the pursuit with directions — the crime was the intentional transition from observing public operations to targeting the agent's private life.

The federal statute the government has been using is **18 U.S.C. § 111**, which makes it a crime to assault, resist, or impede federal officers. However, it requires proof of a "forcible act." This is important for SafeNeighbor because simply sharing location information doesn't meet that threshold.

---

## The Government's Track Record on Prosecution

Here's a really encouraging finding for app developers: criminal justice reporter C.J. Ciaramella has documented that federal prosecutions for monitoring and reporting ICE activities have fared very poorly compared to prosecutors' usual track record.

- Grand juries have refused to indict in Chicago and elsewhere
- Cases have been thrown out when evidence shows that the charged actions didn't meet the elements of the crime, which requires physically obstructing or assaulting agents
- Courts have even upheld the right to warn motorists of speed traps ahead, considering that First Amendment speech as well

---

## The Real Risk: Platform Removal, Not Prosecution

The more practical threat for SafeNeighbor isn't criminal prosecution — it's distribution.

- Apple banned crowd-sourced ICE-tracking apps from its App Store, including ICEBlock, which had risen to the top of the store
- Attorney General Pam Bondi claimed victory, saying Apple removed the app at their demand
- Facebook also complied with a Justice Department request to remove a group used by nearly 80,000 people to report ICE sightings in the Chicago area

The First Amendment only guards against government censorship, not censorship by private companies, so Apple's decision to remove an app doesn't presumptively violate the First Amendment. However, things would change if the developer could prove the government **coerced** — not merely persuaded — Apple to remove the application, which would constitute unlawful "jawboning" under a 2024 Supreme Court ruling.

---

## The Digital Surveillance Angle

There's also a growing body of scholarship around the surveillance risks to users of these apps:

- ICE is using a facial recognition app called Mobile Fortify
- Agencies have purchased systems capable of tracking phones across an entire neighborhood or block over time
- The ACLU has argued that ICE's practice of purchasing bulk cell phone location data from data brokers is questionable under Fourth Amendment law after the Supreme Court's *Carpenter v. United States* ruling, which held that the government needs a warrant to obtain cell phone location history

---

## What This Means for SafeNeighbor

From a design perspective, this legal landscape suggests a few things:

### Strong Legal Ground
You're on strong legal ground when the app facilitates sharing publicly observed, truthful information about ICE activity in public spaces. That's core First Amendment territory.

### Design Safeguards to Build In
- Disclaimers like ICEBlock used ("informational purposes only")
- Restricting reports to public locations
- Avoiding features that could be characterized as helping people "flee" or "evade" active enforcement operations

### App Store Distribution Risk
App store distribution is the biggest practical risk. Hosting as a progressive web app (like the current safeneighbor.us deployment) sidesteps Apple and Google's app store gatekeeping entirely — which is actually a strategic advantage.

### User Privacy Protection
Protect users' privacy aggressively. Given the surveillance tools available to ICE, features like these aren't just nice-to-haves — they're arguably an ethical obligation:
- Metadata stripping
- Anonymous reporting
- Minimal data retention
- No user accounts or login requirements
- Coordinate fuzzing for privacy protection

---

## Current SafeNeighbor Privacy Safeguards

The app currently implements several privacy protections:

1. **Anonymous Reporting** - No user accounts, no login required
2. **Coordinate Fuzzing** - Exact locations are randomized within a small radius
3. **Timestamp Rounding** - Times are rounded to prevent precise identification
4. **No IP Logging** - Server-side rate limiting uses hashed identifiers
5. **Minimal Data Retention** - Reports expire after 8 hours
6. **No Personal Data Collection** - No names, emails, or identifying information stored
7. **PWA Distribution** - Avoids app store gatekeeping entirely

---

## Disclaimer

This document is for informational purposes only and does not constitute legal advice. Consult with a civil rights attorney (organizations like the ACLU and EFF have been active in this space) for specific legal guidance.

---

## References

- Electronic Frontier Foundation (EFF) - First Amendment analysis
- ACLU - Immigrants' rights and surveillance concerns
- *Carpenter v. United States* - Fourth Amendment and cell phone location data
- 18 U.S.C. § 111 - Federal statute on impeding federal officers
- Circuit court rulings (1st, 3rd, 5th, 7th, 9th, 10th, 11th) on right to record
