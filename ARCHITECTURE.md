# Fight Club — Architecture

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Client | Svelte 5 + Vite + Tailwind CSS | TypeScript, all components `lang="ts"` |
| Server | Node.js + ws (WebSocket) | TypeScript, compiled via `tsc` |
| Database | SQLite via better-sqlite3 | WAL mode, synchronous API |
| Deployment | Docker (multi-stage build) + Caddy | Caddy proxies `/ws` to container |
| Auth | bcryptjs | Passwords hashed, plaintext auto-migrated |

## Directory Structure

```
server/
  server.ts          # Main WebSocket server (~2200 lines)
  db.ts              # SQLite layer: schema, CRUD, migrations
  data/
    types.ts         # Shared types (User, ResolvedUser, Item, NPC, etc.)
    items.ts         # Item database + procedural generator (tiers 0-55)
    npcs.ts          # NPC database + procedural generator (levels 22-300)
    classes.ts       # 4 classes with skills and passives
    skills.ts        # Skill trees (3 branches × 5 tiers) + masteries
    dungeons.ts      # 8 dungeons with bosses and modifiers
    quests.ts        # 30 quest templates
    achievements.ts  # 14 achievements
    titles.ts        # 18 titles with gameplay buffs

client/
  src/
    main.ts          # Entry point
    App.svelte       # Root component (auth gate)
    app.css          # Global styles + responsive breakpoints
    lib/
      audio.ts       # Web Audio API sound effects (no audio files)
      stores/
        game.ts      # Central game state (~420 lines, all Svelte stores)
        connection.ts # WebSocket manager with auto-reconnect
      components/
        Game.svelte        # Main layout (sidebar, header, content, chat)
        CombatViewer.svelte # Animated combat playback with effects
        Avatar.svelte       # SVG character avatar
        Auth.svelte         # Login/register
        CharacterCreation.svelte # Class + appearance selection
        ChatPanel.svelte    # Global chat with /w and /g commands
        Tutorial.svelte     # New player tutorial overlay
        tabs/               # 22 tab components (Arena, Inventory, etc.)
```

## Data Flow

```
Client (Svelte)  ←→  WebSocket  ←→  Server (Node.js)  ←→  SQLite
     ↑                                    ↑
     └── Svelte stores (reactive)         └── In-memory cache (users, guilds)
```

1. Client sends JSON messages via WebSocket
2. Server processes in a synchronous switch statement
3. Server mutates in-memory `users`/`guilds` objects
4. Server persists to SQLite via `db.saveUser()` (single-row UPDATE)
5. Server sends response + `player_update` back to client
6. Client store updates → Svelte reactivity updates UI

## Database

**SQLite with WAL mode.** Hybrid schema: scalar fields that need querying are real columns; complex nested data (equipment, inventory, buffs) stored as JSON columns.

**Tables:**
- `users` — 58 columns (scalars + JSON), indexed on level, pvp_rating, kills
- `guilds` — id, name, leader, members (JSON), applications (JSON)
- `messages` — private message inbox, indexed on receiver + read status

**Performance:** In-memory cache for reads (zero latency). SQLite writes only on mutations (~0.05ms per UPDATE vs ~50ms for the old full-JSON write).

## Security

- **Rate limiting**: Per-connection, per-message-type throttling (fight: 500ms, chat: 500ms, buy: 200ms, etc.)
- **Input validation**: Username alphanumeric check, message length limits, item/NPC ID validation
- **Auth**: bcrypt password hashing, ban check on login
- **Admin**: Server-side `isAdmin()` check on all admin endpoints
- **WebSocket**: `maxPayload: 16KB` prevents oversized message attacks
- **Profanity filter**: Per-user toggle, server-side filtering
- **Block system**: Blocked users' chat messages hidden server-side

## Key Design Decisions

**In-memory + SQLite hybrid**: All user data loaded into memory at startup for zero-latency reads. SQLite is the persistence layer, written to after every mutation. This works because the game is single-server.

**Synchronous everything**: Node.js single-thread + better-sqlite3 synchronous API means no async/await, no race conditions, no connection pools. The entire request lifecycle is a single synchronous call chain.

**Auto-farm is client-driven**: The server has no concept of auto-farm state. The client sends individual `fight_npc` messages with `autoRest: true`. The server processes each fight atomically and returns the result. Rate limiting prevents abuse.

**Combat is server-authoritative**: All combat math (damage, crits, blocks, skills, potions) happens server-side. The client only displays the combat log via CombatViewer animation. No client-side combat state can be tampered with.

**Player updates are buffered during auto-farm**: To prevent the sidebar HP from spoiling fight outcomes, `player_update` messages are held in a buffer during combat animation and flushed when the animation completes.

## Scaling Limits

The current architecture comfortably handles **~100-200 concurrent players** on a single server. Beyond that:

- The in-memory user cache grows linearly (~5KB per user)
- `broadcastOnlineList()` sends to all clients on every login/logout
- SQLite handles thousands of writes/second but is single-writer
- WebSocket connections are lightweight (~2KB each)

For >500 players, you'd need: horizontal WebSocket scaling (sticky sessions), Redis for shared state, PostgreSQL for the database, and a message queue for cross-server events. But for the current deployment, this is far beyond needed.
