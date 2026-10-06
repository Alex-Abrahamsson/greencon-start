export type AlertType = "alert" | "warning" | "info" | "success";

export type AlertMessage = {
  id: string;
  prefix: string;
  text: string;
  type: AlertType;
};
