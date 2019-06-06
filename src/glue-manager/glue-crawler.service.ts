import { Injectable, Logger } from '@nestjs/common';
import { Glue, AWSError } from 'aws-sdk';
import { CrawlerStateReturnModel } from '.';

@Injectable()
export class GlueCrawlerService {
  private readonly logger: Logger;

  constructor(private readonly glueClient: Glue) {
    this.logger = new Logger(GlueCrawlerService.name);
  }

  public async startCrawler(
    crawlerName: string,
  ): Promise<CrawlerStateReturnModel> {
    const crawlerStatus = await this.getCrawler(crawlerName);
    if (crawlerStatus === undefined) {
      this.logger.log(`Could not find crawler`);
      return { crawlerStarted: false };
    }
    if (
      crawlerStatus.Crawler.State === 'RUNNING' ||
      crawlerStatus.Crawler.State === 'STOPPING'
    ) {
      this.logger.log(
        `Could not start crawler [${crawlerName}] crawler is already in STATE [${
          crawlerStatus.Crawler.State
        }]`,
      );
      return { crawlerStarted: false };
    }
    return this.glueClient
      .startCrawler({
        Name: crawlerName,
      })
      .promise()
      .then(data => {
        return { crawlerStarted: true };
      })
      .catch(err => {
        this.logger.error(`Failed to start crawler [${crawlerName}]`);
        this.logger.error(err);
        return { crawlerStarted: false };
      });
  }

  public async getCrawler(
    crawlerName: string,
  ): Promise<Glue.Types.GetCrawlerResponse> {
    try {
      return await this.glueClient
        .getCrawler({
          Name: crawlerName,
        })
        .promise();
    } catch (err) {
      this.logger.error(`Failed to get crawler [${crawlerName}] info`);
      this.logger.error(err);
    }
  }
}
