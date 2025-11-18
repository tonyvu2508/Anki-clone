# Hướng dẫn cho AI agent (ví dụ: Cursor)

Mục tiêu: Tự động tạo một ứng dụng web **MERN** (MongoDB, Express, React, Node) với **backend (API)** và **frontend (SPA React)** tách biệt, containerized bằng **Docker / docker-compose**. Ứng dụng có chức năng cơ bản giống **Anki**: tạo deck, tạo card (front/back), lịch ôn theo SRS (ví dụ SM-2), ghi nhận kết quả ôn (easy/good/hard/again), đồng bộ user và session.

**Cấu trúc phân cấp (Tree Structure)**: Ứng dụng hỗ trợ cấu trúc cây phân cấp linh hoạt: **Items** (các mục) → **Title A Headers** (các tiêu đề A) → **Title A** (tiêu đề A) → **Title B Headers** (các tiêu đề B) → ... → **Title n & Content** (tiêu đề n & nội dung). Mỗi node có thể chứa children và cards được gắn vào các leaf nodes (node cuối cùng).

> Tông: hướng dẫn dạng checklist cụ thể, kèm sample file (Dockerfile, docker-compose, model), API contract, sample React components, lệnh shell để agent chạy và commit.

---

## 1. Yêu cầu & ràng buộc

- Node.js >= 18
- MongoDB (có thể dùng image chính thức trong docker-compose)
- Docker & docker-compose
- React (create-react-app / Vite) — chọn Vite cho dev speed
- JWT authentication (stateless)
- CORS cho FE (port 3000) -> BE (port 4000)
- Lưu trữ môi trường: `.env` files
- Acceptance criteria (tính năng tối thiểu):
  - Đăng ký/đăng nhập user (email + password hashed)
  - CRUD Deck (deck là container top-level cho tree structure)
  - CRUD Item (hierarchical tree structure với parent-child relationship)
  - CRUD Card (front/back, optional: tags, media refs) - gắn vào leaf items
  - Tree navigation: xem/collapse/expand tree nodes, di chuyển items trong tree
  - Lấy các card cần ôn hôm nay (SRS scheduling) - có thể filter theo item path
  - Ghi nhận kết quả ôn (update interval, ease factor)
  - FE: tree view UI, list decks, view deck với tree structure, review session UI, create/edit cards
  - Toàn bộ chạy qua `docker-compose up --build`

---

## 2. Cấu trúc repository (gợi ý)

```
repo-root/
├─ backend/
│  ├─ Dockerfile
│  ├─ package.json
│  ├─ src/
│  │  ├─ index.js
│  │  ├─ app.js
│  │  ├─ routes/
│  │  ├─ controllers/
│  │  ├─ models/
│  │  ├─ services/
│  │  └─ utils/
│  └─ .env.example
├─ frontend/
│  ├─ Dockerfile
│  ├─ package.json
│  ├─ src/
│  │  ├─ main.jsx
│  │  ├─ App.jsx
│  │  ├─ pages/
│  │  ├─ components/
│  │  └─ api/
│  └─ .env.example
├─ docker-compose.yml
└─ README.md
```

---

## 3. Task list (cho agent — từng bước, chạy lệnh cụ thể)

1. **Init repo & worktrees**
   - `git init` -> commit initial
2. **Create backend skeleton**
   - `mkdir backend && cd backend`
   - `npm init -y`
   - `npm i express mongoose bcryptjs jsonwebtoken dotenv cors morgan`
   - `npm i -D nodemon`
   - Tạo `src/index.js`, `src/app.js` v.v.
3. **Create frontend skeleton (Vite + React)**
   - `cd repo-root && npm create vite@latest frontend -- --template react` (hoặc `yarn create vite`)
   - Install: `cd frontend && npm i react-router-dom axios`
4. **Add Dockerfiles & docker-compose**
5. **Implement models, controllers, routes**
6. **Implement SRS service (SM-2)**
7. **Implement FE pages and review UI**
8. **Seed DB & test flows**
9. **Create README + docs + example requests**

> Agent sẽ commit after each major step with meaningful messages (e.g., `feat(backend): add user model + auth routes`).

---

## 4. Backend — thiết kế chi tiết

### 4.1 `.env.example`
```
PORT=4000
MONGO_URI=mongodb://mongo:27017/anki_clone
JWT_SECRET=supersecret_jwt_key
JWT_EXPIRES_IN=7d
```

### 4.2 Dockerfile (backend)
```
# backend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node","src/index.js"]
```
(Trong dev, agent có thể thêm Dockerfile.dev với nodemon.)

### 4.3 docker-compose.yml (tổng quát)
```
version: '3.8'
services:
  mongo:
    image: mongo:6
    restart: unless-stopped
    volumes:
      - mongo-data:/data/db
  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      - MONGO_URI=mongodb://mongo:27017/anki_clone
      - JWT_SECRET=devsecret
    depends_on:
      - mongo
  frontend:
    build: ./frontend
    ports:
      - "3000:5173"
    environment:
      - VITE_API_URL=http://localhost:4000
    depends_on:
      - backend
volumes:
  mongo-data:
```

> Note: Vite dev server default port 5173; map to host 3000.

### 4.4 Models (Mongoose)

`User` model (minimal):
```js
// src/models/User.js
const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('User', userSchema);
```

`Deck` model:
```js
// src/models/Deck.js
const deckSchema = new mongoose.Schema({
  title: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});
```

`Item` model (hierarchical tree structure):
```js
// src/models/Item.js
const itemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  deck: { type: mongoose.Schema.Types.ObjectId, ref: 'Deck', required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null }, // null = root level
  order: { type: Number, default: 0 }, // for sorting siblings
  level: { type: Number, default: 0 }, // depth in tree (0 = root, 1 = title A headers, etc.)
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for efficient tree queries
itemSchema.index({ deck: 1, parent: 1, order: 1 });
itemSchema.index({ deck: 1, level: 1 });

// Virtual for children count (optional, for performance)
itemSchema.virtual('childrenCount', {
  ref: 'Item',
  localField: '_id',
  foreignField: 'parent',
  count: true
});

module.exports = mongoose.model('Item', itemSchema);
```

`Card` model (SRS fields - attached to leaf items):
```js
// src/models/Card.js
const cardSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true }, // leaf item only
  deck: { type: mongoose.Schema.Types.ObjectId, ref: 'Deck', required: true }, // denormalized for quick queries
  front: String,
  back: String,
  tags: [String],
  createdAt: { type: Date, default: Date.now },
  // SRS fields
  interval: { type: Number, default: 0 }, // days
  ef: { type: Number, default: 2.5 },
  repetitions: { type: Number, default: 0 },
  dueDate: { type: Date, default: Date.now }
});

// Index for review queries
cardSchema.index({ deck: 1, dueDate: 1 });
cardSchema.index({ item: 1 });

module.exports = mongoose.model('Card', cardSchema);
```

### 4.5 Key API endpoints (REST)

**Auth**
- `POST /api/auth/register` {email, password} -> 201 + { token }
- `POST /api/auth/login` {email, password} -> 200 + { token }

**Decks**
- `GET /api/decks` -> list user's decks
- `POST /api/decks` {title} -> create deck
- `GET /api/decks/:id` -> get deck with tree structure
- `PUT /api/decks/:id` {title} -> update
- `DELETE /api/decks/:id`

**Items (Tree Structure)**
- `GET /api/decks/:deckId/items` -> get tree structure (all items with children populated recursively)
- `GET /api/decks/:deckId/items?parentId=...` -> get children of specific parent (null = root)
- `POST /api/decks/:deckId/items` {title, parentId, order} -> create item
- `GET /api/items/:itemId` -> get item with children
- `PUT /api/items/:itemId` {title, parentId, order} -> update item (can move to different parent)
- `DELETE /api/items/:itemId` -> delete item and all descendants (cascade)
- `GET /api/items/:itemId/path` -> get full path from root to item (array of items)

**Cards**
- `GET /api/items/:itemId/cards` -> list cards for a specific item (leaf items only)
- `POST /api/items/:itemId/cards` {front, back, tags} -> create card (item must be leaf)
- `GET /api/cards/:cardId` -> get card
- `PUT /api/cards/:cardId` {front, back, tags} -> edit
- `DELETE /api/cards/:cardId`
- `GET /api/decks/:deckId/cards` -> list all cards in deck (optional: filter by item path)

**Review flows**
- `GET /api/review/today?deckId=...&itemId=...` -> list cards whose `dueDate <= now` (optional itemId filter)
- `POST /api/review/:cardId/result` { quality: 0|1|2|3 } -> update card SRS fields and return next dueDate

> `quality` mapping example: 0=Again, 1=Hard, 2=Good, 3=Easy.
> 
> **Tree Structure Notes:**
> - Items form a tree: root items (parent=null) belong to deck
> - Each item can have unlimited children
> - Cards are only attached to leaf items (items with no children)
> - Use recursive query or populate to build full tree structure
> - Consider using `path` field (materialized path pattern) for very deep trees if performance is an issue

### 4.6 Tree utility functions (utils/tree.js)

```js
// src/utils/tree.js

/**
 * Build tree structure from flat array of items
 * @param {Array} items - Flat array of items with parent references
 * @returns {Array} - Tree structure with children nested
 */
function buildTree(items, parentId = null) {
  return items
    .filter(item => {
      const itemParent = item.parent ? item.parent.toString() : null;
      return itemParent === parentId;
    })
    .sort((a, b) => a.order - b.order)
    .map(item => ({
      ...item.toObject(),
      children: buildTree(items, item._id.toString())
    }));
}

/**
 * Get full path from root to item
 * @param {Object} item - Item document
 * @param {Array} allItems - All items in deck (for lookup)
 * @returns {Array} - Array of items from root to current item
 */
function getItemPath(item, allItems) {
  const path = [item];
  let current = item;
  
  while (current.parent) {
    current = allItems.find(i => i._id.toString() === current.parent.toString());
    if (current) {
      path.unshift(current);
    } else {
      break;
    }
  }
  
  return path;
}

/**
 * Check if item is a leaf (has no children)
 * @param {String} itemId - Item ID
 * @param {Array} allItems - All items in deck
 * @returns {Boolean}
 */
function isLeafItem(itemId, allItems) {
  return !allItems.some(item => 
    item.parent && item.parent.toString() === itemId.toString()
  );
}

/**
 * Get all descendant item IDs (for cascade delete)
 * @param {String} itemId - Item ID
 * @param {Array} allItems - All items in deck
 * @returns {Array} - Array of descendant item IDs
 */
function getDescendantIds(itemId, allItems) {
  const descendants = [];
  const children = allItems.filter(item => 
    item.parent && item.parent.toString() === itemId.toString()
  );
  
  children.forEach(child => {
    descendants.push(child._id);
    descendants.push(...getDescendantIds(child._id, allItems));
  });
  
  return descendants;
}

module.exports = {
  buildTree,
  getItemPath,
  isLeafItem,
  getDescendantIds
};
```

### 4.7 SM-2 simplified implementation (services/srs.js)

Algorithm (simplified):
1. If quality < 1 (failed): repetitions=0; interval=1; // or 0 for immediate
2. Else:
   - repetitions +=1
   - if repetitions ==1 -> interval = 1
   - else if repetitions ==2 -> interval = 6
   - else -> interval = Math.round(prevInterval * ef)
   - ef = ef + (0.1 - (3-quality)*(0.08 + (3-quality)*0.02)) ; if ef < 1.3 -> ef = 1.3
   - dueDate = today + interval days

Return updated fields.

---

## 5. Frontend — thiết kế chi tiết

### 5.1 .env
```
VITE_API_URL=http://localhost:4000
```

### 5.2 Dockerfile (frontend)
```
# frontend/Dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
```
(Dev: run Vite directly in container mapping port 5173.)

### 5.3 Main pages / components
- `LoginPage`, `RegisterPage`
- `DecksPage` — list + create deck
- `DeckPage` — tree view of items + cards, add/edit items and cards
  - `TreeView` component — recursive tree rendering with expand/collapse
  - `ItemNode` component — single tree node with children
  - `CardList` component — shows cards for selected leaf item
- `ReviewPage` — core UI: show `front`, button to reveal `back`, then buttons (Again / Hard / Good / Easy)
- `Api` helper uses `axios` with JWT stored in `localStorage` or `httpOnly` cookie (prefer httpOnly with same-site in production; for quick dev use localStorage)

**Tree View UI Components:**
```js
// Example TreeView component structure
<TreeView>
  <ItemNode item={rootItem} level={0}>
    {children.map(child => (
      <ItemNode item={child} level={1}>
        {/* recursive rendering */}
      </ItemNode>
    ))}
  </ItemNode>
</TreeView>
```

Features:
- Expand/collapse nodes
- Drag & drop to reorder/move items (optional)
- Context menu: add child, edit, delete
- Click item to view its cards (if leaf)
- Breadcrumb navigation showing path to current item

### 5.4 Review UI flow
1. GET `/api/review/today?deckId=` to fetch cards
2. Iterate over cards in client state
3. For each card show front; `Reveal` button shows back
4. After reveal show four response buttons; click -> POST result, remove from list
5. Optionally show progress bar

Sample Axios call:
```js
// src/api/review.js
export const postResult = (cardId, quality) => axios.post(`${API}/review/${cardId}/result`, {quality});
```

---

## 6. Security & notes
- Hash passwords with `bcrypt` (saltRounds = 10)
- Sign JWT tokens; verify middleware for protected routes
- Validate inputs with simple checks (email regex, min password length)
- Rate limiting (optional) — add express-rate-limit
- CORS: only allow FE origin in production

---

## 7. Example requests (curl)

Register:
```
curl -X POST http://localhost:4000/api/auth/register -H "Content-Type: application/json" -d '{"email":"a@b.com","password":"pass123"}'
```
Login:
```
curl -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"a@b.com","password":"pass123"}'
```
Get today's cards:
```
curl -H "Authorization: Bearer <token>" "http://localhost:4000/api/review/today?deckId=<id>"
```
Post result:
```
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"quality":2}' http://localhost:4000/api/review/<cardId>/result
```

---

## 8. Tests & seeding
- Create `scripts/seed.js` to add sample user, deck, and cards with various dueDates
- Unit test SRS service with a few cases (jest)
- Integration: run backend and seed, then manual flow through FE

---

## 9. Agent prompts & steps for Cursor-like agent

Use these step-by-step prompts for the agent to run (automate):

1. **Create files**: create skeleton files and folders per repo structure.
2. **Install deps**: run npm installs.
3. **Implement models**: write the Mongoose schemas provided above (User, Deck, Item, Card).
4. **Implement auth**: register/login + JWT middleware.
5. **Implement Deck & Item endpoints** (tree CRUD operations).
6. **Implement Card endpoints** (attach to leaf items).
7. **Implement tree utility functions**: build tree from flat list, get item path, validate leaf items.
8. **Implement Review endpoints & srs service**.
9. **Add Dockerfiles & docker-compose**.
10. **Build & run containers**: `docker-compose up --build`
11. **Seed DB**: `node backend/scripts/seed.js` (include sample tree structure)
12. **Open frontend**: visit `http://localhost:3000` and test flows.

For each step, the agent should:
- run code lint (`npm run lint` if configured),
- run unit tests if any,
- commit changes with meaningful message,
- run containers and confirm health (e.g., curl health endpoint `/api/health`).

---

## 10. Minimal code snippets (quick paste)

### Express index.js (tiny)
```js
// src/index.js
require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const PORT = process.env.PORT || 4000;

mongoose.connect(process.env.MONGO_URI).then(()=>{
  console.log('mongo connected');
  app.listen(PORT, ()=> console.log(`Listening ${PORT}`));
}).catch(err=>{ console.error(err); process.exit(1);} )
```

### app.js (tiny)
```js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const authRoutes = require('./routes/auth');

const app = express();
app.use(morgan('dev'));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use('/api/auth', authRoutes);
app.get('/api/health', (req,res)=>res.json({ok:true}));
module.exports = app;
```

---

## 11. Acceptance tests (manual checklist)
- [ ] `docker-compose up --build` starts 3 services (mongo, backend, frontend)
- [ ] Can register + login
- [ ] Can create deck
- [ ] Can create items in tree structure (root items, nested items)
- [ ] Can view tree structure with expand/collapse
- [ ] Can move/reorder items in tree
- [ ] Can create cards only on leaf items (items without children)
- [ ] Can view cards for a specific item
- [ ] Can start review and submit results
- [ ] Card's `dueDate` changes after review per SRS
- [ ] Can filter review by item path

---

## 12. Next steps / enhancements (optional)
- Add audio/image upload (S3 or local volume)
- Add spaced repetition insights dashboard
- Add sync with Anki format (.apkg) import/export
- Add spaced notifications (email/push) and scheduling
- Add offline-first support (IndexedDB) and conflict resolution

---

### Kết luận / Hướng dẫn cho agent tóm tắt nhanh
1. Tạo skeleton BE + FE.
2. Implement models (User, Deck, Item với parent-child, Card) + auth + review logic (SM-2 simplified).
3. Implement tree structure APIs (CRUD items với hierarchical support).
4. Implement tree utility functions (build tree, get path, validate leaf).
5. Implement FE tree view components (recursive rendering, expand/collapse).
6. Add Dockerfiles + docker-compose.
7. Seed DB với sample tree structure, run, test flows.
8. Commit frequently with clear messages.

### Implementation Strategy cho Tree Structure

**Backend Approach:**
- Sử dụng **Parent-Child Reference Pattern** với `parentId` field (flexible, easy to move nodes)
- Alternative: Materialized Path Pattern nếu cần query by path thường xuyên (thêm field `path: "root/itemA/itemB"`)
- Recursive query để build full tree: query all items for deck, then build tree in memory
- Validate leaf items: only allow card creation on items with `childrenCount === 0`

**Frontend Approach:**
- Recursive component rendering cho tree
- State management: store flat list + build tree on render, hoặc store tree structure
- Lazy loading: chỉ load children khi expand node (optional optimization)
- Drag & drop library (react-dnd hoặc dnd-kit) cho reordering (optional)

**Sample Tree Structure:**
```
Deck: "Lịch sử Việt Nam"
├─ Item: "Thời kỳ cổ đại" (level 0, parent: null)
│  ├─ Item: "Văn Lang - Âu Lạc" (level 1, parent: "Thời kỳ cổ đại")
│  │  └─ Card: "Ai là vua Hùng đầu tiên?" / "Vua Hùng Vương"
│  └─ Item: "Bắc thuộc" (level 1, parent: "Thời kỳ cổ đại")
│     └─ Card: "Triều đại nào đô hộ Việt Nam lâu nhất?" / "Nhà Hán"
└─ Item: "Thời kỳ phong kiến" (level 0, parent: null)
   ├─ Item: "Nhà Lý" (level 1, parent: "Thời kỳ phong kiến")
   │  └─ Card: "Kinh đô nhà Lý?" / "Thăng Long"
   └─ Item: "Nhà Trần" (level 1, parent: "Thời kỳ phong kiến")
      └─ Card: "Ai là vua đầu tiên nhà Trần?" / "Trần Thái Tông"
```

Bạn muốn mình tạo sẵn file `docker-compose.yml`, `backend/src/models/Card.js`, `backend/src/services/srs.js` và một `frontend` review component để bạn / agent copy/paste không? Nếu có, mình sẽ tạo các file cụ thể luôn.

