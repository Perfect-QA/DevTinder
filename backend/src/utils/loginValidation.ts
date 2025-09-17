import validator from "validator";
import { Request } from 'express';

const validateLoginData = (req: Request): void => {
    const { emailId, password } = req.body;
    if(!emailId || !password){
        throw new Error("Email and password are required");
    }
    else if(!validator.isEmail(emailId)){
        throw new Error("Invalid email address");
    }
}       

export { validateLoginData };
