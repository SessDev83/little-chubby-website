# 30-Day Blog Content Calendar

**Start date:** July 2025
**Frequency:** 1 post every day (bilingual EN + ES via `create-blog-post.mjs`)
**Status:** PLANNING

---

## Current Coverage

| # | Book ID | Posts |
|---|---------|-------|
| 1 | awesome-airplanes | 1 |
| 2 | awesome-boys | 1 |
| 3 | awesome-girls | 1 |
| 4 | blast-off-space | 1 |
| 5 | chic-styles | 1 |
| 6 | coloring-emotions | 1 |
| 7 | cozy-kids-club | **2** |
| 8 | dresses-and-dolls | 1 |
| 9 | easy-animals | 1 |
| 10 | enchanted-easter | 1 |
| 11 | magical-creatures | 1 |
| 12 | mighty-machines | 1 |
| 13 | pizza-sweet-treats | 1 |
| 14 | style-time-machine | 1 |
| 15 | alphabet-coloring-book | 1 |
| — | General (no book) | 4 |

**Goal:** Every book gets a 2nd post. Mix in seasonal and evergreen general topics.

---

## Calendar

### Week 1: Summer Kickoff

| Day | Topic (EN) | Book ID | Type |
|-----|-----------|---------|------|
| 1 | Summer coloring activities to beat boredom | awesome-boys | Seasonal |
| 2 | How animal coloring pages build empathy in kids | easy-animals | Evergreen |
| 3 | Road trip coloring kit: what to pack | — (general) | Seasonal |
| 4 | Space-themed birthday party coloring activities | blast-off-space | Evergreen |
| 5 | Why coloring is the perfect screen-free summer activity | — (general) | Seasonal |
| 6 | Fairy tale coloring and storytelling for kids | magical-creatures | Evergreen |
| 7 | Fashion design careers start with coloring books | chic-styles | Evergreen |

### Week 2: Skills & Learning

| Day | Topic (EN) | Book ID | Type |
|-----|-----------|---------|------|
| 8 | Fine motor skills your child builds while coloring | — (general) | Evergreen |
| 9 | How construction coloring teaches spatial awareness | mighty-machines | Evergreen |
| 10 | Alphabet games beyond the ABCs with coloring | alphabet-coloring-book | Evergreen |
| 11 | Coloring helps kids who struggle with transitions | coloring-emotions | Evergreen |
| 12 | How food coloring pages can teach healthy eating | pizza-sweet-treats | Evergreen |
| 13 | Airplane coloring and geography lessons for kids | awesome-airplanes | Evergreen |
| 14 | Mix-and-match fashion: creative coloring for girls | dresses-and-dolls | Evergreen |

### Week 3: Emotions & Wellbeing

| Day | Topic (EN) | Book ID | Type |
|-----|-----------|---------|------|
| 15 | Mindfulness coloring exercises for anxious kids | cozy-kids-club | Evergreen |
| 16 | Boys and creativity: breaking the stereotypes | awesome-boys | Evergreen |
| 17 | Coloring activities for kids with ADHD | coloring-emotions | Evergreen |
| 18 | How coloring builds patience in toddlers | easy-animals | Evergreen |
| 19 | Friendship activities with coloring books | awesome-girls | Evergreen |
| 20 | Seasonal fruits and vegetables coloring fun | pizza-sweet-treats | Seasonal |
| 21 | Fantasy worlds: mythical creatures from around the globe | magical-creatures | Evergreen |

### Week 4: Family & Back-to-School Prep

| Day | Topic (EN) | Book ID | Type |
|-----|-----------|---------|------|
| 22 | Family coloring night: bonding through art | — (general) | Evergreen |
| 23 | Coloring contests and challenges at home | — (general) | Evergreen |
| 24 | Travel coloring page ideas from around the world | awesome-airplanes | Seasonal |
| 25 | Vintage vs modern style: a coloring adventure | style-time-machine | Evergreen |
| 26 | Easter and spring crafts you can use year-round | enchanted-easter | Evergreen |
| 27 | Getting ready for school with coloring routines | alphabet-coloring-book | Seasonal |
| 28 | Trucks, cranes, and careers: what kids learn coloring machines | mighty-machines | Evergreen |
| 29 | Dress-up coloring for pretend play and imagination | dresses-and-dolls | Evergreen |
| 30 | How to start a summer coloring challenge for your kids | — (general) | Seasonal |

---

## Book Coverage After 30 Days

| Book ID | Existing | New | Total |
|---------|----------|-----|-------|
| awesome-airplanes | 1 | 2 | 3 |
| awesome-boys | 1 | 2 | 3 |
| awesome-girls | 1 | 1 | 2 |
| blast-off-space | 1 | 1 | 2 |
| chic-styles | 1 | 1 | 2 |
| coloring-emotions | 1 | 2 | 3 |
| cozy-kids-club | 2 | 1 | 3 |
| dresses-and-dolls | 1 | 2 | 3 |
| easy-animals | 1 | 2 | 3 |
| enchanted-easter | 1 | 1 | 2 |
| magical-creatures | 1 | 2 | 3 |
| mighty-machines | 1 | 2 | 3 |
| pizza-sweet-treats | 1 | 2 | 3 |
| style-time-machine | 1 | 1 | 2 |
| alphabet-coloring-book | 1 | 2 | 3 |
| General (no book) | 4 | 6 | 10 |

**Total posts after calendar:** 20 existing + 30 new = **50 bilingual posts (100 files)**

---

## Command to Create Each Post

```bash
node scripts/create-blog-post.mjs --topic "TOPIC HERE" --bookId BOOK_ID
```

For general posts (no book):
```bash
node scripts/create-blog-post.mjs --topic "TOPIC HERE"
```

Dry run first:
```bash
node scripts/create-blog-post.mjs --topic "TOPIC HERE" --bookId BOOK_ID --dry-run
```
