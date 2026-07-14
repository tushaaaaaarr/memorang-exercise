# PostgreSQL Setup Guide for Memorang AI

## Quick Setup (Windows)

### Option 1: Using PostgreSQL Installer (Recommended for Windows)

1. **Download PostgreSQL**
   - Visit: https://www.postgresql.org/download/windows/
   - Download PostgreSQL 14+ installer

2. **Run Installer**
   - Accept default installation path
   - Set superuser password: `postgres` (or your choice)
   - Accept port 5432 (default)
   - Select "Stack Builder" at end if you want additional tools

3. **Verify Installation**
   ```powershell
   psql -U postgres -c "SELECT version();"
   ```
   - Enter password when prompted
   - Should see PostgreSQL version info

4. **Create Database**
   ```powershell
   psql -U postgres -c "CREATE DATABASE memorang_ai;"
   ```

5. **Update .env**
   ```env
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/memorang_ai
   ```

---

## Option 2: Using WSL2 (Windows Subsystem for Linux)

1. **Install PostgreSQL in WSL**
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   ```

2. **Start PostgreSQL Service**
   ```bash
   sudo service postgresql start
   ```

3. **Create Database**
   ```bash
   sudo -u postgres createdb memorang_ai
   ```

4. **Update .env**
   ```env
   DATABASE_URL=postgresql://postgres@localhost:5432/memorang_ai
   ```

---

## Option 3: Using Docker (Easiest)

1. **Install Docker Desktop** from https://www.docker.com/products/docker-desktop

2. **Create PostgreSQL Container**
   ```powershell
   docker run --name memorang-postgres `
     -e POSTGRES_PASSWORD=postgres `
     -e POSTGRES_DB=memorang_ai `
     -p 5432:5432 `
     -d postgres:15-alpine
   ```

3. **Update .env**
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/memorang_ai
   ```

4. **Verify Connection**
   ```powershell
   docker exec -it memorang-postgres psql -U postgres -d memorang_ai -c "SELECT 1;"
   ```

---

## Option 4: Cloud Database (No Local Install)

Use a cloud provider for PostgreSQL:

- **Railway.app**: https://railway.app/ (Free tier available)
- **Supabase**: https://supabase.com/ (PostgreSQL as a service)
- **Heroku Postgres**: https://www.heroku.com/postgres

Copy the connection string and paste into `.env`:
```env
DATABASE_URL=postgresql://user:password@host:port/database
```

---

## Setup Memorang AI After Database

Once PostgreSQL is running:

1. **Install Dependencies**
   ```powershell
   npm install
   ```

2. **Generate Prisma Client**
   ```powershell
   npx prisma generate
   ```

3. **Create Database Schema**
   ```powershell
   npx prisma migrate dev --name init
   ```

4. **Start Development Server**
   ```powershell
   npm run dev
   ```

5. **Open in Browser**
   - Go to http://localhost:3000

---

## Troubleshooting

### "Connection refused" error
- Check if PostgreSQL service is running
- Verify DATABASE_URL in .env
- Ensure port 5432 is not blocked by firewall

### "Database does not exist"
```powershell
psql -U postgres -c "CREATE DATABASE memorang_ai;"
```

### "Role 'postgres' does not exist"
```powershell
# Use default Windows user
psql -U <your-windows-username> -d postgres -c "CREATE DATABASE memorang_ai;"
```

### Reset Database (Development Only)
```powershell
npx prisma migrate reset
```
This will drop all data and recreate schema.

---

## Verify Setup

Run this to test the database connection:
```powershell
npx prisma db push
```

If successful, you'll see:
```
✔ Database synced with schema
```

## Next Steps

- [ ] Database setup complete
- [ ] Run `npm run dev`
- [ ] Upload a PDF to test the full flow
- [ ] Check database with: `npx prisma studio`
