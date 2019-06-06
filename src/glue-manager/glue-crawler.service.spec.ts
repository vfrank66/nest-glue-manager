import { GlueCrawlerService } from './glue-crawler.service';
import { TestSupport } from './test-support';
import { Glue, Request, AWSError } from 'aws-sdk';

describe('GlueCrawlerService', () => {
  let service: GlueCrawlerService;
  let glue: Glue;
  let getCrawlerMock: jest.SpyInstance<
    Request<Glue.GetCrawlerResponse, AWSError>,
    [((err: AWSError, data: Glue.GetCrawlerResponse) => void)?]
  >;
  let startCrawlerMock: jest.SpyInstance<
    Request<Glue.StartCrawlerResponse, AWSError>,
    [((err: AWSError, data: Glue.StartCrawlerResponse) => void)?]
  >;
  beforeEach(async () => {
    const module = await TestSupport.buildTestingModule();

    service = module.get<GlueCrawlerService>(GlueCrawlerService);
    glue = module.get<Glue>(Glue);
    getCrawlerMock = jest.spyOn(glue, 'getCrawler');
    startCrawlerMock = jest.spyOn(glue, 'startCrawler');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('startCrawler(): should start crawler', async () => {
    const crawlerName = 'dev-s3-blue';
    getCrawlerMock.mockReturnValueOnce(
      TestSupport.buildGetCrawlerRequest(true, 'READY'),
    );
    startCrawlerMock.mockReturnValueOnce(
      TestSupport.buildStartCrawlerRequest(true),
    );

    const response = await service.startCrawler(crawlerName);
    expect(getCrawlerMock).toHaveBeenCalledTimes(1);
    expect(response.crawlerStarted).toEqual(true);
  });

  it('startCrawler(): should fail on already running crawler', async () => {
    const crawlerName = 'dev-s3-blue';
    getCrawlerMock.mockReturnValueOnce(
      TestSupport.buildGetCrawlerRequest(true, 'RUNNING'),
    );
    startCrawlerMock.mockReturnValueOnce(
      TestSupport.buildStartCrawlerRequest(true),
    );

    const response = await service.startCrawler(crawlerName);
    expect(getCrawlerMock).toHaveBeenCalledTimes(1);
    expect(startCrawlerMock).toHaveBeenCalledTimes(0);
    expect(response.crawlerStarted).toEqual(false);
  });

  it('startCrawler(): should fail return on crawler not found', async () => {
    const crawlerName = 'dev-s3-blue';
    getCrawlerMock.mockReturnValueOnce(undefined);
    startCrawlerMock.mockReturnValueOnce(
      TestSupport.buildStartCrawlerRequest(true),
    );

    const response = await service.startCrawler(crawlerName);
    expect(getCrawlerMock).toHaveBeenCalledTimes(1);
    expect(startCrawlerMock).toHaveBeenCalledTimes(0);
    expect(response.crawlerStarted).toEqual(false);
  });

  it('startCrawler(): should error on crawler not found', async () => {
    const crawlerName = 'dev-s3-blue';
    // allow code to proceed through first call
    getCrawlerMock.mockReturnValueOnce(
      TestSupport.buildGetCrawlerRequest(true, 'READY'),
    );
    startCrawlerMock.mockReturnValueOnce(
      TestSupport.buildStartCrawlerRequest(false),
    );

    const response = await service.startCrawler(crawlerName);
    expect(getCrawlerMock).toHaveBeenCalledTimes(1);
    expect(startCrawlerMock).toHaveBeenCalledTimes(1);
    expect(response.crawlerStarted).toEqual(false);
  });
  it('getCrawler(): should retrieve crawler', async () => {
    const crawlerName = 'dev-s3-blue';
    getCrawlerMock.mockReturnValueOnce(
      TestSupport.buildGetCrawlerRequest(true, 'READY'),
    );
    getCrawlerMock.mockReturnValueOnce(
      TestSupport.buildGetCrawlerRequest(true, 'READY'),
    );
    const response = await service.getCrawler(crawlerName);
    expect(getCrawlerMock).toHaveBeenCalledTimes(1);
    expect(response.Crawler.Name).toEqual('dev-s3-blue');
  });
});
