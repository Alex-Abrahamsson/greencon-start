export interface AlertMessage {
  id: string;
  prefix?: string;
  text: string;
  type?: "alert" | "warning" | "info" | "success";
}
