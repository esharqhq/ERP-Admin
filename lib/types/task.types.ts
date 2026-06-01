export interface AdminTaskGroupSummaryDto {
  id: string;
  title: string | null;
  status: string;
  firstDate: string;
  lastDate: string;
  totalTasks: number;
  activeWorkers: number;
  propertyName: string;
}
