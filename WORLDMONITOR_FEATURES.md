# WorldMonitor-Style Visual News Features

This document describes the new worldmonitor-inspired features added to the OSINT Global Threat Map news system.

## ✅ Features Added

### 1. **News Clustering** 📊
- **File**: `lib/news-clustering.ts`
- **What it does**: Groups similar news stories together using n-gram similarity (Jaccard index)
- **Algorithm**:
  - Generates 3-word n-grams from headlines
  - Calculates Jaccard similarity between stories (threshold: 0.4)
  - Groups similar stories into clusters
  - Sorts clusters by: breaking status → source count → date

**Benefits**:
- Reduces duplicate news stories
- Shows multiple sources covering the same event
- Makes it easier to spot major breaking news

### 2. **Breaking News Alerts** 🚨
- **Feature**: Automatic detection of breaking news
- **Criteria**:
  - 3+ sources reporting the same story
  - 2+ high-tier sources (Tier 1 or Tier 2)
  - All within 6 hours
- **Visual indicators**:
  - Red pulsing "BREAKING" badge
  - Lightning bolt icon
  - Red left border
  - Velocity indicator (sources/hour)

**Example**: If Reuters, BBC, and AP all report "Israel strikes Gaza" within 2 hours, it's automatically flagged as breaking news.

### 3. **Entity Extraction** 🔍
- **File**: `lib/entity-extraction.ts`
- **What it does**: Automatically identifies and highlights entities in headlines
- **Entity types**:
  - **Countries** (90+ countries) - clickable to fly to map location
  - **Leaders** (major world leaders) - clickable to search for entity
  - **Organizations** (NATO, UN, Pentagon, etc.) - clickable to search

**Visual style**:
- Entities shown with dotted underline in blue (#00aaff)
- Hover turns green (#00ff88)
- Click triggers map navigation or entity search

**Examples**:
- "**Israel** launches strikes in **Gaza**" → Israel and Gaza are clickable
- "**NATO** warns **Russia** over **Ukraine**" → All three are clickable entities
- "**Biden** meets with **Xi Jinping**" → Both leaders are clickable

### 4. **Live Video Streams** 📺
- **File**: `components/news/video-streams.tsx`
- **What it does**: Embeds live news streams from major outlets
- **Streams included**:
  - Sky News (24/7 live)
  - Al Jazeera English
  - France 24 English
  - DW News
- **Features**:
  - 2x2 grid of stream thumbnails
  - Click to play full-size embedded stream
  - "LIVE" indicator with blinking red dot
  - Muted autoplay on selection

### 5. **Cluster View UI** 🎴
- **File**: `components/news/news-cluster-card.tsx`
- **Features**:
  - Shows representative article from cluster
  - Badge showing "X sources"
  - Click to expand and see all sources
  - Breaking alert badge for urgent news
  - Velocity indicator (sources/hour)
  - Entity-highlighted headlines

### 6. **Toggle Between Views** 🔄
- **Button**: "CLUSTERED" / "FLAT" toggle in news panel header
- **Clustered view**: Groups similar stories (default)
- **Flat view**: Shows all articles individually (original behavior)

## 📂 New Files Created

```
lib/
├── news-clustering.ts          # Clustering algorithm
├── entity-extraction.ts        # Entity recognition

components/news/
├── news-cluster-card.tsx       # Clustered news card UI
└── video-streams.tsx           # Live video streams panel
```

## 🔧 Modified Files

```
stores/news-store.ts            # Added clustering state
components/news/news-panel.tsx  # Integrated new features
```

## 🎨 Visual Features

### Breaking News Badge
```
🔴 ⚡ BREAKING  |  3 sources  |  5.2 sources/hr
```

### Clustered Article Example
```
★ Wire | Reuters • 3 sources • NEW • Conflict

Israel launches strikes in Gaza Strip amid ceasefire talks
           ↑              ↑
       (clickable)   (clickable)

2 hours ago • Read more →

▼ All Sources (3)
   ★ Reuters: Israel launches strikes...
   ● BBC: Israeli military strikes Gaza...
   ● AP: Israel attacks Gaza...
```

### Video Streams Grid
```
┌─────────────┬─────────────┐
│ 🔴 LIVE     │ 🔴 LIVE     │
│ Sky News    │ Al Jazeera  │
└─────────────┴─────────────┘
┌─────────────┬─────────────┐
│ 🔴 LIVE     │ 🔴 LIVE     │
│ France 24   │ DW News     │
└─────────────┴─────────────┘
```

## 🚀 How to Use

1. **Open the News tab** in the sidebar
2. **See live video streams** at the top (click any to play)
3. **Toggle clustering** using the "CLUSTERED" button
4. **Click "X sources"** badge to expand and see all sources
5. **Click entities** (countries, leaders, orgs) in headlines to navigate
6. **Breaking news** automatically appears at the top with red indicators

## 🎯 Key Differences from Original

### Before (Original)
- Flat list of all articles
- No clustering
- No entity highlighting
- No breaking news detection
- No live video streams

### After (WorldMonitor-style)
- ✅ Smart clustering groups similar stories
- ✅ Breaking news detection with velocity indicators
- ✅ Entity extraction makes headlines interactive
- ✅ Live video streams embedded
- ✅ Toggle between clustered and flat views
- ✅ Expandable clusters show all sources

## 📊 Technical Details

### Clustering Algorithm
- **Method**: N-gram Jaccard similarity
- **Threshold**: 0.4 (40% similarity)
- **N-gram size**: 3 words
- **Performance**: O(n²) for initial clustering, then cached

### Breaking News Detection
```typescript
isBreaking =
  sources >= 3 &&
  (tier1Sources + tier2Sources) >= 2 &&
  timeSpan <= 6 hours
```

### Entity Types Supported
- **Countries**: 90+ (US, China, Russia, Israel, Iran, etc.)
- **Leaders**: 14 major world leaders
- **Organizations**: 22 major organizations (NATO, UN, Pentagon, etc.)

## 🔮 Future Enhancements (Not Implemented Yet)

These are worldmonitor features that could be added later:
- Semantic clustering using ML (Transformers.js)
- Real-time WebSocket news updates
- News export as intelligence briefs
- Custom keyword monitors
- Geographic news filtering by map viewport

## 🐛 Known Limitations

1. **Entity extraction is basic** - Uses regex pattern matching, not NLP
2. **Clustering is local** - Runs on filtered items, not all news
3. **Video streams require internet** - Embeds YouTube live streams
4. **No persistence** - Clustering recalculates on each load

## ✅ Testing

The build succeeds with no TypeScript errors:
```bash
npm run build  # ✓ Passes
npm run dev    # ✓ Server runs on port 3000
```

All existing functionality remains intact:
- ✅ Feed filters still work
- ✅ Category filtering works
- ✅ Search still works
- ✅ Unread count works
- ✅ RSS feeds load correctly

---

**Summary**: Your OSINT Global Threat Map now has worldmonitor-style visual news features including clustering, breaking alerts, entity extraction, and live video streams - all without breaking existing functionality! 🎉
