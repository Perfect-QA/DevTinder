const express = require('express');
const profileRouter = express.Router();

profileRouter.get("/profile",userAuth, async (req,res)=>{
  try{
  const user = req.user;
  res.send(user)}
  catch(error){
    res.status(401).send("Unauthorized: Invalid token " + error.message);
  }
})

module.exports = profileRouter;