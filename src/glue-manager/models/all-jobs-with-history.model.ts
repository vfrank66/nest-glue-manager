import { Glue } from 'aws-sdk';

export class AllJobsWithHistory {
  jobName: string;
  jobRuns: Glue.JobRun[];
}
