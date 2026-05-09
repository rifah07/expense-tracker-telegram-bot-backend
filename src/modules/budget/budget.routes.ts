import { Router } from "express";
import { budgetController } from "./budget.controller";
import { authMiddleware } from "../../middlewares/auth";

export const budgetRouter = Router();

budgetRouter.use(authMiddleware);

budgetRouter.get("/status", budgetController.getStatus);
budgetRouter.post("/", budgetController.setBudget);
budgetRouter.delete("/", budgetController.removeBudget);
