# Anki Clone - MERN Stack Application

Ứng dụng web clone Anki với cấu trúc cây phân cấp (tree structure) cho việc quản lý flashcards và spaced repetition learning.

## Tính năng

- ✅ Đăng ký/Đăng nhập user
- ✅ CRUD Decks
- ✅ CRUD Items (hierarchical tree structure)
- ✅ CRUD Cards (gắn vào leaf items)
- ✅ Tree navigation với expand/collapse
- ✅ Spaced Repetition System (SRS) - SM-2 algorithm
- ✅ Review session với quality rating (Again/Hard/Good/Easy)
- ✅ Filter cards theo item path
- ✅ Public deck sharing với unique 6-character link
- ✅ Import/Export deck bằng JSON
- ✅ Import deck từ Anki .apkg file
- ✅ Media support: Images, Audio, Video cho cards

## Cấu trúc Project

```
.
├── backend/          # Express.js API
│   ├── src/
│   │   ├── models/  # Mongoose models
│   │   ├── routes/  # API routes
│   │   ├── controllers/
│   │   ├── services/ # SRS service
│   │   └── utils/   # Tree utilities
│   └── Dockerfile
├── frontend/         # React + Vite
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── api/
│   └── Dockerfile
└── docker-compose.yml
```

## Yêu cầu

- Docker & Docker Compose
- Node.js >= 18 (cho development)

## Cài đặt và Chạy

### 1. Clone repository

```bash
git clone <repository-url>
cd Anki
```

### 2. Tạo file .env (optional)

Backend sẽ sử dụng environment variables từ docker-compose.yml. Nếu muốn override, tạo file `.env` trong thư mục `backend/`:

```env
PORT=4000
MONGO_URI=mongodb://mongo:27017/anki_clone
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
```

Frontend: Tạo file `.env` trong thư mục `frontend/`:

```env
VITE_API_URL=http://localhost:4000
```

### 3. Build và chạy với Docker Compose

```bash
# Build và start tất cả services
docker-compose up --build

# Hoặc build và chạy trong background
docker-compose up --build -d
```

**Lưu ý**: Nếu thêm dependencies mới vào `package.json`, cần:
```bash
# Cài đặt dependencies mới
docker-compose run --rm backend npm install
docker-compose restart backend
```

Services sẽ chạy trên:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- MongoDB: localhost:27017

### 4. Seed database (tạo demo data)

```bash
# Chạy trong container backend
docker-compose exec backend npm run seed

# Hoặc từ local (cần MongoDB đang chạy)
cd backend
npm install
npm run seed
```

**Demo data bao gồm:**
- User: `test@example.com` / `password123`
- Deck: "Lịch sử Việt Nam" với tree structure và cards mẫu
- Sample items và cards để test các tính năng

### 5. Kiểm tra services đang chạy

```bash
# Xem logs của tất cả services
docker-compose logs -f

# Xem logs của một service cụ thể
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongo

# Kiểm tra health check
curl http://localhost:4000/api/health
```

## Development

### Backend

```bash
cd backend
npm install
npm run dev  # với nodemon (auto-reload)
```

**Backend scripts:**
- `npm start` - Chạy production mode
- `npm run dev` - Chạy development mode với nodemon
- `npm run seed` - Tạo demo database

### Frontend

```bash
cd frontend
npm install
npm run dev  # Vite dev server (port 5173)
```

**Frontend scripts:**
- `npm run dev` - Development server
- `npm run build` - Build production
- `npm run preview` - Preview production build

## Build & Deploy

### Build tất cả services

```bash
# Build và start tất cả services
docker-compose up --build

# Build lại một service cụ thể
docker-compose build backend
docker-compose build frontend

# Build và start trong background
docker-compose up --build -d
```

### Stop và cleanup

```bash
# Stop services
docker-compose stop

# Stop và remove containers
docker-compose down

# Stop, remove containers và volumes (xóa data)
docker-compose down -v
```

## Testing & Debugging

### Test API endpoints

```bash
# Health check
curl http://localhost:4000/api/health

# Register user
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get decks (thay <token> bằng token từ login)
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/decks

# Get public deck (không cần token)
curl http://localhost:4000/api/public/decks/9ZGK1X
```

### Debug scripts

```bash
# Kiểm tra public deck trong database
docker-compose exec backend node scripts/checkPublicDeck.js <publicId>

# Sửa deck nếu có publicId nhưng isPublic = false
docker-compose exec backend node scripts/fixPublicDeck.js <publicId>

# Ví dụ:
docker-compose exec backend node scripts/checkPublicDeck.js 9ZGK1X
docker-compose exec backend node scripts/fixPublicDeck.js 9ZGK1X
```

### Xem database

```bash
# Kết nối MongoDB shell
docker-compose exec mongo mongosh anki_clone

# Hoặc từ local (nếu MongoDB đang chạy)
mongosh mongodb://localhost:27017/anki_clone

# Các lệnh MongoDB hữu ích:
# > show collections
# > db.decks.find()
# > db.items.find()
# > db.cards.find()
# > db.users.find()
```

### Xem logs và debug

```bash
# Xem logs real-time
docker-compose logs -f

# Xem logs của backend
docker-compose logs -f backend

# Xem logs của frontend
docker-compose logs -f frontend

# Xem logs của MongoDB
docker-compose logs -f mongo

# Xem logs của 50 dòng cuối
docker-compose logs --tail=50 backend
```

### Restart services

```bash
# Restart một service
docker-compose restart backend
docker-compose restart frontend

# Restart tất cả
docker-compose restart
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập

### Decks
- `GET /api/decks` - List decks
- `POST /api/decks` - Create deck
- `GET /api/decks/:id` - Get deck với tree
- `PUT /api/decks/:id` - Update deck
- `POST /api/decks/:id/toggle-public` - Toggle public status
- `GET /api/decks/:id/export` - Export deck as JSON
- `POST /api/decks/import` - Import deck from JSON
- `DELETE /api/decks/:id` - Delete deck

### APKG Import
- `POST /api/apkg/import` - Import deck from Anki .apkg file (multipart/form-data)

### Media
- `POST /api/media/upload` - Upload media file (image/audio/video)
- `GET /api/media/:userId/:filename` - Serve media file (public)

### Public Decks (no auth required)
- `GET /api/public/decks/:publicId` - Get public deck by 6-character ID

### Items (Tree Structure)
- `GET /api/items/decks/:deckId/items` - Get tree structure
- `POST /api/items/decks/:deckId/items` - Create item
- `GET /api/items/:id` - Get item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item (cascade)
- `GET /api/items/:id/path` - Get item path

### Cards
- `GET /api/cards/items/:itemId/cards` - Get cards for item
- `POST /api/cards/items/:itemId/cards` - Create card (supports frontMedia, backMedia)
- `GET /api/cards/:id` - Get card
- `PUT /api/cards/:id` - Update card (supports frontMedia, backMedia)
- `DELETE /api/cards/:id` - Delete card

### Review
- `GET /api/review/today?deckId=...&itemId=...` - Get cards due today
- `POST /api/review/:cardId/result` - Submit review result (quality: 0-3)

## Tree Structure

Ứng dụng hỗ trợ cấu trúc cây phân cấp linh hoạt:

```
Deck
├── Item (root level)
│   ├── Item (level 1)
│   │   └── Item (level 2)
│   │       └── Card (chỉ ở leaf items)
│   └── Item (level 1)
│       └── Card
└── Item (root level)
    └── Card
```

- Items có thể có unlimited children
- Cards chỉ được gắn vào leaf items (items không có children)
- Tree structure được quản lý với parent-child references

## SRS Algorithm

Sử dụng SM-2 simplified algorithm:
- Quality: 0=Again, 1=Hard, 2=Good, 3=Easy
- Tự động tính interval, ease factor, và due date
- Cards được schedule dựa trên performance

## Public Deck Sharing

Mỗi deck có thể được chia sẻ công khai với link 6 ký tự unique:
- Click nút "🔒 Private" trong DeckPage để chuyển thành "🔓 Public"
- Hệ thống tự động tạo `publicId` 6 ký tự (A-Z, 0-9)
- Link format: `http://localhost:3000/public/{publicId}`
- Public deck chỉ xem được (read-only), không thể edit

## Import/Export

### Export Deck
- Click nút "📥 Export" trong DeckPage
- File JSON sẽ tự động download với format:
  ```json
  {
    "version": "1.0",
    "exportedAt": "...",
    "deck": { "title": "..." },
    "items": [...],
    "cards": [...]
  }
  ```

### Import Deck

#### Import từ JSON
- Click nút "📤 Import JSON" trong DecksPage
- Chọn file JSON đã export
- Deck mới sẽ được tạo với đầy đủ items và cards
- SRS data sẽ reset về mặc định

#### Import từ Anki .apkg
- Click nút "📦 Import APKG" trong DecksPage
- Chọn file .apkg từ Anki
- Deck mới sẽ được tạo với:
  - Tất cả cards từ Anki deck
  - Media files (images, audio, video) được tự động extract và lưu
  - Tags và metadata được preserve
  - SRS data sẽ reset về mặc định

### Media Support
- **Upload media**: Khi tạo/sửa card, có thể upload images, audio, hoặc video
- **Media types hỗ trợ**:
  - Images: JPEG, PNG, GIF, WebP
  - Audio: MP3, WAV, OGG, WebM
  - Video: MP4, WebM, OGG
- **Hiển thị**: Media tự động hiển thị trong CardList và ReviewPage
- **Storage**: Media files được lưu trong `/backend/media/{userId}/`

## Troubleshooting

### Lỗi "Public deck not found"
```bash
# Kiểm tra deck trong database
docker-compose exec backend node scripts/checkPublicDeck.js <publicId>

# Nếu deck có publicId nhưng isPublic = false, sửa bằng:
docker-compose exec backend node scripts/fixPublicDeck.js <publicId>
```

### Lỗi "Cannot connect to MongoDB"
```bash
# Kiểm tra MongoDB đang chạy
docker-compose ps mongo

# Restart MongoDB
docker-compose restart mongo

# Xem logs MongoDB
docker-compose logs mongo
```

### Frontend không load được
```bash
# Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend

# Kiểm tra nginx config
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf
```

### Backend không start
```bash
# Kiểm tra logs
docker-compose logs backend

# Kiểm tra MongoDB connection
docker-compose exec backend node -e "require('dotenv').config(); console.log(process.env.MONGO_URI)"

# Restart backend
docker-compose restart backend
```

### Lỗi "Cannot find module" (thiếu dependencies)
```bash
# Khi thêm dependencies mới, cần cài đặt lại:
docker-compose down -v  # Xóa volumes cũ
docker-compose run --rm backend npm install  # Cài dependencies
docker-compose up -d  # Khởi động lại

# Hoặc nếu chỉ cần cài dependencies mới:
docker-compose run --rm backend npm install
docker-compose restart backend
```

### Clear và reset database
```bash
# Xóa tất cả data (cẩn thận!)
docker-compose down -v
docker-compose up -d mongo
docker-compose exec backend npm run seed
```

## Common Commands Cheat Sheet

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose stop

# View logs
docker-compose logs -f

# Rebuild và restart
docker-compose up --build -d

# Seed database
docker-compose exec backend npm run seed

# Check public deck
docker-compose exec backend node scripts/checkPublicDeck.js <id>

# Access MongoDB shell
docker-compose exec mongo mongosh anki_clone

# Restart một service
docker-compose restart backend

# Cài đặt dependencies mới (sau khi thêm vào package.json)
docker-compose run --rm backend npm install
docker-compose restart backend
```

## Dependencies

### Backend Dependencies
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication
- `multer` - File upload handling
- `yauzl` - ZIP file extraction (for .apkg)
- `better-sqlite3` - SQLite database (for parsing Anki .apkg)
- `mime-types` - MIME type detection

### Frontend Dependencies
- `react` - UI framework
- `react-router-dom` - Routing
- `axios` - HTTP client

## File Structure Details

### Backend
```
backend/
├── src/
│   ├── models/          # Mongoose schemas (User, Deck, Item, Card)
│   ├── controllers/     # Request handlers
│   │   ├── authController.js
│   │   ├── deckController.js
│   │   ├── deckImportExportController.js
│   │   ├── apkgImportController.js  # Anki .apkg import
│   │   ├── itemController.js
│   │   ├── cardController.js
│   │   ├── reviewController.js
│   │   ├── publicDeckController.js
│   │   └── mediaController.js        # Media upload
│   ├── routes/          # API routes
│   ├── services/
│   │   ├── srs.js       # SM-2 algorithm
│   │   └── apkgParser.js # Parse Anki .apkg files
│   ├── utils/
│   │   ├── tree.js      # Tree utilities
│   │   └── idGenerator.js
│   ├── middleware/
│   │   └── auth.js     # JWT authentication
│   ├── app.js
│   └── index.js
├── scripts/
│   ├── seed.js         # Seed database
│   ├── checkPublicDeck.js
│   └── fixPublicDeck.js
├── uploads/            # Temporary upload directory
├── media/              # Media files storage (by userId)
└── Dockerfile
```

### Frontend
```
frontend/
├── src/
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── DecksPage.jsx
│   │   ├── DeckPage.jsx
│   │   ├── ReviewPage.jsx
│   │   └── PublicDeckPage.jsx
│   ├── components/
│   │   ├── TreeView.jsx
│   │   ├── ItemNode.jsx
│   │   ├── CardList.jsx
│   │   └── MediaDisplay.jsx  # Media display component
│   ├── api/
│   │   ├── client.js
│   │   ├── auth.js
│   │   ├── decks.js
│   │   ├── items.js
│   │   ├── cards.js
│   │   ├── review.js
│   │   ├── public.js
│   │   ├── apkg.js      # APKG import
│   │   └── media.js     # Media upload
│   └── utils/
│       └── auth.js
└── Dockerfile
```

## License

ISC

## Author

Created as a learning project

