import { GlueJobRunService } from './glue-job-run.service';
import { TestSupport } from './test-support';
import { Glue, Request, AWSError } from 'aws-sdk';
import { v4 } from 'uuid';

describe('GlueJobRunService', () => {
  let service: GlueJobRunService;
  let glue: Glue;
  let getJobRunsMock: jest.SpyInstance<
    Request<Glue.GetJobRunsResponse, AWSError>,
    [((err: AWSError, data: Glue.GetJobRunsResponse) => void)?]
  >;
  let batchStopJobRunMock: jest.SpyInstance<
    Request<Glue.BatchStopJobRunResponse, AWSError>,
    [((err: AWSError, data: Glue.BatchStopJobRunResponse) => void)?]
  >;

  beforeEach(async () => {
    const module = await TestSupport.buildTestingModule();

    service = module.get<GlueJobRunService>(GlueJobRunService);
    glue = module.get<Glue>(Glue);

    getJobRunsMock = jest.spyOn(glue, 'getJobRuns');
    batchStopJobRunMock = jest.spyOn(glue, 'batchStopJobRun');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getAllJobRuns(): should start job', async () => {
    const jobName = 'dev-slice0';
    const mockJobRunId = v4();
    getJobRunsMock.mockReturnValueOnce(
      TestSupport.buildGetJobRunsRequest(false, true),
    );
    getJobRunsMock.mockReturnValueOnce(
      TestSupport.buildGetJobRunsRequest(true, false),
    );
    const response = await service.getAllJobRuns(jobName);
    expect(getJobRunsMock).toHaveBeenCalledTimes(2);
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

  it('getLastJobRun(): should return last job', async () => {
    const jobName = 'dev-slice0';
    const mockJobRunId = v4();
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
    const response = await service.getLastJobRun(jobName);
    expect(response.CompletedOn).toStrictEqual(
      new Date('2019-05-20T05:00:00.000Z'),
    );
    expect(getJobRunsMock).toHaveBeenCalledTimes(4);
  });

  it('getLastJobRun(): should return error null', async () => {
    const jobName = 'dev-slice0';
    const mockJobRunId = v4();
    getJobRunsMock.mockReturnValueOnce(
      TestSupport.buildGetJobRunsRequest(false, true, false),
    );
    const response = await service.getLastJobRun(jobName);
    expect(response).toBe(null);
    expect(getJobRunsMock).toHaveBeenCalledTimes(1);
  });
});
