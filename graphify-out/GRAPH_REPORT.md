# Graph Report - Liara  (2026-08-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 997 nodes · 1985 edges · 87 communities (50 shown, 37 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.61)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6429916e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 53
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73

## God Nodes (most connected - your core abstractions)
1. `cn()` - 44 edges
2. `delay()` - 23 edges
3. `createLiaControllerPlan()` - 22 edges
4. `handler()` - 19 edges
5. `Button` - 18 edges
6. `prisma` - 17 edges
7. `scripts` - 17 edges
8. `requireAdmin()` - 16 edges
9. `Button()` - 15 edges
10. `asciicast()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `sourceMetadata()` --indirect_call--> `toPublicDocumentationHit()`  [INFERRED]
  src/pages/api/chat.js → src/lib/docs-search.js
- `DialogOverlay` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/dialog.jsx → src/lib/utils.js
- `main()` --calls--> `hashPassword()`  [EXTRACTED]
  prisma/seed.mjs → src/lib/auth-core.mjs
- `main()` --calls--> `isValidEmail()`  [EXTRACTED]
  prisma/seed.mjs → src/lib/auth-core.mjs
- `main()` --calls--> `normalizeEmail()`  [EXTRACTED]
  prisma/seed.mjs → src/lib/auth-core.mjs

## Import Cycles
- None detected.

## Communities (87 total, 37 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (60): grouped, http, next, port, start(), { WebSocketServer }, requireAdmin(), ADMIN_SETTINGS_ID (+52 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (29): Alert(), Button(), Card(), PlatformIcon(), types, PageActionButtons(), Section(), Header() (+21 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (25): base64_decode(), batchFrames(), _classCallCheck(), classList$1(), compose(), Context(), Core(), _createClass() (+17 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (31): BASE_URL, __dirname, crawlAi(), DATA, MODELS, crawlDbaas(), DATA, DATABASES (+23 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (9): adminMarkdownComponents, Boolean(), csvEscape(), downloadFile(), exportRows(), iconMap, MessagesPage(), toneClasses (+1 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (39): cleanMarkdown(), docsUrl(), DOCUMENTATION_ROOTS, documentationDomainBoost(), documentationMetadata(), expandQuery(), findFiles(), formatDocumentationSources() (+31 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (33): postChat(), postMessages(), ChatComposer(), handleFiles(), handleKeyDown(), startVoiceMeter(), stopVoiceMeter(), submit() (+25 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (35): documentationQueryTokens(), AI_UNAVAILABLE_MESSAGE, allUserText(), buildClarification(), CLARIFICATION_MESSAGE, clarificationQuestions(), createLiaControllerPlan(), detectedService() (+27 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (33): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, postcss, tailwindcss, @types/node (+25 more)

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (24): main(), prisma, AdminShell(), clearSessionCookie(), hashPassword(), isValidEmail(), normalizeEmail(), scryptAsync (+16 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (25): ADMIN_TOPICS, topicFor(), getAiConfig(), isAiConfigured(), rewriteAdminAnswer(), safeFallback(), allowedDomains(), DEFAULT_ALLOWED_DOMAINS (+17 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (29): children(), cleanNode(), createComputation(), createEffect(), createMemo(), createRenderEffect(), createRoot(), createSignal() (+21 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (25): asciicast(), load(), pause(), resume(), runFrame(), scheduleNextFrame(), _seek(), async() (+17 more)

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (15): initialForm, ScreenshotSourceDialog(), sources, Dialog, DialogClose, DialogContent, DialogDescription(), DialogHeader() (+7 more)

### Community 14 - "Community 14"
Cohesion: 0.05
Nodes (40): dateLabel(), EscalationsPage(), ChatActions(), handleSpeechClick(), speakMessage(), stopSpeech(), updateSpeechStatus(), waitForAudio() (+32 more)

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (13): appendNodes(), cleanChildren(), create(), create$1(), createComponent(), _defineProperty(), insert(), insertExpression() (+5 more)

### Community 16 - "Community 16"
Cohesion: 0.18
Nodes (10): author, description, license, main, name, scripts, start, test (+2 more)

### Community 17 - "Community 17"
Cohesion: 0.24
Nodes (11): initialValues, LoginForm(), validate(), Card, CardContent, Input, Label, ScrollArea (+3 more)

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+10 more)

### Community 19 - "Community 19"
Cohesion: 0.31
Nodes (9): batch(), completeUpdates(), setStore(), handleError(), markUpstream(), runComputation(), runQueue(), runUpdates() (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.19
Nodes (17): applyState(), className(), colorClass(), createDataNode(), createStore(), get(), getDataNodes(), getListener() (+9 more)

### Community 21 - "Community 21"
Cohesion: 0.17
Nodes (12): _arrayLikeToArray(), _arrayLikeToArray$1(), _arrayWithHoles(), clock(), _createForOfIteratorHelper(), _iterableToArrayLimit(), _nonIterableRest(), random() (+4 more)

### Community 22 - "Community 22"
Cohesion: 0.25
Nodes (9): VOICE_BAR_GAINS, AttachmentList(), DropdownMenu, DropdownMenuContent(), DropdownMenuGroup, DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuSeparator() (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.26
Nodes (9): themes, Sheet, SheetClose, SheetContent(), SheetDescription(), SheetHeader(), SheetTitle(), SheetTrigger (+1 more)

### Community 24 - "Community 24"
Cohesion: 0.11
Nodes (19): ai, @liara/platformicons, lodash.debounce, next, @next/mdx, dependencies, ai, cuelume (+11 more)

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (11): addHeapObject(), debugString(), dropObject(), getInt32Memory0(), getObject(), getStringFromWasm0(), getUint8Memory0(), init() (+3 more)

### Community 26 - "Community 26"
Cohesion: 0.38
Nodes (6): useUiSound(), bindUiSounds(), loadCuelume(), playUiSound(), syncSoundEnabled(), SoundBridge()

### Community 27 - "Community 27"
Cohesion: 0.18
Nodes (10): activeUsers, adminNavItems, adminNotifications, adminPageMeta, kpis, messageRows, problemSignals, topics (+2 more)

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (10): cheerio, got, dependencies, cheerio, got, meilisearch, uuid, meilisearch (+2 more)

### Community 29 - "Community 29"
Cohesion: 0.29
Nodes (8): addEventListener(), delegateEvents(), eventHandler(), eventsource(), initBuffer(), getDriver(), websocket(), connect()

### Community 30 - "Community 30"
Cohesion: 0.40
Nodes (5): CATEGORIES, categorizeModel(), fs, main(), path

### Community 31 - "Community 31"
Cohesion: 0.40
Nodes (4): extends, rules, react/no-unescaped-entities, next/core-web-vitals

### Community 32 - "Community 32"
Cohesion: 0.50
Nodes (5): doneResult(), makeInvokeMethod(), maybeInvokeDelegate(), tryCatch(), values()

### Community 33 - "Community 33"
Cohesion: 0.67
Nodes (3): generateSitemap(), path, walk()

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (4): AsyncIterator(), enqueue(), callInvokeWithMethodAndArg(), invoke()

## Knowledge Gaps
- **190 isolated node(s):** `grouped`, `http`, `next`, `port`, `{ WebSocketServer }` (+185 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Community 24` to `Community 8`, `Community 28`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 50`, `Community 51`, `Community 53`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 59`, `Community 60`, `Community 61`, `Community 62`, `Community 63`, `Community 64`, `Community 65`, `Community 66`, `Community 67`, `Community 68`, `Community 69`, `Community 70`, `Community 71`, `Community 72`, `Community 73`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `Button` connect `Community 14` to `Community 4`, `Community 13`, `Community 17`, `Community 22`, `Community 23`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `prisma` connect `Community 0` to `Community 9`, `Community 10`, `Community 6`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `grouped`, `http`, `next` to the rest of the system?**
  _190 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05740740740740741 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.061458718992965566 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.035996488147497806 - nodes in this community are weakly interconnected._