const path = require('path');

const express = require('express');

const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');
const { body } = require("express-validator");

const router = express.Router();

router.get('/add-product', isAuth, adminController.getAddProduct);

router.get('/products', isAuth, adminController.getProducts);

router.post(
  "/add-product",
  [
    body("title", "enter a valid product title")
      .notEmpty()
      .withMessage("please enter a title")
      .custom((value) => {
        return value.match(/^[A-Za-z0-9 ]+$/); //check if input contains only letters, numbers and spaces
      })
      .withMessage("please enter a valid title with no symbols")
      .trim(),
    body("price", "enter a valid price").isFloat(),
    body("description")
      .isLength({ min: 5, max: 400 })
      .withMessage("enter a valide description of 5-400 characters")
      .trim(),
  ],
  isAuth,
  adminController.postAddProduct
);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.post(
  "/edit-product",
  [
    body("title", "enter a valid product title")
      .notEmpty()
      .withMessage("please enter a title")
      .custom((value) => {
        return value.match(/^[A-Za-z0-9 ]+$/); //check if input contains only letters, numbers and spaces
      })
      .withMessage("please enter a valid title with no symbols")
      .trim(),
    body("price", "enter a valid price").isFloat(),
    body("description")
      .isLength({ min: 5, max: 400 })
      .withMessage("enter a valide description of 5-400 characters")
      .trim(),
  ],
  isAuth,
  adminController.postEditProduct
);

router.delete("/product/:productId", isAuth, adminController.postDeleteProduct);

module.exports = router;
