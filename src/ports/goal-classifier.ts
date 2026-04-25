import type { TaskTemplate } from "../state/task-templates.js";

export interface IGoalClassifier {
  getTemplates(goal: string): TaskTemplate[];
}
