import jwt from 'jsonwebtoken';
import User, { IUser } from "../models/user";
import { Request, Response, NextFunction } from 'express';
// import { AuthenticatedRequest } from '../types';

interface JwtPayload {
  userId: string;
}

const userAuth = async (req: any, res: Response, next: NextFunction): Promise<void> => {
  try{
    // Read the token from the req. cookies
    const {token} = req.cookies;
    if(!token){
      res.status(401).send({ message: "Unauthorized access" });
      return;
    }
    
    let decodedObj: JwtPayload;
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        res.status(500).send({ message: "Server configuration error" });
        return;
      }
      decodedObj = jwt.verify(token, jwtSecret) as JwtPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        res.status(401).send({ 
          message: "Token expired", 
          error: "TOKEN_EXPIRED" 
        });
        return;
      } else if (error.name === 'JsonWebTokenError') {
        res.status(401).send({ 
          message: "Invalid token", 
          error: "INVALID_TOKEN" 
        });
        return;
      } else {
        res.status(401).send({ 
          message: "Token verification failed", 
          error: "TOKEN_VERIFICATION_FAILED" 
        });
        return;
      }
    }
    
    if(!decodedObj){
      res.status(401).send({ message: "Unauthorized access" });
      return;
    }
    
    const {userId} = decodedObj;
    const user = await User.findById(userId);
    if(!user){
      res.status(401).send({ message: "Unauthorized access" });
      return;
    }
    
    req.user = user;
    (req as any).userId = userId;
    (req as any).userEmail = user.emailId;
    next();
  }catch(error: any){
    res.status(401).send({ message: "Unauthorized access: " + error.message });
  }
}

export { userAuth };
