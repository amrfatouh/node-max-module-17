const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const crypto = require("crypto");
const { validationResult } = require("express-validator");

const User = require('../models/user');

const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key:
        "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",
    },
  })
);

exports.getLogin = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: message,
    oldInput: { email: "", password: "" },
    errorSources: [],
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: message,
    oldInput: { email: "", password: "", confirmPassword: "" },
    errorSources: [],
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg,
      oldInput: { email, password },
      errorSources: errors.array().map((e) => e.param),
    });
  }

  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        req.flash("error", "Invalid email or password.");
        return res.redirect("/login");
      }
      bcrypt
        .compare(password, user.password)
        .then((doMatch) => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save((err) => {
              console.log(err);
              res.redirect("/");
            });
          }
          req.flash("error", "Invalid email or password.");
          res.redirect("/login");
        })
        .catch((err) => {
          console.log(err);
          res.redirect("/login");
        });
    })
    .catch((err) => next(new Error(err)));
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;

  const errors = validationResult(req);
  console.log(errors.array());
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array()[0].msg,
      oldInput: { email, password, confirmPassword },
      errorSources: errors.array().map((e) => e.param),
    });
  }

  User.findOne({ email: email })
    .then((userDoc) => {
      if (userDoc) {
        req.flash(
          "error",
          "E-Mail exists already, please pick a different one."
        );
        return res.redirect("/signup");
      }
      return bcrypt
        .hash(password, 12)
        .then((hashedPassword) => {
          const user = new User({
            email: email,
            password: hashedPassword,
            cart: { items: [] },
          });
          return user.save();
        })
        .then((result) => {
          res.redirect("/login");
          // return transporter.sendMail({
          //   to: email,
          //   from: "mr.wanderer14@gmail.com",
          //   subject: "Signup succeeded!",
          //   html: "<h1>You successfully signed up!</h1>",
          // });
        })
        .catch((err) => next(new Error(err)));
    })
    .catch((err) => next(new Error(err)));
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};

exports.getReset = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/reset.ejs", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: message,
  });
};

exports.postReset = (req, res, next) => {
  User.findOne({ email: req.body.email })
    .then((user) => {
      if (!user) {
        req.flash("error", "there is no account with that email");
        return res.redirect("/reset");
      }
      crypto.randomBytes(32, (err, buffer) => {
        if (err) {
          req.flash("error", "couldn't generate token");
          res.redirect("/reset");
        }
        let token = buffer.toString("hex");
        user.token = token;
        user.tokenExpirationDate = Date.now() + 1 * 60 * 60 * 1000;
        user
          .save()
          .then(() => {
            transporter.sendMail({
              to: user.email,
              from: "mr.wanderer14@gmail.com",
              subject: "Reset Password",
              html: `
                    <p>you requested to reset your password</p>
                    <p>click this <a href="http://localhost:3000/reset/${token}">link</a> to reset</p>
                    `,
            });
            req.session.resetPasswordUser = user;
            return req.session.save();
          })
          .then(() => res.redirect("/"))
          .catch((err) => next(new Error(err)));
      });
    })
    .catch((err) => next(new Error(err)));
};

exports.getNewPassword = (req, res, next) => {
  let user = req.session.resetPasswordUser;
  let expirationDate = new Date(user.tokenExpirationDate);
  console.log(expirationDate.getTime());
  console.log(Date.now());
  if (
    req.params.token !== user.token ||
    expirationDate.getTime() < Date.now()
  ) {
    req.flash("error", "invalid or expired token");
    return res.redirect("/login");
  }
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/new-password.ejs", {
    path: "/reset/:token",
    pageTitle: "New Password",
    errorMessage: message,
  });
};

exports.postNewPassword = (req, res, next) => {
  let hashedPassword;
  bcrypt
    .hash(req.body.password, 12)
    .then((p) => {
      hashedPassword = p;
      return User.findOne({ _id: req.session.resetPasswordUser._id });
    })
    .then((user) => {
      user.password = hashedPassword;
      user.token = undefined;
      user.tokenExpirationDate = undefined;
      return user.save();
    })
    .then(() => res.redirect("/login"))
    .catch((err) => next(new Error(err)));
};