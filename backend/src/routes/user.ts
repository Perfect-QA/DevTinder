import express from 'express';
import { userAuth } from '../middlewares/authmiddleware';
import User from '../models/user';
import { AuthenticatedRequest } from '../types';

const userRouter: express.Router = express.Router();

userRouter.get("/user", userAuth, async (req: any, res: express.Response): Promise<void> => {
  const userEmail = req.query.emailId as string;
  
  if (!userEmail) {
    res.status(400).send("Email ID is required");
    return;
  }
  
  try {
    const user = await User.find({ emailId: userEmail });
    if (user.length === 0) {
      res.status(404).send("User not found");
    } else {
      res.send(user);
    }
  } catch (error: any) {
    res.status(400).send("Something went wrong: " + error.message);
  }
});

userRouter.delete("/user", userAuth, async (req: any, res: express.Response): Promise<void> => {
  const { userId } = req.body;
  
  if (!userId) {
    res.status(400).send("User ID is required");
    return;
  }
  
  try {
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      res.status(404).send("User not found");
      return;
    }
    res.send("User deleted successfully");
  } catch (error: any) {
    res.status(400).send("Something went wrong: " + error.message);
  }
});

userRouter.patch("/user/:userId", userAuth, async (req: any, res: express.Response): Promise<void> => {
  const userId = req.params?.userId;
  const data = req.body;
  
  if (!userId) {
    res.status(400).send("User ID is required");
    return;
  }
  
  if (!data || Object.keys(data).length === 0) {
    res.status(400).send("Update data is required");
    return;
  }
  
  try {
    const ALLOWED_UPDATES = [
      "password",
      "age",
      "gender",
      "photoUrl",
      "about",
    ];
    const isUpdateAllowed = Object.keys(data).every((k) =>
      ALLOWED_UPDATES.includes(k)
    );
    if (!isUpdateAllowed) {
      res.status(400).send("Invalid updates!");
      return;
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      data,
      { runValidators: true, returnDocument: "after" }
    );
    
    if (!updatedUser) {
      res.status(404).send("User not found");
      return;
    }
    
    res.send({ message: "User updated successfully", user: updatedUser });
  } catch (error: any) {
    res.status(400).send("Error updating user: " + error.message);
  }
});

export default userRouter;
