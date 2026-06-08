import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FacilitiesModule } from './facilities/facilities.module';
import { ReservationsModule } from './reservations/reservations.module';
import { CheckinModule } from './checkin/checkin.module';
import { InventoryModule } from './inventory/inventory.module';
import { ReportsModule } from './reports/reports.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';

@Module({
  imports: [
    // ── Configuration ─────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig],
      envFilePath: ['.env'],
      cache: true,
    }),

    // ── Database ──────────────────────────────────────────
    PrismaModule,

    // ── Feature Modules ───────────────────────────────────
    AuthModule,
    UsersModule,
    FacilitiesModule,
    ReservationsModule,
    CheckinModule,
    InventoryModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // ── Global JWT Guard ──────────────────────────────────
    // All routes are protected by default; use @Public() to opt out
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
