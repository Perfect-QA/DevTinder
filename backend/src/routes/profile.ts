import express from 'express';
import { userAuth } from '../middlewares/authmiddleware';
import { AuthenticatedRequest } from '../types';

const profileRouter: express.Router = express.Router();

profileRouter.get("/profile", userAuth, async (req: any, res: express.Response): Promise<void> => {
  try{
    const user = req.user;
    if (!user) {
      res.status(401).send("Unauthorized: User not found");
      return;
    }
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          emailId: user.emailId,
          age: user.age,
          gender: user.gender,
          photoUrl: user.photoUrl,
          about: user.about
        }
      }
    });
  } catch(error: any){
    res.status(401).send("Unauthorized: Invalid token " + error.message);
  }
});

export default profileRouter;
