const validator = require("validator");

const validateLoginData = (req) => {
    const { emailId , password } = req.body;
    if(!emailId || !password){
        throw new Error("Email and password are required");
    }
    else if(!validator.isEmail(emailId)){
        throw new Error("Invalid email address");
    }
}       

module.exports = {validateLoginData};