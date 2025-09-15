const jwt = require('jsonwebtoken');
const User = require("../models/user");
const userAuth = async (req, res, next) => {
  try{
    // Read the token from the req. cookies
    const {token} = req.cookies;
    if(!token){
      return res.status(401).send({ message: "Unauthorized access" });
    }
    let decodedObj;
    try {
      decodedObj = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).send({ 
          message: "Token expired", 
          error: "TOKEN_EXPIRED" 
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).send({ 
          message: "Invalid token", 
          error: "INVALID_TOKEN" 
        });
      } else {
        return res.status(401).send({ 
          message: "Token verification failed", 
          error: "TOKEN_VERIFICATION_FAILED" 
        });
      }
    }
    
    if(!decodedObj){
      return res.status(401).send({ message: "Unauthorized access" });
    }
  const {userId} = decodedObj;
  const user = await User.findById(userId);
  if(!user){
    return res.status(401).send({ message: "Unauthorized access" });
  }
  req.user = user;
  req.userId = userId;
  req.userEmail = user.emailId;
  next()
  }catch(error){
    return res.status(401).send({ message: "Unauthorized access: " + error.message });
  }
  // validate the token
  // find the user 
}

module.exports = { userAuth };