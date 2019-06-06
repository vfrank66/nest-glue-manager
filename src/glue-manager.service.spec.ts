import { GlueManagerService } from './glue-manager.service';
import { TestSupport } from './glue-manager/test-support';
import { Glue, Request, AWSError } from 'aws-sdk';
import { v4 } from 'uuid';

describe('GlueManagerService', () => {
  let service: GlueManagerService;
  let glue: Glue;
  let listJobsMock: jest.SpyInstance<
    Request<Glue.ListJobsResponse, AWSError>,
    [((err: AWSError, data: Glue.ListJobsResponse) => void)?]
  >;
  let getJobRunsMock: jest.SpyInstance<
    Request<Glue.GetJobRunsResponse, AWSError>,
    [((err: AWSError, data: Glue.GetJobRunsResponse) => void)?]
  >;
  let startJobRunMock: jest.SpyInstance<
    Request<Glue.StartJobRunResponse, AWSError>,
    [((err: AWSError, data: Glue.StartJobRunResponse) => void)?]
  >;
  let stopJobRunMock: jest.SpyInstance<
    Request<Glue.BatchStopJobRunResponse, AWSError>,
    [((err: AWSError, data: Glue.BatchStopJobRunResponse) => void)?]
  >;
  let batchGetJobsMock: jest.SpyInstance<
    Request<Glue.BatchGetJobsResponse, AWSError>,
    [((err: AWSError, data: Glue.BatchGetJobsResponse) => void)?]
  >;
  let getJobMock: jest.SpyInstance<
    Request<Glue.GetJobResponse, AWSError>,
    [((err: AWSError, data: Glue.GetJobResponse) => void)?]
  >;
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

    service = module.get<GlueManagerService>(GlueManagerService);
    glue = module.get<Glue>(Glue);
    listJobsMock = jest.spyOn(glue, 'listJobs');
    getJobRunsMock = jest.spyOn(glue, 'getJobRuns');
    startJobRunMock = jest.spyOn(glue, 'startJobRun');
    stopJobRunMock = jest.spyOn(glue, 'batchStopJobRun');
    batchGetJobsMock = jest.spyOn(glue, 'batchGetJobs');
    getJobMock = jest.spyOn(glue, 'getJob');
    getCrawlerMock = jest.spyOn(glue, 'getCrawler');
    startCrawlerMock = jest.spyOn(glue, 'startCrawler');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getDefaultArguments(): should return job details', async () => {
    const jobName = 'dev-slice0';
    // force error
    getJobMock.mockReturnValue(TestSupport.buildGetJobRequest(true));
    const jobDetails = await service.getJobArguments(jobName);
    expect(jobDetails['--class']).toEqual(
      'com.integration.GlueApplication',
    );
    expect(jobDetails['--modNumber']).toEqual('0');
    expect(getJobMock).toHaveBeenCalledTimes(1);
  });

  it('getCurrentJobSetup(): should return job details', async () => {
    const jobName = 'dev-slice0';
    // force error
    batchGetJobsMock.mockReturnValue(
      TestSupport.buildGetCurrentJobDefRequest(true),
    );
    getJobMock.mockReturnValue(TestSupport.buildGetJobRequest());
    const jobDetails = await service.getCurrentJobSetup([jobName]);
    expect(jobDetails.Jobs[0].Name).toEqual('dev-generic-slice0');
    expect(jobDetails.JobsNotFound.length).toBe(0);
    expect(batchGetJobsMock).toHaveBeenCalledTimes(1);
  });

  it('startJobs(): should fetch jobs', async () => {
    const env = 'dev';
    const jobNamePattern = 'faprod';
    const goodJobNameOne = `${env}-${jobNamePattern}-slice0`;
    const goodJobNameTwo = `${env}-${jobNamePattern}-slice1`;
    const mockJobRunId = v4();

    // fetchAllAppropriateJobs
    listJobsMock.mockReturnValueOnce(
      TestSupport.buildListJobsRequest(env, goodJobNameOne, true, true),
    );
    listJobsMock.mockReturnValueOnce(
      TestSupport.buildListJobsRequest(env, goodJobNameTwo, false),
    );
    // isJobRunnable
    getJobRunsMock.mockReturnValueOnce(
      TestSupport.buildGetJobRunsRequest(false, true, true),
    );
    getJobRunsMock.mockReturnValueOnce(
      TestSupport.buildGetJobRunsRequest(false, true, true),
    );
    getJobRunsMock.mockReturnValueOnce(
      TestSupport.buildGetJobRunsRequest(false, true, true),
    );
    getJobRunsMock.mockReturnValueOnce(
      TestSupport.buildGetJobRunsRequest(false, false, true),
    );
    // startJob
    getJobRunsMock.mockReturnValueOnce(
      TestSupport.buildGetJobRunsRequest(true, false),
    );
    getJobRunsMock.mockReturnValueOnce(
      TestSupport.buildGetJobRunsRequest(false, true),
    );
    getJobRunsMock.mockReturnValueOnce(
      TestSupport.buildGetJobRunsRequest(true, false),
    );
    startJobRunMock.mockReturnValue(
      TestSupport.buildStartJobRequest(mockJobRunId),
    );
    const response = await service.startJobs(env, jobNamePattern);
    console.log(JSON.stringify(response));
    expect(listJobsMock).toHaveBeenCalledTimes(2);
    expect(response.length).toEqual(2);
    expect(getJobRunsMock).toHaveBeenCalledTimes(5);
    expect(startJobRunMock).toHaveBeenCalledTimes(2);
  });

  it('isJobRunnable(): should return false', async () => {
    const jobName = 'dev-jobname';
    // isJobRunnable
    getJobRunsMock.mockReturnValueOnce(
      TestSupport.buildGetJobRunsRequest(false, false, true, 'STOPPING'),
    );
    const response = await service.isJobRunnable(jobName);
    expect(response.runnable).toBe(false);
    expect(getJobRunsMock).toHaveBeenCalledTimes(1);
  });

  it('startJob(): should fetch jobs', async () => {
    const jobName = 'dev';
    const mockJobRunId = v4();
    // startJob
    getJobRunsMock.mockReturnValueOnce(
      TestSupport.buildGetJobRunsRequest(true, true),
    );
    getJobRunsMock.mockReturnValueOnce(
      TestSupport.buildGetJobRunsRequest(false, true),
    );
    getJobRunsMock.mockReturnValueOnce(
      TestSupport.buildGetJobRunsRequest(true, false),
    );
    startJobRunMock.mockReturnValue(
      TestSupport.buildStartJobRequest(mockJobRunId),
    );
    const response = await service.startJob(jobName);
    expect(response).toBe(mockJobRunId);
    expect(getJobRunsMock).toHaveBeenCalledTimes(3);
    expect(startJobRunMock).toHaveBeenCalledTimes(1);
  });

  it('stopJobs(): should stop jobs', async () => {
    const jobName = 'dev';
    const mockJobRunId = v4();
    // stopJob
    getJobRunsMock.mockReturnValueOnce(
      TestSupport.buildGetJobRunsRequest(true, true),
    );
    stopJobRunMock.mockReturnValue(
      TestSupport.buildStopJobRequest(mockJobRunId),
    );
    const response = await service.stopJobs([jobName]);
    expect(response[0].SuccessfulSubmissions[0].JobRunId).toBe(mockJobRunId);
    expect(getJobRunsMock).toHaveBeenCalledTimes(2);
    expect(stopJobRunMock).toHaveBeenCalledTimes(1);
  });
  it('stopJob(): should stop jobs', async () => {
    const jobName = 'dev';
    const mockJobRunId = v4();
    // stopJob
    getJobRunsMock.mockReturnValueOnce(
      TestSupport.buildGetJobRunsRequest(true, true),
    );
    stopJobRunMock.mockReturnValue(
      TestSupport.buildStopJobRequest(mockJobRunId),
    );
    const response = await service.stopJob(jobName);
    expect(response[0].SuccessfulSubmissions[0].JobRunId).toBe(mockJobRunId);
    expect(getJobRunsMock).toHaveBeenCalledTimes(2);
    expect(stopJobRunMock).toHaveBeenCalledTimes(1);
  });

  it('getAllJobRuns(): should start job', async () => {
    const jobName = 'dev-slice0';
    const mockJobRunId = v4();
    getJobRunsMock.mockReturnValueOnce(
      TestSupport.buildGetJobRunsRequest(false, false, false),
    );
    const response = await service.getAllJobRuns(jobName);
    expect(getJobRunsMock).toHaveBeenCalledTimes(1);
    expect(response).toBe(null);
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
