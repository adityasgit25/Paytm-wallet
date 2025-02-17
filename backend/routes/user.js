// backend/routes/user.js
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const zod = require('zod');
const {User, Account} =  require( '../db') ;
const jwt = require("jsonwebtoken");
const {JWT_SECRET} = require('../config');
const  { authMiddleware } = require("../middleware");


const signupBody = zod.object({
    username: zod.string().email(),
    firstName: zod.string(),
    lastName: zod.string(),
    password: zod.string()
})

router.post("/signup", async(req, res) => {
    const body = signupBody.safeParse(req.body);
    console.log(req.body);
    if (!body.success) {
        return res.status(411).json({
            message: "Incorrect Inputs"
        })
    }
    const existingUser = await User.findOne({
        username: req.body.username
    });
    if (existingUser) {
        return res.status(411).json({
            message: "Email Already taken"
        })
    }

    const user = await User.create({
        username: req.body.username,
        password: req.body.password,
        firstName: req.body.firstName,
        lastName: req.body.lastName
    })

    // This basically generates a random is using the MongoDB in-built "._id" property thing.
    const userId = user._id;


    // --------- Create new account ----------
    // Remember hum ne Account import kiya ha tabhi apne ko mil paa rha ha yaha pr
    await Account.create({
        userId, 
        balance: 1 + Math.random() * 10000
    })

    // -----------------------------------


    // Here we are creating token, here userId is called the payload.
    const token = jwt.sign(
        {userId}, JWT_SECRET
    );
    res.json({
        message: "User created successfully",
        token: token
    })
})

const signinBody = zod.object({
    username: zod.string().email(),
    password: zod.string()
})

router.post("/signin", async (req, res) => {
    console.log(req.body.username);
    console.log(req.body.password);

    const {success, data, error} = signinBody.safeParse(req.body);

    if (!success) {
        return res.status(400).json({
          message: "Incorrect inputs",
          details: error.errors
        });
    }
    
    const { username, password } = data;

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json("User not found!");
    }

   if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    return res.status(200).json({ token: token });
  }
  
  res.status(400).json({ message: "Invalid username or password" });
})


// other auth routes

const updateBody = zod.object({
    password: zod.string().optional(),
    firstName: zod.string().optional(),
    lastName: zod.string().optional()
})

router.put("/", authMiddleware, async (req, res)=> {
    const {success} = updateBody.safeParse(req.body);
    if (!success) {
        res.status(411).json({
            message: "Error while updating information"
        })
    }

    await User.updateOne({_id: req.userId}, req.body);

    res.json({
        message: "Updated successfully"
    })
})

router.get("/bulk", async (req, res) => {
    const filter = req.query.filter || "";
  
    try {
      const users = await User.find({
        $or: [
          { firstName: { $regex: filter, $options: "i" } },
          { lastName: { $regex: filter, $options: "i" } }
        ]
      });
  
      res.json({
        user: users.map(user => ({
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          _id: user._id
        }))
      });
    } catch (error) {
      res.status(500).json({ error: "Error fetching users" });
    }
  });
  
// FOR GETTING CURRENT USER INFO

router.get("/getUser", authMiddleware, async (req, res) => {
    const user = await User.findOne({
      _id: req.userId,
    });
    res.json(user);
  });



module.exports = router;