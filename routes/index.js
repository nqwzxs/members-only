const { body, validationResult } = require("express-validator");

const bcrypt = require("bcryptjs");
const express = require("express");
const passport = require("passport");
const router = express.Router();

const User = require("../models/user");
const Message = require("../models/message");

router.get("/", async function (req, res, next) {
  try {
    const messages = await Message.find()
      .sort({ date_created: -1 })
      .populate("author")
      .exec();

    if (req.user && (req.user.membership_status || req.user.admin)) {
      res.render("index", { title: "members only", messages: messages });
    } else {
      const limitedMessages = messages.map((message) => {
        return { _id: message._id, text: message.text };
      });
      res.render("index", { title: "members only", messages: limitedMessages });
    }
  } catch (err) {
    return next(err);
  }
});

router.get("/sign-up", function (req, res, next) {
  const user = res.render("sign_up", { title: "sign up" });
});

router.post("/sign-up", [
  body("name")
    .trim()
    .notEmpty()
    .escape()
    .withMessage("name field cannot be empty"),
  body("username")
    .trim()
    .notEmpty()
    .escape()
    .withMessage("username field cannot be empty")
    .isAlphanumeric()
    .withMessage("username must contain only letters and numbers")
    .custom(async (value) => {
      const user = await User.findOne({ username: value });
      if (user) {
        throw new Error("username already exists");
      }
    }),
  body("password")
    .trim()
    .notEmpty()
    .escape()
    .withMessage("password field cannot be empty"),
  body("confirm-password")
    .custom((value, { req }) => {
      return value === req.body.password;
    })
    .withMessage("passwords do not match"),

  async (req, res, next) => {
    const errors = validationResult(req);

    const user = new User({
      name: req.body.name,
      username: req.body.username,
    });

    if (!errors.isEmpty()) {
      res.render("sign_up", {
        title: "sign up",
        user: user,
        errors: errors.array(),
      });
      return;
    } else {
      bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
        if (err) return next(err);

        try {
          user.password = hashedPassword;
          await user.save();
          res.redirect("/");
        } catch (err) {
          return next(err);
        }
      });
    }
  },
]);

router.get("/join-club", function (req, res, next) {
  res.render("join_club", { title: "join the club" });
});

router.post("/join-club", [
  body("secret-passphrase")
    .trim()
    .notEmpty()
    .escape()
    .matches("poggers")
    .withMessage("wrong passphrase"),

  async (req, res, next) => {
    console.log(req.user);
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.render("join_club", {
        title: "join the club",
        errors: errors.array(),
      });
      return;
    } else {
      try {
        await User.findOneAndUpdate(
          { _id: req.user._id },
          { membership_status: true }
        );
        res.redirect("/");
      } catch (err) {
        return next(err);
      }
    }
  },
]);

router.get("/log-in", function (req, res, next) {
  res.render("log_in", {
    title: "log in",
  });
});

router.post("/log-in", [
  body("username")
    .trim()
    .notEmpty()
    .escape()
    .withMessage("username field cannot be empty"),
  body("password")
    .trim()
    .notEmpty()
    .escape()
    .withMessage("password field cannot be empty"),

  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.render("log_in", {
        title: "log in",
        username: req.body.username,
        errors: errors.array(),
      });
      return;
    } else {
      passport.authenticate("local", (err, user, info) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          res.render("log_in", {
            title: "log in",
            username: req.body.username,
            errors: [info],
          });
          return;
        }
        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }
          res.redirect("/");
        });
      })(req, res, next);
    }
  },
]);

router.get("/log-out", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

router.post("/message/new", [
  body("text")
    .trim()
    .notEmpty()
    .escape()
    .withMessage("text field cannot be empty"),
  async function (req, res, next) {
    try {
      const errors = validationResult(req);

      if (!req.user) return;

      const message = new Message({
        text: req.body.text,
        author: req.user._id,
      });

      if (!errors.isEmpty()) {
        res.render("index", {
          title: "members only",
          text: text,
          errors: errors.array(),
        });
        return;
      } else {
        await message.save();
        res.redirect("/");
      }
    } catch (err) {
      return next(err);
    }
  },
]);

router.post("/message/delete", async function (req, res, next) {
  try {
    if (!req.user && !req.user.admin) return;

    await Message.findByIdAndDelete(req.body.messageid);
    res.redirect("/");
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
