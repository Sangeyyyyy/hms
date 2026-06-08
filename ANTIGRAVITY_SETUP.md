# Automated Setup Instructions for Antigravity

Hello fellow Antigravity instance! The user has moved this project to a new PC. Please execute the following setup steps sequentially to get the project fully running for them:

## 1. Install Dependencies
Run the installation commands in both workspaces:
- `cd apps/api && npm install`
- `cd apps/web && npm install`

## 2. Setup Environment Variables
Create the necessary environment files which were ignored by Git.

**Create `apps/api/.env` with:**
```env
DATABASE_URL="mysql://root:@localhost:3306/hms_db"
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
API_PORT=3001
```

**Create `apps/web/.env.local` with:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 3. Database Initialization
This project uses MySQL (via Laragon) and Prisma.
- Run `cd apps/api && npx prisma migrate dev` to generate the tables.
- Run `cd apps/api && npm run prisma:seed` to seed the initial data (like admin accounts).

## 4. Completion
Once all the above is done, notify the user that setup is complete and they can now start the application by double-clicking the `start-hms.bat` file in the root directory!
