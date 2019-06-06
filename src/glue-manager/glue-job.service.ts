import { Injectable, Logger } from '@nestjs/common';
import { Glue, AWSError } from 'aws-sdk';
import {
  StartJobRunRequest,
  GetJobRunsRequest,
  JobRun,
  BatchGetJobsResponse,
  UpdateJobResponse,
} from 'aws-sdk/clients/glue';
import { JobRunnableStatus } from './models';

@Injectable()
export class GlueJobService {
  private readonly logger: Logger;

  constructor(private readonly glueClient: Glue) {
    this.logger = new Logger(GlueJobService.name);
  }

  /**
   *
   */
  public async startJob(
    jobName: string,
    defaultArgs?: { [key: string]: string },
  ): Promise<string> {
    const jobRequest: StartJobRunRequest = {
      JobName: jobName,
      Arguments: defaultArgs,
    };
    try {
      const response = await this.glueClient.startJobRun(jobRequest).promise();
      return response.JobRunId;
    } catch (err) {
      this.logger.error(
        `Error starting job ${jobName}: ${(err as AWSError).message}`,
      );
      return null;
    }
  }

  /**
   *
   */
  public async fetchAllJobs(): Promise<string[]> {
    let jobNames: string[] = [];
    const request: Glue.ListJobsRequest = {
      NextToken: undefined,
      MaxResults: 200,
    };
    try {
      let response = await this.glueClient.listJobs(request).promise();
      if (!response) {
        return;
      }
      jobNames = response.JobNames;
      // return { jobNames: response.JobNames, nextToken: response.NextToken };
      while (response.NextToken !== undefined) {
        request.NextToken = response.NextToken;
        response = await this.glueClient.listJobs(request).promise();
        jobNames = jobNames.concat(response.JobNames);
      }
      return jobNames;
    } catch (err) {
      this.logger.error(
        `Error fetching job Names: ${(err as AWSError).message}`,
      );
      return err;
    }
  }

  /**
   * This comment _supports_ [Markdown](https://marked.js.org/)
   */
  public async getSingleJob(jobName: string): Promise<Glue.Job> {
    try {
      const response = await this.glueClient
        .getJob({ JobName: jobName })
        .promise();
      return response.Job;
    } catch (err) {
      this.logger.error(`Error finding job [${jobName}]`);
      return err;
    }
  }

  /**
   * Lists the current job(s) metadata to be used in the next run
   *
   * @param jobNames
   */
  public async getCurrentJobSetup(
    jobNames: string[],
  ): Promise<BatchGetJobsResponse> {
    try {
      return await this.glueClient
        .batchGetJobs({
          JobNames: jobNames,
        })
        .promise();
    } catch (err) {
      this.logger.error(
        `Error fetching current job metadata ${(err as AWSError).message}`,
      );
      return err;
    }
  }

  /**
   * To give this power or to not give this power.
   */
  public async updateCurrentJob(job: Glue.Job): Promise<UpdateJobResponse> {
    const jobName = job.Name;
    const jobUpdateModel = job;
    // the different between the Glue.Job and the Glue.Types.UpdateJob is the
    // name is removed and at the top level
    delete jobUpdateModel.Name;
    try {
      return await this.glueClient
        .updateJob({
          JobName: jobName,
          JobUpdate: jobUpdateModel,
        })
        .promise();
    } catch (err) {
      this.logger.error(`Error could not update the job ${job.Name}`);
      this.logger.error(err);
      return err;
    }
  }
}
