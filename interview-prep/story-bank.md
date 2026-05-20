# Story Bank — Master STAR+R Stories

This file accumulates your best interview stories over time. Each evaluation (Block F) adds new stories here. Instead of memorizing 100 answers, maintain 5-10 deep stories that you can bend to answer almost any behavioral question.

## How it works

1. Every time `/career-ops oferta` generates Block F (Interview Plan), new STAR+R stories get appended here
2. Before your next interview, review this file — your stories are already organized by theme
3. The "Big Three" questions can be answered with stories from this bank:
   - "Tell me about yourself" → combine 2-3 stories into a narrative
   - "Tell me about your most impactful project" → pick your highest-impact story
   - "Tell me about a conflict you resolved" → find a story with a Reflection

## Stories

### [Data / SQL] Oracle SQL and payments data paths
**Source:** Report #008 — CareCone Group — SQL Developer  
**S (Situation):** Enterprise banking web stack moving toward microservices with strict regression expectations on money movement flows.  
**T (Task):** Keep transactional integrity while evolving services and persistence (Spring/Hibernate/JPA layer plus Oracle-side SQL procedures).  
**A (Action):** Partnered across API and data changes; leaned on disciplined unit testing and phased rollout discipline for payment-related surfaces.  
**R (Result):** Delivered stable payment flows aligned to compliance-minded engineering (specific client metrics confidential).  
**Reflection:** I would document baseline query plans earlier and align index changes with observability dashboards before peaks.  
**Best for questions about:** stored procedures; SQL discipline; regulated data; collaborating with application teams  

### [Operational] Narrowing prod issues between app and data tier
**Source:** Report #008 — CareCone Group — SQL Developer  
**S (Situation):** Operations signals (logs/monitoring) suggesting user-facing slowdown or intermittent errors during higher load.  
**T (Task):** Triage whether root cause sits in application code, integration, or relational data access patterns.  
**A (Action):** Used Splunk / CloudWatch style signals alongside code and SQL review to isolate failures; coordinated fixes with whoever owned the defective layer.  
**R (Result):** Restored predictable behavior for the impacted workflow (cite real KPIs only when you have them).  
**Reflection:** Invest earlier in tracing from browser/API down to DB to shorten MTTR next time.  
**Best for questions about:** production support; troubleshooting; cross-team incidents  

### [IoT / Messaging] MQTT telemetry and device control
**Source:** Report #009 — m-View — Full Stack Web Developer  
**S (Situation):** Academic IoT project requiring devices to report state and accept commands over a lightweight protocol.  
**T (Task):** Prove reliable device-side control and telemetry path suitable for extension into larger systems.  
**A (Action):** Implemented MQTT-based messaging between controller and devices using Arduino-side constraints.  
**R (Result):** Working controller with telemetry path suitable to discuss alongside enterprise messaging patterns truthfully.  
**Reflection:** For production I would add authentication, backpressure strategy, and structured observability from day one.  
**Best for questions about:** MQTT; IoT; event-style integrations; learning real-time systems  

### [Full stack / Real-time] WebSockets for live UI updates
**Source:** Report #009 — m-View — Full Stack Web Developer  
**S (Situation):** Enterprise web surfaces needed near-live updates rather than full page refresh.  
**T (Task):** Keep users current on changing operational data without sacrificing stability.  
**A (Action):** Used WebSockets alongside REST/SOAP services in a regulated delivery context.  
**R (Result):** Improved responsiveness for monitored workflows (cite specifics only when accurate).  
**Reflection:** Pair transport choice with clear reconnect/auth semantics and monitoring.  
**Best for questions about:** SignalR adjacency; real-time UX; operational readiness  

### [Python / AI] LangChain and LLM workflow contributions
**Source:** Report #010 — Evolution Australia — Python Developer  
**S (Situation):** Generative-AI tooling was moving fast; you needed a repeatable way to experiment without abandoning production habits.  
**T (Task):** Build familiarity with **LangChain**-style workflows and related LLM integration patterns while keeping changes testable and reviewable.  
**A (Action):** Contributed to and built around LLM workflows in the **Python** ecosystem; paired API integration work with the same discipline used on enterprise web stacks.  
**R (Result):** Credible foothold for **AI-backed** product conversations — cite **public repos/PRs** when you have them; otherwise keep claims scoped to what is verifiable.  
**Reflection:** I would publish a tiny reference service (FastAPI + tests + eval notes) earlier so Python depth is legible to hiring managers.  
**Best for questions about:** Python + AI; LangChain; moving experiments toward production hygiene  

### [Career strategy] Honest stack positioning under a Python-first title
**Source:** Report #010 — Evolution Australia — Python Developer  
**S (Situation):** Role title emphasizes **Python** while your deepest shipped work is **React/Node/Java**.  
**T (Task):** Avoid overstating while still showing relevant adjacent strength.  
**A (Action):** Lead with **shipping discipline**, **integrations**, and **LangChain/Python tooling**; name ramp plan and what you would prove in week one.  
**R (Result):** Interviews that proceed are based on truth — fewer wasted panels.  
**Reflection:** Ask “what % is ML training vs Python services?” on the first recruiter screen.  
**Best for questions about:** Why this role; language gaps; how you ramp  

### [DevOps-adjacent] CI/CD hygiene under Jenkins/Maven/Git in regulated delivery
**Source:** Report #011 — HCLTech Australia — DevOps Engineer  
**S (Situation):** Enterprise banking surfaces needed repeatable builds and safer iterations without sacrificing regression discipline on money-movement flows.  
**T (Task):** Keep releases predictable while teams iterated across Spring/MVC/Hibernate and adjacent services layers.  
**A (Action):** Used Jenkins/Maven/Git pipelines alongside unit-testing discipline emphasized on GPOW-style flows; coordinated deployment sequencing across prod/non-prod expectations.  
**R (Result):** Demonstrable ownership of **continuous integration discipline** even when JD toolchain differs (**Azure DevOps** vs Jenkins).  
**Reflection:** Map Jenkins-era habits explicitly to **pipeline-as-code**, approvals, and artifact promotion vocabulary recruiters expect for DevOps panels.  
**Best for questions about:** CI/CD maturity without overstating Azure DevOps tenure  

### [Observability] Splunk-aligned diagnostics vs purely application-layer debugging
**Source:** Report #011 — HCLTech Australia — DevOps Engineer  
**S (Situation):** Operators needed signals beyond printf debugging when enterprise flows degraded under integration load.  
**T (Task):** Narrow whether failures stemmed from integration, persistence, or operational configuration issues.  
**A (Action):** Leveraged Splunk alongside engineering inspection patterns learned shipping Wells Fargo-context GPOW modules and adjacent stacks.  
**R (Result):** Faster convergence on corrective actions where logs/metrics pointed to subsystem ownership boundaries.  
**Reflection:** Pair Splunk narratives with **RCA documentation** habits — aligns with JD maintenance expectations.  
**Best for questions about:** monitoring; observability maturity; incident collaboration  

### [Quality / AI] Classic test discipline as bridge to probabilistic AI
**Source:** Report #012 — CloudMarc — AI Assurance / AI Testing Specialist  
**S (Situation):** Enterprise-facing delivery demanded regression confidence while leadership explored faster GenAI-assisted workflows.  
**T (Task):** Keep shipping velocity without letting ambiguous model behaviour leak into critical paths.  
**A (Action):** Reinforced layered automated testing on deterministic surfaces (APIs/UI contracts) alongside experimental LLM features in clearly bounded prototypes.  
**R (Result):** Stable foundations for iterative AI experiments—tie to real KPIs only when validated.  
**Reflection:** Earlier I’d wire explicit eval checkpoints (datasets + thresholds) before any GenAI touches customer-visible flows.  
**Best for questions about:** probabilistic testing; marrying automation culture to LLMs; pragmatic guardrails  

### [Stakeholder consulting] Freight between business goals and risky tech bets
**Source:** Report #012 — CloudMarc — AI Assurance / AI Testing Specialist  
**S (Situation):** Stakeholders wanted “AI acceleration” buzz while engineering needed clarity on blast radius if models misbehaved.  
**T (Task):** Communicate feasible assurance posture without stonewalling innovation.  
**A (Action):** Framed phased rollout tiers + monitoring hooks analogous to Splunk/CW-era triage mindset on prior stacks.  
**R (Result):** Alignment narratives that protect trust while enabling pilots (keep claims scoped to verified experience).  
**Reflection:** Produce one-page RACI-style risk ledger earlier in discovery.  
**Best for questions about:** stakeholder management; advisory tone; runway for AI pilots  

### [Health tech / integrations] Secure health communication portal delivery
**Source:** Report #012 — Change Recruitment — Full Stack Engineer (`reports/012-change-recruitment-full-stack-2026-05-03.md`)  
**S (Situation):** A health-adjacent client needed a web path to exchange sensitive information without treating “security” as an afterthought.  
**T (Task):** Ship an MVC-style portal with **encrypted REST** communication to remote systems.  
**A (Action):** Upwork-era full-stack delivery using Spring Boot + React patterns, TypeScript upgrades, and disciplined testing habits.  
**R (Result):** Working secure portal suitable to discuss alongside **care-sector platforms** and compliance-minded engineering.  
**Reflection:** Today I would lead with explicit **threat modeling + audit trail** language earlier in the build.  
**Best for questions about:** regulated data; why health/care missions; integration security  

### [Stack honesty] Positioning Java/Node strength against a Python/Django-first JD
**Source:** Report #012 — Change Recruitment — Full Stack Engineer (`reports/012-change-recruitment-full-stack-2026-05-03.md`)  
**S (Situation):** A role centers **Django/REST** while your heaviest shipped services are **Java/Spring** and **Node**.  
**T (Task):** Pass HM credibility without keyword inflation.  
**A (Action):** Separate “**I ship APIs, schemas, tests, and integrations**” from “**I have X years of Django**” — cite **real Python** usage in **AI tooling** and spell a **30/60-day ramp** (DRF, ORM, perf basics).  
**R (Result):** Panels that advance do so on truth; you waste less time on mismatched loops.  
**Reflection:** Ask “what % is CRUD + integrations vs ML research?” on the first recruiter call.  
**Best for questions about:** language gaps; backend depth; why you still fit  

### [Consulting delivery] Banking-grade velocity across polyglot stacks
**Source:** Report #013 — Infosys Consulting — Advanced Software Engineering Lead  
**S (Situation):** Enterprise banking and travel commerce programs demanded rapid iteration across React/SPA surfaces while JVM-backed services owned transactional integrity.  
**T (Task):** Ship customer-visible flows without weakening regression discipline on money-movement adjacency.  
**A (Action):** Applied layered automated testing and incremental service boundaries (microservices decomposition narrative from CV) while coordinating API contracts across Node/Spring contexts where applicable.  
**R (Result):** Stable releases on regulated-adjacent journeys — cite quantified SLAs only when verified with the employer.  
**Reflection:** For consulting interviews I would prepare one migration-themed appendix even when my deepest proof is integration + decomposition, so principal-grade screens feel anchored.  
**Best for questions about:** polyglot execution; regulated delivery; pragmatic architecture trade-offs  

### [Advisory tone] Making technical debt legible without sounding dismissive
**Source:** Report #013 — Infosys Consulting — Advanced Software Engineering Lead  
**S (Situation):** Stakeholders mixed modernization ambition with ongoing revenue-critical releases.  
**T (Task):** Prioritize remediation paths that fit incremental funding cycles.  
**A (Action):** Mapped highest-risk coupling points first (payments/integrations), paired Splunk/CloudWatch-style triage habits with concrete backlog slices.  
**R (Result):** Narrative recruiters can follow — tie to verified outcomes only.  
**Reflection:** Earlier socialization with explicit RACI reduces thrash when contexts switch — relevant to multi-engagement consulting models.  
**Best for questions about:** executive-ready communication; technical debt; consulting multitasking  

### [Java / React] Spring-era full stack on regulated web workflows
**Source:** Report #014 — Kaizen Global Technologies — Senior Full Stack Developer  
**S (Situation):** Enterprise banking and large-scale web stacks needed maintainable **Spring/Hibernate/JPA** services alongside modern **React** SPAs.  
**T (Task):** Ship features without regressions on sensitive workflows while keeping UX responsive and integration-heavy surfaces stable.  
**A (Action):** Used **React + Redux** patterns where listed; paired **REST/SOAP** integrations with disciplined unit testing called out on payments-adjacent work.  
**R (Result):** Credible **Java/Spring + React** narrative for panels that scan for production breadth — cite **only** client-approved metrics.  
**Reflection:** I would keep a one-page diagram of service boundaries ready for **Kafka** conversations even when my deepest proof is synchronous APIs + ops visibility.  
**Best for questions about:** Spring Boot overlap; React seniority; regulated delivery pace  

### [Messaging bridge] From MQTT telemetry to event-driven vocabulary
**Source:** Report #014 — Kaizen Global Technologies — Senior Full Stack Developer  
**S (Situation):** JD emphasizes **Apache Kafka** while your explicit résumé line is **MQTT** IoT coursework/project depth.  
**T (Task):** Show systems thinking on **pub/sub** without claiming Kafka SRE tenure you do not have.  
**A (Action):** Describe **producer/consumer mental model**, delivery semantics at a textbook level, and where you would add **monitoring + replay** first in a new service.  
**R (Result):** Honest positioning that passes senior sniff tests better than keyword stuffing.  
**Reflection:** Build a tiny **local Kafka lab** (docker-compose + tests) before interviews if this stack stays in your target set.  
**Best for questions about:** Kafka screening questions; learning plans; IoT vs enterprise messaging  

### [Career narrative] Addressing “10+ years” without inflating tenure
**Source:** Report #014 — Kaizen Global Technologies — Senior Full Stack Developer  
**S (Situation):** Posting states **10+ years**; CV headline emphasizes **4+ years** in the summary band with earlier roles back to **2017**.  
**T (Task):** Avoid dishonest stretching while still showing **depth-per-year**.  
**A (Action):** Prepare a concise chronology; emphasize **ownership** (freelance: architecture through testing) and **banking-grade** proof points.  
**R (Result):** Recruiters can evaluate flexibility early instead of wasting loops.  
**Reflection:** Ask recruiters directly whether **10+** is automated or negotiable — saves everyone time.  
**Best for questions about:** total experience; seniority calibration; consulting gates  

### [ML pivot] Production discipline vs PyTorch training-at-scale gap
**Source:** Report #015 — UCentric — Software Engineer (Model Training)  
**S (Situation):** Posting emphasizes **large-scale training**: clusters, checkpointing, experiment tracking, and **PyTorch/JAX**-class stacks while your résumé centers **React/Node/Java** shipping with **LangChain**-adjacent Python.  
**T (Task):** Pass senior engineering bar on **reliability and systems thinking** without claiming GPU training tenure you cannot defend.  
**A (Action):** Lead with **regulated delivery**, **long-run debugging**, and **microservice decomposition**; pair with **honest ramp** (course/side project) if pursuing the role.  
**R (Result):** Recruiters can route you correctly — IC training infra vs broader SWE expectations.  
**Reflection:** Before applying, ship one **small public** training/pipeline artifact so the panel has something concrete to probe.  
**Best for questions about:** Why ML infra; how you’ll ramp on PyTorch; translating OSS LLM work to training loops  

### [Agency screen] Undisclosed client + portfolio/GitHub ask
**Source:** Report #015 — UCentric — Software Engineer (Model Training)  
**S (Situation):** Listing is via **UCentric** for an **undisclosed** Melbourne venture and explicitly requests **GitHub / portfolio** links.  
**T (Task):** Decide whether to invest time before **employer**, **comp**, and **team shape** are known.  
**A (Action):** Ask early for **domain**, **reporting line**, **on-call**, and **salary band**; only then tailor depth prep.  
**R (Result):** Avoids deep take-home investment for mismatched constraints.  
**Reflection:** Treat “exclusive partner” language as neutral — verify facts in the first recruiter call.  
**Best for questions about:** Why this company; diligence process; what you need to say yes  

### [Research / Public-impact] Framing regulated web systems for stakeholder trust
**Source:** Report #016 — University of Melbourne — Software Engineer (Trakka / MDHS)  
**S (Situation):** Complex multi-stakeholder systems (banking/health-adjacent delivery) where correctness, clarity, and auditability matter as much as feature velocity.  
**T (Task):** Ship user-facing workflows and integrations without creating security or operational surprises for experts who are not engineers.  
**A (Action):** Pair accessible UI work with disciplined testing and pragmatic documentation; align API/data assumptions early with operators and domain owners.  
**R (Result):** Sustainable delivery narrative suitable for **public-health tooling** interviews (avoid fabricating genomics specifics).  
**Reflection:** For science-heavy teams I would front-load **visual prototypes** and **data contracts** so specialists can critique early.  
**Best for questions about:** mission-driven engineering; documentation; collaborating with researchers; privacy-minded delivery  

### [Architecture] Polyglot services — Java/Spring and Node in one program
**Source:** Report #017 — iVEGA GROUP PTY LTD — Software Engineer  
**S (Situation):** Enterprise programs often keep core banking or long-lived services on **Java/Spring** while using **Node/Express** for adjacent APIs or integration surfaces.  
**T (Task):** Ship integrated experiences without letting stack boundaries fragment releases, observability, or contracts.  
**A (Action):** Delivered **Spring MVC/Hibernate/JPA** services alongside **Node/Express** APIs and disciplined integration testing where those stacks met.  
**R (Result):** A coherent delivery narrative for **microservices-style** evolution without claiming uniform “everything in one framework.”  
**Reflection:** I would standardize **trace/correlation IDs** and **logging shape** across JVM and Node paths earlier to shorten MTTR.  
**Best for questions about:** microservices; polyglot teams; API boundaries; integration risk  

### [E‑commerce / Web UX] Cruise booking surfaces — performance, devices, commerce journeys
**Source:** Report #018 — Salon Tech Co Pty Ltd — eCommerce Developer (Shopify)  
**S (Situation):** Travel commerce required **responsive** booking experiences across devices with **payments-adjacent** flows and a lot of moving UI surfaces.  
**T (Task):** Keep customer journeys reliable while iterating on **high-traffic** pages and integrated modules.  
**A (Action):** Delivered **React**-era SPAs and integrations with disciplined **testing** and **ops visibility** habits called out on the résumé.  
**R (Result):** Credible narrative for **conversion-minded** front-end work — do **not** claim Shopify/Liquid metrics you cannot verify.  
**Reflection:** If targeting **Shopify**, I would ship **one public** theme customization or app integration write-up so panels can probe **Liquid** depth honestly.  
**Best for questions about:** high-traffic UI; cross-browser reliability; booking/commerce parallels to PDP/checkout thinking  

### [AI / Engineering velocity] AI-assisted development on real codebases
**Source:** Report #065 — Sleek — Principal Full Stack Engineer (AI Systems)
**S (Situation):** Shipping full-stack work across multiple client domains with tight iteration cycles.
**T (Task):** Increase delivery speed without sacrificing test discipline or security on regulated flows.
**A (Action):** Used **Cursor-style AI-assisted development** on codebase-aware tasks — feature scaffolding, refactors, test generation, documentation — with human review gates.
**R (Result):** Faster iteration on real repositories (career-ops and client work) while keeping CI/testing habits intact.
**Reflection:** For Principal scope I would codify **prompt workflows and review checklists** so the whole team gains velocity, not just individual practice.
**Best for questions about:** Cursor/AI-assisted dev; force multiplier; engineering productivity; AI-first mindset

### [Fintech / Principal scope] GPOW as regulated platform reliability story
**Source:** Report #065 — Sleek — Principal Full Stack Engineer (AI Systems)
**S (Situation):** Global wire payments program in a highly regulated banking context with strict regression expectations.
**T (Task):** Deliver secure, accessible payment flows with strong test coverage across React/Node/Spring stack.
**A (Action):** Applied **TDD**, microservices decomposition, REST/SOAP integration, and ops visibility (CloudWatch/Splunk) on payment surfaces.
**R (Result):** Stable wire/bank-to-bank/group payment modules with high unit-test coverage (cite only what you can defend in interview).
**Reflection:** Same reliability discipline applies to **LLM document workflows** — eval gates before production, not ship-and-hope.
**Best for questions about:** fintech; Principal architecture; regulated SaaS; bridging to AI guardrails

### [Consulting / AI] LangChain OSS as honest LLM integration baseline
**Source:** Report #069 — V2 AI — Full Stack AI Principal Engineer
**S (Situation):** Enterprise clients expect production AI features while internal teams lack repeatable LLM integration patterns.
**T (Task):** Demonstrate credible LLM workflow literacy without overstating a production LLMOps platform you have not operated.
**A (Action):** Maintained sustained LangChain open-source work since 2021; paired with Master of Applied AI training to design pragmatic chains and integration approaches in JS/TS stacks.
**R (Result):** Credible integrator narrative for consult screens — must be paired with a concrete 90-day eval/prompt-versioning plan for client engagements.
**Reflection:** Before Principal consult interviews, ship one small public demo with eval metrics (latency, failure rate) so "integrator" becomes "measured delivery."
**Best for questions about:** LLMs; LangChain; RAG honesty; AI consultancy; production readiness gaps

### [Leveling] Freelance architecture ownership vs Principal title
**Source:** Report #069 — V2 AI — Full Stack AI Principal Engineer
**S (Situation):** Job title asks for Principal Leadership across multiple teams while CV headline reads Senior full stack.
**T (Task):** Position Staff-ready scope without claiming Principal LLMOps ownership you cannot defend.
**A (Action):** Lead with freelance end-to-end ownership (architecture, tests, security, performance) and GPOW regulated delivery; ask recruiter if a Senior/Lead AI engineer lane exists with Principal-path review.
**R (Result):** Filters mismatched pipelines early — saves both sides time on Principal-only screens.
**Reflection:** Update CV years line to ~8 years and add one explicit "led technical direction for client X" bullet before targeting Principal consult roles.
**Best for questions about:** career level; Principal vs Senior; consulting; scope negotiation

### [CI/CD] Jenkins/Maven release discipline on regulated banking flows
**Source:** Report #070 — Hastha Solutions — DevOps Engineer (Contract, Sydney)
**S (Situation):** Large banking web estate (CMB / GPOW context) with high regression expectations on payment-related releases.
**T (Task):** Keep build and deployment paths predictable while evolving toward microservices.
**A (Action):** Used Jenkins/Maven CI, Tomcat deployments, and strong unit-test discipline on payment modules; coordinated with ops signals (CloudWatch/Splunk).
**R (Result):** Stable release cadence on wire/payment surfaces (cite client metrics only when you have them).
**Reflection:** I'd migrate pipeline definitions to YAML in Git and add IaC (Bicep/Terraform) before calling myself a DevOps specialist on Azure.
**Best for questions about:** CI/CD; release automation; regulated environments; why you're not a pure DevOps hire yet

### [Platform / APIs] Node payment APIs under banking-grade test discipline
**Source:** Report #075 — Speechify — Software Engineer, Platform (Brisbane)
**S (Situation):** Enterprise banking web stack with wire/payment modules and pressure to keep money-movement reliable while APIs evolved.
**T (Task):** Deliver and maintain Node/Express and related services with regression expectations comparable to subscription/consumption systems.
**A (Action):** Emphasized disciplined unit testing, phased changes, and ops signals (CloudWatch/Splunk) when triaging issues across API and data layers.
**R (Result):** Shipped stable payment-related surfaces with credible engineering rigor (add client metrics only when you have them).
**Reflection:** For a TTS/subscription platform I would instrument consumption and error budgets from day one, not only after incidents.
**Best for questions about:** Node.js; payment APIs; reliability; why platform backend; regulated delivery

### [AI product] LangChain / LLM tooling adjacent to audio-AI products
**Source:** Report #075 — Speechify — Software Engineer, Platform (Brisbane)
**S (Situation):** Growing interest in production-minded LLM workflows while primarily delivering full-stack web systems.
**T (Task):** Build credible open-source footprint in generative AI without overstating audio pipeline expertise.
**A (Action):** Sustained LangChain-related contributions and pragmatic JS/TS integration patterns since 2021.
**R (Result):** Demonstrable AI tooling literacy that maps to Speechify’s AI/audio mission (cite repos/metrics when verified).
**Reflection:** I'd add explicit latency/cost/eval dashboards to mirror how I'd treat a public TTS API SLA.
**Best for questions about:** AI interest; why Speechify; learning agility; not an audio engineer

### [SRE / observability] Splunk-backed production triage on regulated payment systems
**Source:** Report #097 — Airlock Digital — Site Reliability Engineer
**S (Situation):** Banking web estate (CMB / GPOW) with live payment and wire flows where outages had high business impact.
**T (Task):** Restore service quickly and prevent repeat failures without claiming dedicated SRE or on-call tenure.
**A (Action):** Used Splunk alongside CloudWatch-style signals, code review, and SQL investigation to isolate failing layers; paired with Jenkins/Maven release discipline and TDD on payment modules.
**R (Result):** Kept payment surfaces stable under production pressure (add client metrics only when verified).
**Reflection:** I'd formalize SLOs, error budgets, and post-mortem templates before interviewing for SSRE roles; add Zabbix/Ansible lab work to match Airlock stack honestly.
**Best for questions about:** Splunk; incident response; RCA; observability; why not a 5-year SRE title yet

### [AI consult] LangChain OSS as honest LLM integrator (not Copilot rollout lead)
**Source:** Report #077 — TL Consulting Group — Senior AI Engineer (GitHub Copilot & AI Engineering)
**S (Situation):** Enterprise clients adopting Microsoft/GitHub AI stacks while you primarily ship full-stack web systems.
**T (Task):** Demonstrate credible LLM workflow literacy without claiming Azure AI Foundry or enterprise Copilot programs you have not run.
**A (Action):** Sustained LangChain-related open-source work since 2021; Master of Applied AI (Deakin); pragmatic JS/TS integration patterns.
**R (Result):** Credible **integrator** narrative for PoC/MVP cycles (add repo metrics only when verified).
**Reflection:** Before a consult screen, ship one small **RAG PoC with eval gates** so the story is not only coursework/OSS.
**Best for questions about:** LLM integration; RAG; why AI consult; learning agility; GitHub Copilot gap

### [Consulting delivery] Freelance multi-client architecture-to-ship
**Source:** Report #077 — TL Consulting Group — Senior AI Engineer (GitHub Copilot & AI Engineering)
**S (Situation):** Multiple freelance clients with different domains and delivery pressure.
**T (Task):** Own architecture, implementation, testing, security, and performance end-to-end per engagement.
**A (Action):** Scoped work in phases; kept test discipline; negotiated scope when clients pushed risky shortcuts.
**R (Result):** Delivered production web/mobile solutions across domains (cite specific client outcomes when allowed).
**Reflection:** Document **workshop-style discovery** artifacts (1-pager, demo script) to mirror consultancy PoC selling.
**Best for questions about:** consulting; PoC/MVP velocity; client communication; stakeholder management

### [Web products] High-volume consumer booking platforms (cruise industry)
**Source:** Report #076 — Mathspace — Senior Software Engineer (Backend)
**S (Situation):** Cruise brands needed web products handling bookings, itineraries, live location, payments, and onboard modules for travelers.
**T (Task):** Deliver reliable, interactive consumer web experiences with backend APIs supporting real-time and transactional flows.
**A (Action):** Built React front ends with Express REST APIs and Spring MVC/Hibernate services; AJAX-driven UX for high-traffic booking paths.
**R (Result):** Shipped multi-module platforms for Holland America and Seabourn-class programs (add traffic metrics only when verified).
**Reflection:** For EdTech I'd instrument learner-facing latency and error budgets the same way we treated payment-adjacent flows.
**Best for questions about:** web products at scale; consumer UX; backend APIs; why EdTech; cross-functional product work

### [Quality / UX] Accessible, quality-first delivery on regulated web UIs
**Source:** Report #076 — Mathspace — Senior Software Engineer (Backend)
**S (Situation):** Professional and banking web surfaces required inclusive UX and high correctness expectations.
**T (Task):** Ship interfaces that meet accessibility standards while maintaining release velocity.
**A (Action):** Applied ADA-style testing mindset (NVDA/JAWS familiarity); paired accessibility work with disciplined automated testing on critical flows.
**R (Result):** Delivered accessible HTML5/React interfaces meeting web standards in enterprise contexts.
**Reflection:** Mathspace's emphasis on delightful learner/teacher UX maps directly — I'd involve teachers in acceptance criteria early.
**Best for questions about:** quality; design and UX enthusiasm; accessibility; user-centric decisions

### [Stack pivot] Honest Python depth vs Java/Node production backends
**Source:** Report #076 — Mathspace — Senior Software Engineer (Backend)
**S (Situation):** Target role requires Python/Django/GraphQL while production history is primarily Java/Spring and Node/Express.
**T (Task):** Position senior engineering credibility without inventing Django production tenure.
**A (Action):** Lead with GPOW TDD and API/integration depth; cite Python from Master of Applied AI and scripting; commit to Django/GraphQL portfolio before screens.
**R (Result):** Filters mismatched pipelines early — saves time on stack-specific backend roles.
**Reflection:** Build a small Django + GraphQL side project with tests before applying to Python-primary backends.
**Best for questions about:** Python gap; Django; GraphQL; learning agility; why this role

### [CI/CD] Jenkins/Maven release train on regulated Java estate
**Source:** Report #080 — Dedalus — DevOps Engineer (Healthcare solutions)
**S (Situation):** Large banking web estate under release pressure while payment surfaces required predictable regression coverage.
**T (Task):** Keep wire-payment module releases stable through Jenkins/Maven CI and Tomcat deployments.
**A (Action):** Ran Jenkins/Maven pipelines with TDD discipline on GPOW-related flows; coordinated Tomcat releases and Splunk/CloudWatch triage when integrations degraded.
**R (Result):** Stable releases on payment modules (no invented throughput metrics — qualitative reliability on regulated surfaces).
**Reflection:** I would store pipeline definitions in Git as code from the first sprint rather than UI-only Jenkins config.
**Best for questions about:** CI/CD; Jenkins; Maven; release engineering; regulated environments

### [Healthcare-adjacent] Secure health communication portal delivery
**Source:** Report #080 — Dedalus — DevOps Engineer (Healthcare solutions)
**S (Situation):** Client needed a secure health communication portal with encrypted REST integration to remote services.
**T (Task):** Deliver MVC portal with encryption, accessible UI patterns, and reliable deployment path.
**A (Action):** Built Spring Boot/React stack with encrypted REST communication; Git/Jenkins CI and Jest/JUnit automated testing under Agile/JIRA cadence.
**R (Result):** Shipped portal meeting client security and accessibility expectations (qualitative — no fabricated user counts).
**Reflection:** EMR-specific stacks (WildFly/Citrix) would need employer training — I would map my regulated UI discipline honestly rather than overclaim infra depth.
**Best for questions about:** healthcare-adjacent delivery; security; why healthcare DevOps; honest gap framing

### [FDE / Platform adoption] Freelance technical discovery and phased delivery
**Source:** Report #089 — GitLab — Staff Forward Deployed Engineer
**S (Situation):** Freelance clients across domains needed production software under varying technical maturity and constraints.
**T (Task):** Assess feasibility, define architecture, and ship without over-promising on timelines or stack depth.
**A (Action):** Led discovery conversations, scoped phased delivery with test/security gates, and owned implementation through CI-friendly releases.
**R (Result):** Delivered end-to-end solutions across multiple domains (qualitative — cite specific client outcomes only when verified).
**Reflection:** Forward Deployed work needs reusable discovery checklists — I would document platform-readiness templates after each engagement.
**Best for questions about:** customer-facing engineering; discovery; consulting adjacency; ambiguous requirements

### [Agentic / honest AI] LangChain OSS with Applied AI foundation
**Source:** Report #089 — GitLab — Staff Forward Deployed Engineer
**S (Situation):** Enterprise roles increasingly expect LLM/agent platform literacy beyond traditional full-stack delivery.
**T (Task):** Build credible AI workflow skills without claiming production Duo/LLMOps platform ownership.
**A (Action):** Sustained LangChain OSS contributions since 2021; paired with Master of Applied AI (Deakin) for structured ML/AI fundamentals.
**R (Result):** Demonstrable integrator-level LLM workflow experience — not yet Staff-level agent platform operator.
**Reflection:** Before FDE screens, ship a bounded agent POC with eval gates and failure-mode documentation.
**Best for questions about:** LLMs; agentic patterns; honest AI gap; LangChain; learning plan

### [CI/CD honesty] Jenkins/Maven discipline vs GitLab CI gap
**Source:** Report #089 — GitLab — Staff Forward Deployed Engineer
**S (Situation):** Target role requires GitLab CI/CD, runners, and YAML pipeline design at Staff depth.
**T (Task):** Position release-engineering credibility without inventing GitLab tenure.
**A (Action):** Cite Jenkins/Maven CI on CMB GPOW program with TDD gates; commit to public GitLab CI lab (multi-stage pipeline, security scan) before apply.
**R (Result):** Filters mismatched Staff FDE pipelines early when GitLab-specific proof is absent.
**Reflection:** Platform FDE roles screen on the vendor stack — lab work beats generic CI claims.
**Best for questions about:** CI/CD; GitLab gap; Jenkins; honest stack pivot; platform engineering

### [Consultancy / FDE] Freelance multi-client delivery under ambiguity
**Source:** Report #087 — Mantel — Senior Software Engineer (Python/React)
**S (Situation):** Freelance clients across banking, health, and e-commerce needed production software with shifting requirements and tight timelines.
**T (Task):** Own architecture through release for each engagement without a permanent product team buffer.
**A (Action):** Ran discovery, scoped APIs and React UIs, paired with stakeholders on trade-offs, and shipped with automated testing and CI discipline.
**R (Result):** Repeat client delivery across domains (cite verified outcomes only).
**Reflection:** Consultancy needs reusable discovery templates — I would document stack-assessment checklists after each client handoff.
**Best for questions about:** client-facing work; ambiguity; why consultancy; context switching; pair programming

### [Agentic / AI-assisted dev] LangChain workflows with human code review
**Source:** Report #087 — Mantel — Senior Software Engineer (Python/React)
**S (Situation):** Mantel expects AI-assisted development (Claude/Cline) and structured agentic workflows with architectural oversight.
**T (Task):** Demonstrate integrator-level AI workflow literacy without claiming Mantel AI Gateway production ownership.
**A (Action):** Sustained LangChain OSS since 2021; uses setup-plan-act style workflow chaining; reviews AI-generated code for security, tests, and architecture before merge.
**R (Result):** Credible narrative for AI-first consultancy — honest about ramp on internal gateway tooling.
**Reflection:** Before screen, document one agentic dev session with before/after review notes to show governance mindset.
**Best for questions about:** AI-assisted coding; agentic workflows; AI code security; human oversight; LangChain

### [Stack pivot] React-primary engineer with Python in Applied AI stack
**Source:** Report #087 — Mantel — Senior Software Engineer (Python/React)
**S (Situation):** Role requires Python and React; JD accepts React specialist with solid Python experience.
**T (Task):** Position senior credibility without inventing multi-year production Python tenure.
**A (Action):** Lead React/TypeScript/API depth (CMB, Upwork); cite Python from Master of Applied AI and LangChain ecosystem; commit to Python API side project if probed.
**R (Result):** Filters pure Python-backend mismatches while staying honest on primary stack.
**Reflection:** Ship one small FastAPI or Django service with tests before Mantel technical round.
**Best for questions about:** Python gap; dual-stack; learning agility; why this role

### [Adoption / POC] Freelance technical proof points without vendor product tenure
**Source:** Report #093 — IBM — IT Automation Customer Success Engineer
**S (Situation):** Enterprise vendor CSE role expects IBM automation stack (Instana, Turbonomic, Cloud Pak for AIOps) and certified product demos.
**T (Task):** Position honest delivery strength (POCs, workshops, roadmaps) without claiming IBM product ownership.
**A (Action):** Lead with freelance phased MVPs, GPOW regulated delivery, and Splunk/CloudWatch ops triage; state LangChain + Applied AI for GenAI adjacency only.
**R (Result):** Filters misaligned applications early — avoids screen failure on missing IBM certs.
**Reflection:** Before any vendor CSE track, complete one **OpenShift + observability lab** and one **IBM automation cert** with public README.
**Best for questions about:** customer success engineering; technical adoption; POC delivery; honest stack gaps; watsonx vs LangChain

<!-- Stories will be added here as you evaluate offers -->
<!-- Format:
### [Theme] Story Title
**Source:** Report #NNN — Company — Role
**S (Situation):** ...
**T (Task):** ...
**A (Action):** ...
**R (Result):** ...
**Reflection:** What I learned / what I'd do differently
**Best for questions about:** [list of question types this story answers]
-->
