import { Test, TestingModule } from '@nestjs/testing';
import { Glue, Request, AWSError } from 'aws-sdk';
import {
  ListJobsResponse,
  GetJobRunsResponse,
  JobRun,
  StartJobRunResponse,
  GetJobsResponse,
  GetJobResponse,
  StartCrawlerResponse,
  UpdateJobResponse,
  BatchStopJobRunResponse,
} from 'aws-sdk/clients/glue';
import { PromiseResult } from 'aws-sdk/lib/request';
import { v4 } from 'uuid';
import { GlueJobRunService } from './glue-job-run.service';
import { GlueJobService } from './glue-job.service';
import { GlueManagerService } from '../glue-manager.service';
import { GlueCrawlerService } from './glue-crawler.service';
import { CrawlerStateReturnModel } from '.';
import { version } from 'punycode';
import { BooleanOptional } from 'aws-sdk/clients/redshift';
import { resolve } from 'url';
import { rejects } from 'assert';

export class TestSupport {
  static async buildTestingModule(): Promise<TestingModule> {
    return await Test.createTestingModule({
      providers: [
        // RunnerService,
        // GlueService,
        GlueJobRunService,
        GlueJobService,
        GlueCrawlerService,
        GlueManagerService,
        {
          provide: Glue,
          useValue: {
            startJobRun: () => null,
            batchStopJobRun: () => null,
            listJobs: () => null,
            getJobRuns: () => null,
            getJob: () => null,
            batchGetJobs: () => null,
            updateJob: () => null,
            startCrawler: () => null,
            getCrawler: () => null,
          },
        },
      ],
    }).compile();
  }

  static buildListJobsRequest(
    env: string,
    jobName: string,
    hasToken: boolean,
    isSuccessfull: boolean = true,
  ): Request<ListJobsResponse, AWSError> {
    return {
      abort: null,
      createReadStream: null,
      eachPage: null,
      isPageable: null,
      send: null,
      on: null,
      onAsync: null,
      promise: TestSupport.buildListJobsPromise(
        env,
        jobName,
        hasToken,
        isSuccessfull,
      ),
      startTime: null,
      httpRequest: null,
    };
  }

  private static buildListJobsPromise(
    env: string,
    jobName: string,
    hasToken: boolean,
    isSuccessfull: boolean,
  ): () => Promise<PromiseResult<ListJobsResponse, AWSError>> {
    const contents: PromiseResult<Glue.ListJobsResponse, AWSError> = {
      JobNames: [jobName],
      $response: null,
    };
    if (hasToken) {
      contents.NextToken = v4();
    }
    if (isSuccessfull) {
      return () =>
        new Promise<PromiseResult<ListJobsResponse, AWSError>>(resolve =>
          resolve(contents),
        );
    }
    return () => Promise.reject({ $response: null });
  }

  static buildGetJobRunsRequest(
    lastRunSuccessful: boolean,
    hasToken: boolean,
    isSuccessfull: boolean = true,
    jobRunState:
      | 'STARTING'
      | 'RUNNING'
      | 'STOPPING'
      | 'STOPPED'
      | 'SUCCEEDED'
      | 'FAILED'
      | 'TIMEOUT'
      | string = '',
  ): Request<GetJobRunsResponse, AWSError> {
    return {
      abort: null,
      createReadStream: null,
      eachPage: null,
      isPageable: null,
      send: null,
      on: null,
      onAsync: null,
      promise: TestSupport.buildGetJobRunsPromise(
        lastRunSuccessful,
        hasToken,
        isSuccessfull,
        jobRunState,
      ),
      startTime: null,
      httpRequest: null,
    };
  }

  private static buildGetJobRunsPromise(
    lastRunSuccessful: boolean,
    hasToken: boolean,
    isSuccessfull: boolean,
    jobRunState:
      | 'STARTING'
      | 'RUNNING'
      | 'STOPPING'
      | 'STOPPED'
      | 'SUCCEEDED'
      | 'FAILED'
      | 'TIMEOUT'
      | string = '',
  ): () => Promise<PromiseResult<GetJobRunsResponse, AWSError>> {
    const contents: PromiseResult<GetJobRunsResponse, AWSError> = {
      JobRuns: TestSupport.buildJobRuns(
        lastRunSuccessful,
        hasToken,
        jobRunState,
      ),
      $response: null,
    };
    if (isSuccessfull) {
      if (hasToken) {
        contents.NextToken = v4();
      }
      return () =>
        new Promise<PromiseResult<GetJobRunsResponse, AWSError>>(resolve =>
          resolve(contents),
        );
    }
    return () => Promise.reject({ message: 'it just failed' });
  }

  private static buildJobRuns(
    lastRunSuccessful: boolean,
    hasToken: boolean,
    jobRunState:
      | 'STARTING'
      | 'RUNNING'
      | 'STOPPING'
      | 'STOPPED'
      | 'SUCCEEDED'
      | 'FAILED'
      | 'TIMEOUT'
      | string = '',
  ): JobRun[] {
    const oldResponse: JobRun = {
      JobRunState: jobRunState.length == 0 ? 'FAILED' : jobRunState,
      StartedOn: new Date('2019-04-19T05:00:00.000Z'),
    };

    const mostRecentResponse: JobRun = {
      JobRunState:
        jobRunState.length == 0
          ? lastRunSuccessful
            ? 'SUCCEEDED'
            : 'FAILED'
          : jobRunState,
      StartedOn: hasToken
        ? new Date('2019-05-14T05:00:00.000Z')
        : new Date('2019-05-20T05:00:00.000Z'),
      CompletedOn: hasToken
        ? new Date('2019-05-14T05:00:00.000Z')
        : new Date('2019-05-20T05:00:00.000Z'),
      Arguments: {
        '--destinationS3Bucket': 'dev--blue-',
      },
    };
    return [oldResponse, mostRecentResponse];
  }

  static buildStartJobRequest(
    jobRunId: string,
    isSuccessfull: boolean = true,
  ): Request<StartJobRunResponse, AWSError> {
    return {
      abort: null,
      createReadStream: null,
      eachPage: null,
      isPageable: null,
      send: null,
      on: null,
      onAsync: null,
      promise: TestSupport.buildStartJobPromise(jobRunId, isSuccessfull),
      startTime: null,
      httpRequest: null,
    };
  }

  private static buildStartJobPromise(
    jobRunId: string,
    isSuccessfull: boolean = true,
  ): () => Promise<PromiseResult<StartJobRunResponse, AWSError>> {
    const contents: PromiseResult<StartJobRunResponse, AWSError> = {
      $response: null,
      JobRunId: jobRunId,
    };
    if (isSuccessfull) {
      return () =>
        new Promise<PromiseResult<StartJobRunResponse, AWSError>>(resolve =>
          resolve(contents),
        );
    }
    return () => Promise.reject({ $response: null });
  }
  static buildStopJobRequest(
    jobRunId: string,
    isSuccessfull: boolean = true,
  ): Request<BatchStopJobRunResponse, AWSError> {
    return {
      abort: null,
      createReadStream: null,
      eachPage: null,
      isPageable: null,
      send: null,
      on: null,
      onAsync: null,
      promise: TestSupport.buildStopJobPromise(jobRunId, isSuccessfull),
      startTime: null,
      httpRequest: null,
    };
  }

  private static buildStopJobPromise(
    jobRunId: string,
    isSuccessfull: boolean = true,
  ): () => Promise<PromiseResult<BatchStopJobRunResponse, AWSError>> {
    const contents: PromiseResult<BatchStopJobRunResponse, AWSError> = {
      $response: null,
      SuccessfulSubmissions: [
        {
          JobName: 'dev-job-stopped',
          JobRunId: jobRunId,
        },
        {
          JobName: 'dev-job-stopped2',
          JobRunId: jobRunId,
        },
      ],
      Errors: [],
    };
    if (isSuccessfull) {
      return () =>
        new Promise<PromiseResult<BatchStopJobRunResponse, AWSError>>(resolve =>
          resolve(contents),
        );
    }
    return () => Promise.reject({ $response: null });
  }
  static buildGetJobRequest(
    isSuccessfull: boolean = true,
  ): Request<GetJobResponse, AWSError> {
    return {
      abort: null,
      createReadStream: null,
      eachPage: null,
      isPageable: null,
      send: null,
      on: null,
      onAsync: null,
      promise: TestSupport.buildGetJobPromise(isSuccessfull),
      startTime: null,
      httpRequest: null,
    };
  }

  private static buildGetJobPromise(
    isSuccessfull: boolean,
  ): () => Promise<PromiseResult<GetJobResponse, AWSError>> {
    const contents: PromiseResult<GetJobResponse, AWSError> = {
      $response: null,
      Job: {
        DefaultArguments: {
          '--SECURITY_CONFIGURATION': 'dev',
          '--TempDir': 's3://dev-tempdir',
          '--class':
            'com.integration.GlueApplication',
          '--correlationGUID': 'X',
          '--crawlerName': 'dev-s3-blue',
          '--destinationS3Bucket':
            's3://dev-blue',
          '--enable-metrics': '',
          '--extra-jars':
            's3://resources-dev/glue-transformer.jar',
          '--fullLoad': 'true',
          '--job-bookmark-option': 'job-bookmark-disable',
          '--job-language': 'scala',
          '--jobGuid': '3402f4ba-b99e-453a-a9a8-89fed40b5c29',
          '--kinesisStreamName':
            'dev-KinesisStreams',
          '--modNumber': '0',
          '--modSlice': '0',
          '--sourceDatabaseName': 'dev-s3-blue',
        },
      },
    };
    if (isSuccessfull) {
      return () =>
        new Promise<PromiseResult<GetJobResponse, AWSError>>(resolve =>
          resolve(contents),
        );
    }
    return () => Promise.reject({ $response: null });
  }

  static buildBatchStopJobRunRequest(
    isSuccess: boolean,
  ): Request<BatchStopJobRunResponse, AWSError> {
    return {
      abort: null,
      createReadStream: null,
      eachPage: null,
      isPageable: null,
      send: null,
      on: null,
      onAsync: null,
      promise: TestSupport.buildBatchStopJobRunPromise(isSuccess),
      startTime: null,
      httpRequest: null,
    };
  }

  private static buildBatchStopJobRunPromise(
    isSuccess: boolean,
  ): () => Promise<PromiseResult<BatchStopJobRunResponse, AWSError>> {
    const contents = this.buildBatchStopJobRun(isSuccess)[0];

    return () =>
      new Promise<PromiseResult<BatchStopJobRunResponse, AWSError>>(resolve =>
        resolve(contents),
      );
  }

  private static buildBatchStopJobRun(
    isSuccess: boolean,
  ): Array<PromiseResult<BatchStopJobRunResponse, AWSError>> {
    const oldResponse: PromiseResult<BatchStopJobRunResponse, AWSError> = {
      $response: null,
      SuccessfulSubmissions: [
        {
          JobName: 'dev-generic-slice0',
          JobRunId:
            'jr_b4ca803bffe403f6bd998d66c33c1b1870a22f38b758335dbba8b0efd073592a',
        },
      ],
      Errors: undefined,
    };

    const mostRecentResponse: PromiseResult<
      BatchStopJobRunResponse,
      AWSError
    > = {
      $response: null,
      SuccessfulSubmissions: [
        {
          JobName: 'dev-generic-slice0',
          JobRunId:
            'jr_b4ca803bffe403f6bd998d66c33c1b1870a22f38b758335dbba8b0efd073592a',
        },
      ],
      Errors: [
        {
          JobName: 'dev-generic-slice0',
          JobRunId:
            'jr_b4ca803bffe403f6bd998d66c33c1b1870a22f38b758335dbba8b0efd073592a',
          ErrorDetail: {
            ErrorCode: '404',
            ErrorMessage: 'Job is not found',
          },
        },
      ],
    };
    return [oldResponse, mostRecentResponse];
  }

  // static buildBatchGetJobsRequest(
  //   isSuccessfull: boolean = false
  // ): Request<GetJobResponse, AWSError> {
  //   return {
  //     abort: null,
  //     createReadStream: null,
  //     eachPage: null,
  //     isPageable: null,
  //     send: null,
  //     on: null,
  //     onAsync: null,
  //     promise: TestSupport.buildBatchGetJobsPromise(isSuccessfull),
  //     startTime: null,
  //     httpRequest: null,
  //   };
  // }

  static buildUpdateJobRequest(
    isSuccess: boolean,
  ): Request<UpdateJobResponse, AWSError> {
    return {
      abort: null,
      createReadStream: null,
      eachPage: null,
      isPageable: null,
      send: null,
      on: null,
      onAsync: null,
      promise: TestSupport.buildUpdateJobPromise(isSuccess),
      startTime: null,
      httpRequest: null,
    };
  }

  private static buildUpdateJobPromise(
    isSuccess: boolean,
  ): () => Promise<PromiseResult<UpdateJobResponse, AWSError>> {
    const contents: PromiseResult<UpdateJobResponse, AWSError> = {
      $response: null,
      JobName: 'dev-generic-slice0',
    };

    if (isSuccess) {
      return () =>
        new Promise<PromiseResult<UpdateJobResponse, AWSError>>(resolve =>
          resolve(contents),
        );
    }
    contents.JobName = undefined;
    return () =>
      new Promise<PromiseResult<UpdateJobResponse, AWSError>>(reject =>
        reject(contents),
      );
  }

  static buildStartCrawlerRequest(
    isSuccess: boolean,
  ): Request<Glue.Types.StartCrawlerResponse, AWSError> {
    return {
      abort: null,
      createReadStream: null,
      eachPage: null,
      isPageable: null,
      send: null,
      on: null,
      onAsync: null,
      promise: TestSupport.buildStartCrawlerPromise(isSuccess),
      startTime: null,
      httpRequest: null,
    };
  }

  private static buildStartCrawlerPromise(
    isSuccess: boolean,
  ): () => Promise<PromiseResult<StartCrawlerResponse, AWSError>> {
    const contents: PromiseResult<StartCrawlerResponse, AWSError> = {
      $response: null,
    };
    if (isSuccess) {
      return () =>
        new Promise<PromiseResult<StartCrawlerResponse, AWSError>>(resolve =>
          resolve(contents),
        );
    }
    return () => Promise.reject({ $response: null });
  }

  static buildGetCrawlerRequest(
    isSuccess: boolean,
    crawlerStatus: 'RUNNING' | 'STOPPING' | 'READY' | string,
  ): Request<Glue.Types.GetCrawlerResponse, AWSError> {
    return {
      abort: null,
      createReadStream: null,
      eachPage: null,
      isPageable: null,
      send: null,
      on: null,
      onAsync: null,
      promise: TestSupport.buildGetCrawlerPromise(isSuccess, crawlerStatus),
      startTime: null,
      httpRequest: null,
    };
  }

  private static buildGetCrawlerPromise(
    isSuccess: boolean,
    crawlerStatus: 'RUNNING' | 'STOPPING' | 'READY' | string,
  ): () => Promise<PromiseResult<Glue.Types.GetCrawlerResponse, AWSError>> {
    const contents: PromiseResult<Glue.Types.GetCrawlerResponse, AWSError> = {
      $response: null,
      Crawler: this.buildGetCrawler(crawlerStatus)[0],
    };
    if (isSuccess) {
      return () =>
        new Promise<PromiseResult<Glue.Types.GetCrawlerResponse, AWSError>>(
          resolve => resolve(contents),
        );
    }
    return () =>
      new Promise<PromiseResult<Glue.Types.GetCrawlerResponse, AWSError>>(
        reject => reject(contents),
      );
  }

  private static buildGetCrawler(
    crawlerStatus: 'RUNNING' | 'STOPPING' | 'READY' | string,
  ): Glue.Crawler[] {
    const oldResponse: Glue.Crawler = {
      Name: 'dev-s3-blue',
      Role: 'GlueIntake-dev',
      Targets: {
        S3Targets: [
          {
            Path: 's3://dev-blue-/',
            Exclusions: [],
          },
        ],
        JdbcTargets: [],
        DynamoDBTargets: [],
        CatalogTargets: [],
      },
      DatabaseName: 'dev-s3-blue',
      Description:
        'AWS Glue S3 crawler to crawl s3://dev-blue/ in dev environment',
      Classifiers: [],
      SchemaChangePolicy: {
        UpdateBehavior: 'UPDATE_IN_DATABASE',
        DeleteBehavior: 'DELETE_FROM_DATABASE',
      },
      State: crawlerStatus,
      CrawlElapsedTime: 0,
      CreationTime: new Date('2019-05-01T13:27:38.000Z'),
      LastUpdated: new Date('2019-05-03T00:42:57.000Z'),
      LastCrawl: {
        Status: 'SUCCEEDED',
        LogGroup: '/aws-glue/crawlers',
        LogStream: 'dev-s3-blue',
        MessagePrefix: 'df0304ba-b689-4cf8-a2ab-0be5c72aa442',
        StartTime: new Date('2019-06-05T14:10:09.000Z'),
      },
      Version: 2,
    };

    const mostRecentResponse: Glue.Crawler = {
      Name: 'dev-s3-blue',
      Role: 'GlueIntake-dev',
      Targets: {
        S3Targets: [
          {
            Path: 's3://dev-blue/',
            Exclusions: [],
          },
        ],
        JdbcTargets: [],
        DynamoDBTargets: [],
        CatalogTargets: [],
      },
      DatabaseName: 'dev-s3-blue',
      Description:
        'AWS Glue S3 crawler to crawl s3://dev-blue/ in dev environment',
      Classifiers: [],
      SchemaChangePolicy: {
        UpdateBehavior: 'UPDATE_IN_DATABASE',
        DeleteBehavior: 'DELETE_FROM_DATABASE',
      },
      State: 'READY',
      CrawlElapsedTime: 0,
      CreationTime: new Date('2019-05-01T13:27:38.000Z'),
      LastUpdated: new Date('2019-05-03T00:42:57.000Z'),
      LastCrawl: {
        Status: 'SUCCEEDED',
        LogGroup: '/aws-glue/crawlers',
        LogStream: 'dev-s3-blue',
        MessagePrefix: 'df0304ba-b689-4cf8-a2ab-0be5c72aa442',
        StartTime: new Date('2019-06-05T14:10:09.000Z'),
      },
      Version: 2,
    };

    return [oldResponse, mostRecentResponse];
  }

  static buildGetCurrentJobDefRequest(
    isSuccess: boolean,
  ): Request<Glue.Types.BatchGetJobsResponse, AWSError> {
    return {
      abort: null,
      createReadStream: null,
      eachPage: null,
      isPageable: null,
      send: null,
      on: null,
      onAsync: null,
      promise: TestSupport.buildGetCurrentJobDefPromise(isSuccess),
      startTime: null,
      httpRequest: null,
    };
  }

  private static buildGetCurrentJobDefPromise(
    isSuccess: boolean,
  ): () => Promise<PromiseResult<Glue.Types.BatchGetJobsResponse, AWSError>> {
    const data = this.buildGetCurrentJobDefArguments()[0];

    const contents: PromiseResult<Glue.Types.BatchGetJobsResponse, AWSError> = {
      $response: null,
      Jobs: data.Jobs,
      JobsNotFound: data.JobsNotFound,
    };

    if (isSuccess) {
      return () =>
        new Promise<PromiseResult<Glue.Types.BatchGetJobsResponse, AWSError>>(
          resolve => resolve(contents),
        );
    }
    return () => Promise.reject({ $response: null, message: 'it just failed' });
  }

  private static buildGetCurrentJobDefArguments(): Glue.BatchGetJobsResponse[] {
    const oldResponse: Glue.BatchGetJobsResponse = {
      Jobs: [
        {
          Name: 'dev-generic-slice0',
          Role: 'arn:aws:iam:::role/GlueIntake-dev',
          CreatedOn: new Date('2019-05-01T13:27:45.346Z'),
          LastModifiedOn: new Date('2019-05-30T21:15:24.074Z'),
          ExecutionProperty: {
            MaxConcurrentRuns: 1,
          },
          Command: {
            Name: 'glueetl',
            ScriptLocation:
              's3://resources-dev/GlueIntakeApplication.scala',
          },
          DefaultArguments: {
            '--SECURITY_CONFIGURATION': 'dev',
            '--TempDir': 's3://dev-tempdir',
            '--class':
              'com..ateway.GlueIntakeApplication',
            '--correlationGUID': 'X',
            '--crawlerName': 'dev-s3-blue',
            '--destinationS3Bucket':
              's3://dev-blue-',
            '--enable-metrics': '',
            '--extra-jars':
              's3://resources-dev-/glue-transformer.jar',
            '--fullLoad': 'true',
            '--job-bookmark-option': 'job-bookmark-disable',
            '--job-language': 'scala',
            '--jobGuid': '3402f4ba-b99e-453a-a9a8-89fed40b5c29',
            '--kinesisStreamName':
              'dev--KinesisIntake-',
            '--modNumber': '0',
            '--modSlice': '0',
            '--sourceDatabaseName': 'dev-s3-blue',
          },
          Connections: undefined,
          MaxRetries: 0,
          AllocatedCapacity: 10,
          Timeout: 2880,
          MaxCapacity: 10,
        },
      ],
      JobsNotFound: [],
    };
    const mostRecentResponse: Glue.BatchGetJobsResponse = {
      Jobs: [
        {
          Name: 'dev-generic-slice0',
          Role: 'arn:aws:iam:::role/GlueIntake-dev',
          CreatedOn: new Date('2019-05-01T13:27:45.346Z'),
          LastModifiedOn: new Date('2019-05-30T21:15:24.074Z'),
          ExecutionProperty: {
            MaxConcurrentRuns: 1,
          },
          Command: {
            Name: 'glueetl',
            ScriptLocation:
              's3://resources-dev-/cloudformation/GlueIntakeApplication.scala',
          },
          DefaultArguments: {
            '--SECURITY_CONFIGURATION': 'dev',
            '--TempDir': 's3://dev-tempdir-',
            '--class':
              'com..gateway.GlueIntakeApplication',
            '--correlationGUID': 'X',
            '--crawlerName': 'dev-s3-blue',
            '--destinationS3Bucket':
              's3://dev-blue-',
            '--enable-metrics': '',
            '--extra-jars':
              's3://resources-dev-/glue-transformer.jar',
            '--fullLoad': 'true',
            '--job-bookmark-option': 'job-bookmark-disable',
            '--job-language': 'scala',
            '--jobGuid': '3402f4ba-b99e-453a-a9a8-89fed40b5c29',
            '--kinesisStreamName':
              'dev-LCSKinesisStreams-1AX5UY6ZSV2HW-LCSKinesisIntake-1PYRQAPX50VCU',
            '--modNumber': '0',
            '--modSlice': '0',
            '--sourceDatabaseName': 'dev-s3-blue',
          },
          Connections: undefined,
          MaxRetries: 0,
          AllocatedCapacity: 10,
          Timeout: 2880,
          MaxCapacity: 10,
        },
      ],
      JobsNotFound: [],
    };
    return [oldResponse, mostRecentResponse];
  }

  static buildUpdateJobResponse(
    isSuccess: boolean,
  ): Request<Glue.Types.StartCrawlerResponse, AWSError> {
    return {
      abort: null,
      createReadStream: null,
      eachPage: null,
      isPageable: null,
      send: null,
      on: null,
      onAsync: null,
      promise: TestSupport.buildUpdateCurrentJobRequest(isSuccess),
      startTime: null,
      httpRequest: null,
    };
  }

  private static buildUpdateCurrentJobRequest(
    isSuccessfull: boolean = true,
  ): () => Promise<PromiseResult<Glue.UpdateJobResponse, AWSError>> {
    const data = this.buildUpdateCurrentJob()[0];

    const contents: PromiseResult<Glue.UpdateJobResponse, AWSError> = {
      $response: null,
      JobName: data.Name,
    };

    if (isSuccessfull) {
      return () =>
        new Promise<PromiseResult<Glue.UpdateJobResponse, AWSError>>(resolve =>
          resolve(contents),
        );
    }
    return () => Promise.reject({ $response: null, message: 'it just failed' });
  }

  public static buildUpdateCurrentJob(): Glue.Job[] {
    const firstResponse: Glue.Job = {
      Name: 'dev-generic-slice0',
      Role: 'arn:aws:iam:::role/GlueIntake-dev',
      CreatedOn: new Date('2019-05-01T13:27:45.346Z'),
      LastModifiedOn: new Date('2019-05-30T21:15:24.074Z'),
      ExecutionProperty: {
        MaxConcurrentRuns: 1,
      },
      Command: {
        Name: 'glueetl',
        ScriptLocation:
          's3://resources-dev-/cloudformation/GlueIntakeApplication.scala',
      },
      DefaultArguments: {
        '--SECURITY_CONFIGURATION': 'dev',
        '--TempDir': 's3://dev-tempdir-',
        '--class':
          'com..gateway.GlueIntakeApplication',
        '--correlationGUID': 'X',
        '--crawlerName': 'dev-s3-blue',
        '--destinationS3Bucket': 's3://dev-blue-',
        '--enable-metrics': '',
        '--extra-jars':
          's3://resources-dev-/cloudformation/glue-transformer.jar',
        '--fullLoad': 'true',
        '--job-bookmark-option': 'job-bookmark-disable',
        '--job-language': 'scala',
        '--jobGuid': '3402f4ba-b99e-453a-a9a8-89fed40b5c29',
        '--kinesisStreamName':
          'dev-LCSKinesisStreams-1AX5UY6ZSV2HW-LCSKinesisIntake-1PYRQAPX50VCU',
        '--modNumber': '0',
        '--modSlice': '0',
        '--sourceDatabaseName': 'dev-s3-blue',
      },
    };
    return [firstResponse];
  }
}
