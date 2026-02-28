export interface BlogSummaryJobsPort {
  enqueueSummaryGeneration(payload: {
    blogId: string;
    title: string;
    content: string;
  }): Promise<void>;
  enqueueRegeneration(payload: {
    blogId: string;
    title: string;
    content: string;
  }): Promise<void>;
}
