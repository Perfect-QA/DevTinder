const express = require('express');
const profileRouter = express.Router();
const { userAuth } = require('../middlewares/authmiddleware');

profileRouter.get("/profile",userAuth, async (req,res)=>{
  try{
  const user = req.user;
  res.send(user)}
  catch(error){
    res.status(401).send("Unauthorized: Invalid token " + error.message);
  }
})

module.exports = profileRouter;