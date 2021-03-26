const express = require('express');
const { check, body } = require("express-validator");

const authController = require('../controllers/auth');
const User = require("../models/user");

const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .withMessage("please enter a valid email")
      .normalizeEmail(),
    body("password").notEmpty().withMessage("please enter a password"),
  ],
  authController.postLogin
);

router.post(
  "/signup",
  [
    check("email")
      .isEmail()
      .withMessage("enter valid email")
      .custom((value, { req }) => {
        return User.findOne({ email: value }).then((user) => {
          if (user) {
            return Promise.reject("email is already taken");
          }
        });
      }),
    body("password", "your password is too short").isLength({ min: 5 }),
    body("confirmPassword")
      .custom((value, { req }) => {
        if (value !== req.body.password) return false;
        return true;
      })
      .withMessage("passwords have to match"),
  ],
  authController.postSignup
);

router.post('/logout', authController.postLogout);

router.get("/reset", authController.getReset);

router.post("/reset", authController.postReset);

router.get("/reset/:token", authController.getNewPassword);

router.post("/new-password", authController.postNewPassword);

module.exports = router;