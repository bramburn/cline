import { ErrorReport } from './ErrorReport';

export type ExecuteToolCallResponse = {
  success: boolean;
  result?: any;
  error?: ErrorReport;
};
