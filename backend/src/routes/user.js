const express = require('express');
const userRouter = express.Router();

userRouter.get("/user", userAuth , async (req, res) => {
   const userEmail = req.query.emailId; 
  try {
    const user = await User.find({ emailId: userEmail });
    if (user.length === 0) {
      res.status(404).send("User not found");
    } else {
      res.send(user);
    }
  } catch (error) {
    res.status(400).send("Something went wrong" + error.message);
  }
});

userRouter.delete("/user", userAuth , async (req, res) => {
  const { userId } = req.body;
  try {
    await User.findByIdAndDelete(userId);
    res.send("User deleted successfully");
  } catch (error) {
    res.status(400).send("Something went wrong: " + error.message);
  }
});

userRouter.patch("/user/:userId", userAuth , async (req, res) => {
  const userId = req.params?.userId;
  const data = req.body;
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
      throw new Error("Invalid updates!");
    }
    await User.findByIdAndUpdate(
      userId,
      data,
      { runValidators: true },
      { returnDocument: "after" }
    );
    res.send("User updated successfully");
  } catch (error) {
    res.status(400).send("Error updating user: " + error.message);
  }
});

module.exports = userRouter