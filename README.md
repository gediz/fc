# Fight Club — Browser RPG

A multiplayer browser RPG inspired by classic text-based fighting games. Built with Svelte 5 + Node.js + SQLite.

**Live:** [fc.fgsk.space](https://fc.fgsk.space)

## Features

### Combat
- **Arena** — Auto-farm NPCs with animated combat viewer. 300+ opponents across 15 tiers with lore.
- **Dungeons** — 8 dungeons with bosses, modifiers, and daily limits.
- **PvP** — Real-time zone-based combat with ELO rating system.

### Character
- **4 Classes** — Warrior, Rogue, Guardian, Mystic. Each with 2 active skills + 1 passive.
- **Skill Trees** — 3 branches × 5 tiers per class + repeatable mastery system.
- **Equipment** — Unique item instances (UUID-based) with enchanting and durability.
- **Crafting** — Salvage items for fragments, forge new gear at chosen rarity/slot.

### Social
- **Guilds** — Create/join guilds with XP-based leveling, donations, notices, and bonuses.
- **Private Messages** — Persistent inbox with conversation view, works offline.
- **Friends** — Request-based friend system with online status.
- **Chat** — Global, guild, and whisper channels with profanity filter.

### Progression
- **Quests** — 30 quest templates across combat, collection, and milestone categories.
- **Achievements** — 14 achievements with gold rewards.
- **Titles** — 18 titles with gameplay buffs.
- **Seasons** — Monthly point system with tiered rewards.
- **Prestige** — Reset at max level (300) for permanent stat bonuses.

### Admin
- **Dashboard** — Server stats, player management, live activity feed.
- **Activity Logger** — Real-time log viewer with category filters, search, player filter.
- **Chat Logs** — Daily log files with weekly compression.
- **Player Management** — Set gold/level, give items, kick/ban, broadcast.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Client | Svelte 5 + Vite + Tailwind CSS (TypeScript) |
| Server | Node.js + ws (WebSocket) (TypeScript) |
| Database | SQLite via better-sqlite3 (WAL mode) |
| Deployment | Docker (multi-stage build) + Caddy |
| Auth | bcryptjs |

## Project Structure

```
server/
  server.ts          — Main WebSocket server
  db.ts              — SQLite layer (schema, CRUD, migrations)
  logger.ts          — Game activity logger (ring buffer + daily files)
  data/
    types.ts         — Shared types (User, Item, NPC, etc.)
    items.ts         — Items + procedural generator (tiers 0-55)
    npcs.ts          — NPCs + procedural generator (levels 22-300)
    classes.ts       — 4 classes with skills
    skills.ts        — Skill trees + masteries
    dungeons.ts      — 8 dungeons
    quests.ts        — Quest templates
    achievements.ts  — Achievements
    titles.ts        — Titles with buffs

client/
  src/
    main.ts          — Entry point
    App.svelte       — Auth gate
    app.css          — Global styles + responsive
    lib/
      audio.ts       — Web Audio API sound effects
      stores/
        game.ts      — Central game state (Svelte stores)
        connection.ts — WebSocket manager
      components/
        Game.svelte        — Main layout (sidebar, header, content)
        CombatViewer.svelte — Animated combat playback
        Avatar.svelte       — SVG character avatar
        tabs/               — 22 page components
```

## Development

```bash
# Server
cd server
npm install
npm run dev          # tsx server.ts (needs DB_PATH env)

# Client
cd client
npm install
npm run dev          # Vite dev server

# Type checking
cd server && npm run typecheck
cd client && npm run build
```

## Deployment

```bash
# Docker (production)
docker compose build fightclub
docker compose up -d fightclub

# Manual deploy
rsync -az client/dist/ server:/path/to/static/
rsync -az server/ server:/path/to/fightclub-server/
```

The server compiles TypeScript via `tsc` in a multi-stage Docker build. The runtime image uses plain `node dist/server.js` with no TypeScript dependency.

## Database

SQLite with WAL mode. Hybrid schema: scalar fields as real columns (queryable), complex nested data as JSON columns.

Tables: `users` (60+ columns), `guilds`, `messages`.

Auto-migrates from JSON files on first run. Schema migrations via `ALTER TABLE` at startup.

## Security

- Rate limiting per connection per message type
- Username validation (alphanumeric only)
- WebSocket maxPayload (16KB)
- bcrypt password hashing
- Server-side admin checks on all admin endpoints
- Profanity filter (per-user toggle)
- Input validation and length limits

## License

MIT
