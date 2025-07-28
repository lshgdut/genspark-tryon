"use client"

import { Button } from '@/components/ui/button';
import { Loader2Icon } from "lucide-react"

import { useState } from 'react';
import { jobService } from '@/services/job';

export default function TrpcDemo() {
  const [loading, setLoading] = useState<boolean>(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);

  const startJob = async () => {
    setLoading(true);
    const result = await jobService.start({ inputData: 'test' });
    setJobId(result.id);
    setJobStatus("running")
    setLoading(false);
  };

  const checkStatus = async () => {
    if (!jobId) return;
    const job = await jobService.getJob(jobId);
    console.log("job", job)
    setJobStatus(job.status);
  };

  return (
    <div>
      <Button onClick={startJob}>
        {loading ? <Loader2Icon className="animate-spin" /> : '启动任务'}
      </Button>
      <Button onClick={checkStatus} disabled={!jobId}>
        查询状态
      </Button>
      <div>Job ID: {jobId}</div>
      <div>任务状态: {jobStatus}</div>
    </div>
  );
}
