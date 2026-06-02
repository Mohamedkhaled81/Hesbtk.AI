import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { LoggerModule } from 'nestjs-pino';
import * as path from 'path';

// Note: Do not use a static Date() variable here, 
// otherwise log rotation will fail to change the file name at midnight!
const date = new Date().toISOString().split('T')[0];
@Module({
  imports: [
    ConfigModule, 
    DatabaseModule, 
    LoggerModule.forRoot({
      pinoHttp: {
        // Logs every endpoint automatically
        autoLogging: true,
        
        // Keeps your custom local time format inside the logs
        timestamp: () => `,"time":"${new Date().toLocaleString()}"`,

        // Format successful API requests cleanly
        customSuccessMessage: function (req, res) {
          return `✅ [${req.method}] ${req.url} - Status: ${res.statusCode}`;
        },

        // Format failed API requests cleanly
        customErrorMessage: function (req, res, err) {
          return `❌ [${req.method}] ${req.url} - Failed with error: ${err.message}`;
        },

        transport: {
          targets: [
            // Target 1: Console output (pino-pretty for dev, raw JSON for prod)
            process.env.NODE_ENV !== 'production'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : { target: 'pino/file', options: { destination: 1 } }, 
            
            // Target 2: File output using pino-roll for daily rotation
            {
              target: 'pino-roll',
              options: {
                // Use %Y-%m-%d so the logger dynamically updates the date at midnight
                file: path.join('logs', `app-${date}.log`),
                size: '10m', // Roll if file exceeds 10MB
                frequency: 'daily', // Roll the file every day
                mkdir: true, // Create the 'logs' folder if it doesn't exist
              },
            },
          ],
        },
      },
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }