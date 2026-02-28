export interface BlogSummaryJobData {
  blogId: string;
  title: string;
  content: string;
}

export interface BlogSummaryJobResult {
  blogId: string;
  summary: string;
  generatedAt: string;
}
