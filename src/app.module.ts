import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './modules/users/users.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // تطبيق الـ Middleware على جميع المسارات بالمشروع، وهو سيتولى فلترة المسارات المستثناة داخلياً
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}