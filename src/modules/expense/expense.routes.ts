import { Router } from "express";
import { expenseController } from "./expense.controller";
import { authMiddleware } from "../../middlewares/auth";

export const expenseRouter = Router();

expenseRouter.use(authMiddleware);

expenseRouter.post("/", expenseController.create);
expenseRouter.get("/today", expenseController.getToday);
expenseRouter.get("/week", expenseController.getWeek);
expenseRouter.get("/month", expenseController.getMonth);
expenseRouter.get("/recent", expenseController.getRecent);
expenseRouter.get("/breakdown", expenseController.getBreakdown);
expenseRouter.delete("/:id", expenseController.delete);
