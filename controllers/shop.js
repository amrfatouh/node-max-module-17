const fs = require("fs");
const path = require("path");

const PDFDocument = require("pdfkit")

const Product = require("../models/product");
const Order = require("../models/order");

const ITEMS_PER_PAGE = 3;

exports.getProducts = (req, res, next) => {
  const pageNum = +req.query.page || 1;
  let prodNum;
  Product.find()
    .countDocuments().then((docNum) => {
      prodNum = docNum;
      return Product.find()
        .skip((pageNum - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      // pagination calculations
      let currentPage = pageNum;
      let nextPage = pageNum + 1;
      let previousPage = pageNum - 1;
      let lastPage = Math.ceil(prodNum / ITEMS_PER_PAGE) || 1; //last page can't be 0
      let hasNextPage = currentPage < lastPage;
      let hasPreviousPage = currentPage > 1;
      res.render("shop/product-list", {
        prods: products,
        pageTitle: "Products",
        path: "/products",
        pagination: {
          currentPage,
          nextPage,
          previousPage,
          lastPage,
          hasNextPage,
          hasPreviousPage,
        },
      });
    })
    .catch((err) => next(new Error(err)));
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      res.render("shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products",
      });
    })
    .catch((err) => next(new Error(err)));
};

exports.getIndex = (req, res, next) => {
  const pageNum = +req.query.page || 1;
  let prodNum;
  Product.find()
    .countDocuments().then((docNum) => {
      prodNum = docNum;
      return Product.find()
        .skip((pageNum - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      // pagination calculations
      let currentPage = pageNum;
      let nextPage = pageNum + 1;
      let previousPage = pageNum - 1;
      let lastPage = Math.ceil(prodNum / ITEMS_PER_PAGE) || 1; //last page can't be 0
      let hasNextPage = currentPage < lastPage;
      let hasPreviousPage = currentPage > 1;
      res.render("shop/index", {
        prods: products,
        pageTitle: "Shop",
        path: "/",
        pagination: {
          currentPage,
          nextPage,
          previousPage,
          lastPage,
          hasNextPage,
          hasPreviousPage,
        },
      });
    })
    .catch((err) => next(new Error(err)));
};

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items;
      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products: products,
      });
    })
    .catch((err) => next(new Error(err)));
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      console.log(result);
      res.redirect("/cart");
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => next(new Error(err)));
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items.map((i) => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user,
        },
        products: products,
      });
      return order.save();
    })
    .then((result) => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => next(new Error(err)));
};

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .then((orders) => {
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders: orders,
      });
    })
    .catch((err) => next(new Error(err)));
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findOne({_id: orderId, "user.userId": req.user._id}).then(order => {
    if (!order) return next(new Error("couldn't fetch the order"));

    let invoiceName = "invoice-" + order._id + ".pdf";
    let invoicePath = path.join("data", "invoices", invoiceName);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader( 'Content-Disposition', 'inline; filename="' + invoiceName + '"' );
    
    let pdfDoc = new PDFDocument();
    pdfDoc.pipe(fs.createWriteStream(invoicePath));
    pdfDoc.pipe(res);

    pdfDoc.font('Courier').fontSize(20).text('Invoice');
    pdfDoc.text("-".repeat("Invoice".length));
    let totalPrice = 0;
    order.products.forEach(prod => {
      totalPrice += prod.product.price * prod.quantity;
      pdfDoc.fontSize(14).text(`${prod.product.title}: ${prod.quantity} x ${prod.product.price}`);
    });
    totalPrice = totalPrice.toFixed(2);
    pdfDoc.text("-".repeat(`total price: $${totalPrice}`.length));
    pdfDoc.text(`total price: $${totalPrice}`)
    pdfDoc.end();
    
  }).catch(err => next(err))
};
