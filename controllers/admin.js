const { response } = require("express");
const { validationResult } = require("express-validator");
const Product = require("../models/product");

const { deleteFile } = require("../util/file");

exports.getAddProduct = (req, res, next) => {
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    isInvalid: false,
    errorMessage: null,
    errorSources: [],
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;

  if (!image) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      isInvalid: true,
      oldInput: { title, price, description },
      errorMessage: "Please select an image of (png/jpg/jpeg) formats",
      errorSources: [],
    });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      isInvalid: true,
      oldInput: { title, price, description },
      errorMessage: errors.array()[0].msg,
      errorSources: errors.array().map((e) => e.param),
    });
  }

  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: image.path,
    userId: req.user,
  });
  product
    .save()
    .then((result) => {
      console.log("Created Product");
      res.redirect("/admin/products");
    })
    .catch((err) => next(new Error(err)));
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/");
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect("/");
      }
      res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: editMode,
        product: product,
        isInvalid: false,
        errorMessage: null,
        errorSources: [],
      });
    })
    .catch((err) => {
      next(new Error(err));
    });
};

exports.postEditProduct = (req, res, next) => {
  const { productId, title, price, description } = req.body;
  const image = req.file;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Edit Product",
      path: "/admin/edit-product",
      editing: true,
      isInvalid: true,
      oldInput: { _id: productId, title, price, imageUrl, description },
      errorMessage: errors.array()[0].msg,
      errorSources: errors.array().map((e) => e.param),
    });
  }

  Product.findById(productId)
    .then((product) => {
      if (req.user._id.toString() !== product.userId.toString()) {
        return res.redirect("/admin/products");
      }
      let imageUrl = product.imageUrl;
      if (image) {
        deleteFile(imageUrl);
        imageUrl = image.path;
      }
      product.title = title;
      product.price = price;
      product.description = description;
      product.imageUrl = imageUrl;
      return product.save();
    })
    .then((result) => {
      console.log("UPDATED PRODUCT!");
      res.redirect("/admin/products");
    })
    .catch((err) => next(new Error(err)));
};

exports.getProducts = (req, res, next) => {
  Product.find({ userId: req.user._id })
    .then((products) => {
      res.render("admin/products", {
        prods: products,
        pageTitle: "Admin Products",
        path: "/admin/products",
      });
    })
    .catch((err) => next(new Error(err)));
};

exports.postDeleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findOne({ _id: prodId, userId: req.user._id })
    .then((product) => {
      if (!product) {
        return next(new Error("couldn't fetch product"));
      }
      deleteFile(product.imageUrl);
      return Product.deleteOne({ _id: prodId, userId: req.user._id });
    })
    .then(() => {
      console.log("DESTROYED PRODUCT");
      res.status(200).json({ message: "success" });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: "failure" });
    });
};
