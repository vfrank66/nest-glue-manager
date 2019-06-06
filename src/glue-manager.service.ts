import { Injectable, Logger } from '@nestjs/common';
import { Glue, AWSError } from 'aws-sdk';
import {
  StartJobRunRequest,
  GetJobRunsRequest,
  ListJobsRequest,
  JobRun,
} from 'aws-sdk/clients/glue';
import {
  JobRunnableStatus,
  AllJobsWithHistory,
  CrawlerStateReturnModel,
} from './glue-manager';
import { GlueJobService } from './glue-manager/glue-job.service';
import { GlueJobRunService } from './glue-manager/glue-job-run.service';
import { GlueCrawlerService } from './glue-manager/glue-crawler.service';
import { v4 } from 'uuid';

@Injectable()
export class GlueManagerService {
  private readonly logger: Logger;

  constructor(
    private readonly glueJob: GlueJobService,
    private readonly glueJobRuns: GlueJobRunService,
    private readonly glueCrawler: GlueCrawlerService,
  ) {
    this.logger = new Logger(GlueManagerService.name);
  }

  public async getCurrentJobSetup(
    jobNames: string[],
  ): Promise<Glue.BatchGetJobsResponse> {
    return this.glueJob.getCurrentJobSetup(jobNames);
  }

  /**
   * startJobs will get all jobs associated with input parameters [[environment]] and [[jobNamePattern]]
   * then it will make sure none of the jobs are currently running, if any of the jobs is not
   * in a runnable state, none of the jobs will be started.
   * @param environment
   * @param jobNamePattern
   */
  public async startJobs(
    environment: string,
    jobNamePattern: string,
  ): Promise<string[]> {
    const jobRunIds: string[] = [];
    const jobs = await this.fetchAllAppropriateJobs(
      environment,
      jobNamePattern,
    );
    for (const job of jobs) {
      const isRunnable = await this.isJobRunnable(job);
      if (isRunnable) {
        const defaultArgs = await this.getJobArguments(job);
        const jobRunId = await this.glueJob.startJob(job, defaultArgs);
        jobRunIds.push(jobRunId);
      }
    }
    this.logger.log(`Started JobRunIds: ${jobRunIds.join(' | ')}`);
    return jobRunIds;
  }

  /**
   * startJob will get all jobs associated with input parameters [[environment]] and [[jobNamePattern]]
   * then it will make sure none of the jobs are currently running, if they are not it will start each
   * job.
   *
   * @returns JobRunId - string
   */
  public async startJob(
    jobName: string,
    defaultArgs?: { [key: string]: string },
  ): Promise<string> {
    const isRunnable = await this.isJobRunnable(jobName);
    if (isRunnable) {
      return await this.glueJob.startJob(jobName, defaultArgs);
    }
    return null;
  }

  public async stopJobs(
    jobNames: string[],
  ): Promise<Glue.BatchStopJobRunResponse[]> {
    if (!jobNames) {
      this.logger.log(`Stop job(s) could not proceed, no job names provided`);
      return null;
    }
    // let responses: Glue.BatchStopJobRunResponse[] = [];
    const batchStopJobRunRequest: Glue.BatchStopJobRunRequest[] = [];
    for (const jobName of jobNames) {
      try {
        const lastJobRun = await this.glueJobRuns.getLastJobRun(jobName);

        batchStopJobRunRequest.push({
          JobName: jobName,
          JobRunIds: [lastJobRun.Id],
        });
      } catch (err) {
        this.logger.error(
          `Failed to find most current job run for job: ${jobName}`,
        );
        this.logger.error(err);
        return null;
      }
    }
    const response = await this.glueJobRuns.stopJobRuns(batchStopJobRunRequest);
    return response;
  }

  public async stopJob(
    jobName: string,
  ): Promise<Glue.BatchStopJobRunResponse[]> {
    if (jobName.length === 0) {
      this.logger.log(`Stop job could not proceed, no job name provided`);
      return null;
    }
    const lastJobRun = await this.glueJobRuns.getLastJobRun(jobName);
    if (lastJobRun.CompletedOn) {
      this.logger.log(
        `Stop job could not proceed, no job is currently running`,
      );
    }
    const response = await this.glueJobRuns.stopJobRun({
      JobName: jobName,
      JobRunIds: [lastJobRun.Id],
    });
    return response;
  }

  public async updateJob(job: Glue.Job): Promise<Glue.UpdateJobResponse> {
    return await this.glueJob.updateCurrentJob(job);
  }

  public async fetchAllAppropriateJobs(
    environment: string,
    jobNamePattern: string,
  ): Promise<string[]> {
    const jobNames = await this.fetchAllJobs();
    return jobNames
      .filter(x => x.startsWith(environment))
      .filter(x => x.includes(jobNamePattern));
  }

  /*
    Accepts no no filter, retrieves all job names.

    List all the possible jobs, once retrieved used for filtering,
    follow up calls in groups of clients/database environments etc.
  */
  public async fetchAllJobs(): Promise<string[]> {
    return await this.glueJob.fetchAllJobs();
  }

  /**
   * finds the last run by the job and then check to see if the job is currently running, if
   * the job is currently running or if the job has never ran before then it will return [[JobRunnableStatus]]
   * with `JobRunnableStatus.runnable == true` and the last job run state.
   *
   * Note: last run here also refers to a current job run if the job is currently running
   */
  public async isJobRunnable(jobName: string): Promise<JobRunnableStatus> {
    const lastRun = await this.glueJobRuns.getLastJobRun(jobName);
    if (
      lastRun === null ||
      lastRun.JobRunState === 'SUCCEEDED' ||
      lastRun.JobRunState === 'FAILED'
    ) {
      return { runnable: true, lastJobRunState: lastRun.JobRunState };
    }
    this.logger.error(
      `Cannot start ${jobName} because last run started on ${
        lastRun.StartedOn
      } is in state ${lastRun.JobRunState}`,
    );
    return { runnable: false, lastJobRunState: lastRun.JobRunState };
  }

  public async getJobArguments(
    jobName: string,
  ): Promise<{ [key: string]: string }> {
    return await this.glueJob.getSingleJob(jobName).then(result => {
      return result.DefaultArguments;
    });
  }

  public async getAllJobRuns(jobName: string): Promise<JobRun[]> {
    return await this.glueJobRuns.getAllJobRuns(jobName);
  }

  public async fetchAllJobWithAllHistory(): Promise<AllJobsWithHistory[]> {
    const runs: AllJobsWithHistory[] = [];
    const jobNames = await this.fetchAllJobs();
    for (const job of jobNames) {
      const jobruns = await this.glueJobRuns.getAllJobRuns(job);
      runs.push({ jobName: job, jobRuns: jobruns });
    }
    return runs;
  }

  public async startCrawler(
    crawlerName: string,
  ): Promise<CrawlerStateReturnModel> {
    return await this.glueCrawler.startCrawler(crawlerName);
  }

  public async getCrawler(
    crawlerName: string,
  ): Promise<Glue.Types.GetCrawlerResponse> {
    return await this.glueCrawler.getCrawler(crawlerName);
  }
}
