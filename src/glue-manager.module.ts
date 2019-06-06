import { Module, Global, HttpModule, DynamicModule } from '@nestjs/common';
import {
  GlueJobRunService,
  GlueJobService,
  GlueCrawlerService,
} from './glue-manager';
import { Glue } from 'aws-sdk';
import { GlueManagerService } from './glue-manager.service';

@Global()
@Module({
  imports: [HttpModule],
  providers: [GlueManagerService],
  exports: [GlueManagerService],
})
export class GlueManagerModule {
  static forRoot(region: string): DynamicModule {
    return {
      module: GlueManagerModule,
      providers: [
        GlueJobService,
        GlueJobRunService,
        GlueCrawlerService,
        GlueManagerService,
        { provide: Glue, useValue: new Glue({ region }) },
      ],
      exports: [GlueManagerService],
    };
  }
}
