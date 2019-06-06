import { Injectable, Logger } from '@nestjs/common';
import { Glue, AWSError } from 'aws-sdk';
import {
  StartJobRunRequest,
  GetJobRunsRequest,
  JobRun,
} from 'aws-sdk/clients/glue';

@Injectable()
export class GlueJobRunService {
  private readonly logger: Logger;

  constructor(private readonly glueClient: Glue) {
    this.logger = new Logger(GlueJobRunService.name);
  }

  public async getJobRuns(
    request: GetJobRunsRequest,
  ): Promise<{ jobRuns: JobRun[]; nextToken: string }> {
    try {
      const response = await this.glueClient.getJobRuns(request).promise();
      const runs = response.JobRuns.map(x => {
        x.StartedOn = new Date(x.StartedOn);
        x.CompletedOn = new Date(x.CompletedOn);
        return x;
      });
      return { jobRuns: runs, nextToken: response.NextToken };
    } catch (err) {
      this.logger.error(
        `Error in getJobRuns fetching job runs for job: ${request.JobName}
        ${(err as AWSError).message}`,
      );
      return null;
    }
  }

  public async getAllJobRuns(jobName: string): Promise<JobRun[]> {
    let runs: JobRun[];
    const request: GetJobRunsRequest = {
      JobName: jobName,
      MaxResults: 200,
    };
    let response = await this.getJobRuns(request);
    if (!response) {
      return null;
    }
    runs = response.jobRuns;
    while (response && response.nextToken) {
      request.NextToken = response.nextToken;
      response = await this.getJobRuns(request);
      if (response === null) {
        break;
      }
      runs = runs.concat(response.jobRuns);
    }
    return runs;
  }

  public async getLastJobRun(jobName: string): Promise<JobRun> {
    const runs = await this.getAllJobRuns(jobName);
    if (runs && runs.length > 0) {
      runs.sort((a, b) => b.StartedOn.getTime() - a.StartedOn.getTime());
      const mostRecentRun = runs[0];
      // this.lastJobRunCache[jobName] = mostRecentRun;
      return mostRecentRun;
    }
    return null;
  }

  public async stopJobRuns(jobs: Glue.BatchStopJobRunRequest[]): Promise<any> {
    const responses: Glue.BatchStopJobRunResponse[] = [];
    for (const job of jobs) {
      try {
        responses.push(await this.glueClient.batchStopJobRun(job).promise());
      } catch (err) {
        this.logger.error(
          `Failed to stop job ${
            job.JobName
          } with job id(s): ${job.JobRunIds.join(' ')}`,
        );
        this.logger.error(err);
      }
    }
    return responses;
  }

  public async stopJobRun(
    job: Glue.BatchStopJobRunRequest,
  ): Promise<Glue.BatchStopJobRunResponse[]> {
    const responses: Glue.BatchStopJobRunResponse[] = [];
    try {
      responses.push(await this.glueClient.batchStopJobRun(job).promise());
    } catch (err) {
      this.logger.error(
        `Failed to stop job ${job.JobName} with job id(s): ${job.JobRunIds.join(
          ' ',
        )}`,
      );
      this.logger.error(err);
    }

    return responses;
  }
}
