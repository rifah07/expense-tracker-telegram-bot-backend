import { Router } from "express";
import { userController } from "./user.controller";
import { authMiddleware } from "../../middlewares/auth";

export const userRouter = Router();

userRouter.post("/login", userController.login);
userRouter.get("/me", authMiddleware, userController.getMe);
