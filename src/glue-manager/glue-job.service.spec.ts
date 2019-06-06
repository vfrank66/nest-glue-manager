import { GlueJobService } from './glue-job.service';
import { TestSupport } from './test-support';
import { Glue, Request, AWSError } from 'aws-sdk';
import { v4 } from 'uuid';

describe('GlueJobService', () => {
  let service: GlueJobService;
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
  let getJobMock: jest.SpyInstance<
    Request<Glue.GetJobResponse, AWSError>,
    [((err: AWSError, data: Glue.GetJobResponse) => void)?]
  >;
  let batchGetJobsMock: jest.SpyInstance<
    Request<Glue.BatchGetJobsResponse, AWSError>,
    [((err: AWSError, data: Glue.BatchGetJobsResponse) => void)?]
  >;
  let updateJobMock: jest.SpyInstance<
    Request<Glue.UpdateJobResponse, AWSError>,
    [((err: AWSError, data: Glue.UpdateJobResponse) => void)?]
  >;

  beforeEach(async () => {
    const module = await TestSupport.buildTestingModule();

    service = module.get<GlueJobService>(GlueJobService);
    glue = module.get<Glue>(Glue);
    listJobsMock = jest.spyOn(glue, 'listJobs');
    getJobRunsMock = jest.spyOn(glue, 'getJobRuns');
    startJobRunMock = jest.spyOn(glue, 'startJobRun');
    batchGetJobsMock = jest.spyOn(glue, 'batchGetJobs');
    getJobMock = jest.spyOn(glue, 'getJob');
    updateJobMock = jest.spyOn(glue, 'updateJob');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('fetchAllAppropriateJobs(): should fetch jobs', async () => {
    const env = 'dev';
    const jobNamePattern = 'faprod';
    const goodJobNameOne = `${env}-${jobNamePattern}-slice0`;
    const goodJobNameTwo = `${env}-${jobNamePattern}-slice1`;
    const badJobNameOne = `${env}-wrong-slice0`;
    const badJobNameTwo = `qa-${jobNamePattern}-slice0`;
    listJobsMock.mockReturnValueOnce(
      TestSupport.buildListJobsRequest(env, goodJobNameOne, true, true),
    );
    listJobsMock.mockReturnValueOnce(
      TestSupport.buildListJobsRequest(env, goodJobNameTwo, false),
    );
    const response = await service.fetchAllJobs();
    console.log(JSON.stringify(response));
    expect(listJobsMock).toHaveBeenCalledTimes(2);
    expect(response.length).toEqual(2);
    expect(response[0]).toEqual(goodJobNameOne);
    expect(response[1]).toEqual(goodJobNameTwo);
  });

  it('fetchAllJobs(): should error jobs', async () => {
    const env = 'dev';
    const jobNamePattern = 'faprod';
    const goodJobNameOne = `${env}-${jobNamePattern}-slice0`;
    const goodJobNameTwo = `${env}-${jobNamePattern}-slice1`;
    const badJobNameOne = `${env}-wrong-slice0`;
    const badJobNameTwo = `qa-${jobNamePattern}-slice0`;
    listJobsMock.mockReturnValueOnce(
      TestSupport.buildListJobsRequest(env, goodJobNameOne, true, true),
    );
    listJobsMock.mockReturnValueOnce(
      TestSupport.buildListJobsRequest(env, goodJobNameTwo, false, false),
    );
    const response = await service.fetchAllJobs();
    console.log(JSON.stringify(response));
    expect(listJobsMock).toHaveBeenCalledTimes(2);
    expect(response).toEqual({ $response: null });
  });

  it('fetchAllJobs(): should have no return bad request', async () => {
    const env = 'dev';
    const jobNamePattern = 'faprod';
    const goodJobNameOne = `${env}-${jobNamePattern}-slice0`;
    const goodJobNameTwo = `${env}-${jobNamePattern}-slice1`;
    const badJobNameOne = `${env}-wrong-slice0`;
    const badJobNameTwo = `qa-${jobNamePattern}-slice0`;
    listJobsMock.mockReturnValueOnce(
      TestSupport.buildListJobsRequest(env, goodJobNameTwo, false, false),
    );
    const response = await service.fetchAllJobs();
    console.log(JSON.stringify(response));
    expect(listJobsMock).toHaveBeenCalledTimes(1);
    expect(response).toEqual({ $response: null });
  });

  it('startJob(): should start job', async () => {
    const jobName = 'dev-slice0';
    const mockJobRunId = v4();
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
    getJobMock.mockReturnValue(TestSupport.buildGetJobRequest());
    const jobRunId = await service.startJob(jobName);
    expect(jobRunId).toEqual(mockJobRunId);
    expect(getJobMock).toHaveBeenCalledTimes(0);
    expect(startJobRunMock).toHaveBeenCalledTimes(1);
  });

  it('startJob(): should error no job', async () => {
    const jobName = 'dev-slice0';
    const mockJobRunId = v4();
    // force error
    startJobRunMock.mockReturnValue(
      TestSupport.buildStartJobRequest(mockJobRunId, false),
    );
    getJobMock.mockReturnValue(TestSupport.buildGetJobRequest());
    const jobRunId = await service.startJob(jobName);
    expect(jobRunId).toEqual(null);
    expect(getJobMock).toHaveBeenCalledTimes(0);
    expect(startJobRunMock).toHaveBeenCalledTimes(1);
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

  it('getCurrentJobSetup(): should error no job', async () => {
    const jobName = 'dev-slice0';
    // force error
    batchGetJobsMock.mockReturnValue(
      TestSupport.buildGetCurrentJobDefRequest(false),
    );
    getJobMock.mockReturnValue(TestSupport.buildGetJobRequest());
    const jobSetup = await service.getCurrentJobSetup([jobName]);
    expect(jobSetup).toBeDefined();
  });

  it('updateCurrentJob(): should return job details', async () => {
    const job = TestSupport.buildUpdateCurrentJob()[0];
    // force error
    updateJobMock.mockReturnValue(TestSupport.buildUpdateJobResponse(true));
    // getJobMock.mockReturnValue(TestSupport.buildGetJobRequest());
    const jobDetails = await service.updateCurrentJob(job);
    expect(jobDetails.JobName).toEqual('dev-generic-slice0');
  });

  it('updateCurrentJob(): should error no job', async () => {
    const job = TestSupport.buildUpdateCurrentJob()[0];
    // force error
    updateJobMock.mockReturnValue(TestSupport.buildUpdateJobResponse(false));
    // getJobMock.mockReturnValue(TestSupport.buildGetJobRequest());
    const jobSetup = await service.updateCurrentJob(job);
    expect(jobSetup).toBeDefined();
  });
});
