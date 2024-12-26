var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require("cors");

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const adminRoutes = require("./routes/admin");
const categorieRoutes = require("./routes/categorie");
const articleRoutes = require("./routes/articles");
const PromoRoutes = require("./routes/promo");
const CommandRoutes = require("./routes/command");
const DashboardRoutes = require("./routes/dashboard")
var app = express();
app.use(cors());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
// Routes
app.use("/admin", adminRoutes);
app.use("/categories", categorieRoutes);
app.use("/articles", articleRoutes);
app.use("/promo", PromoRoutes);
app.use("/command", CommandRoutes);
app.use("/dashboard", DashboardRoutes);

module.exports = app;
