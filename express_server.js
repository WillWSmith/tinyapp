const express = require("express");
const cookieSession = require("cookie-session");
const methodOverride = require("method-override");
const bcrypt = require("bcryptjs");
const salt = bcrypt.genSaltSync(10);
const app = express();
const PORT = 8080;

// HELPER FUNCTIONS
const { getUserByEmail, generateRandomString, checkLoggedIn, urlsForUser } = require("./helpers");

// MIDDLEWARE
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(cookieSession({
  name: "session",
  keys: ["holy-moly-secret-key"],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
}));

// URL DATABASE
const urlDatabase = {};

// USER DATABASE
const users = {};

// ROUTES

//Authentication Routes
app.get("/", (req, res) => {
  const userId = req.session.user_id;
  const user = users[userId];
  if (userId && user) {
    res.redirect("/urls");
  } else {
    res.redirect("/login");
  }
});
app.get("/login", (req, res) => {
  const userId = req.session.user_id;
  const redirectedReason = req.query.redirected;

  let message = null;
  if (redirectedReason === "unauthorized") {
    message = "You must be logged in to create or edit a URL.";
  }

  if (userId && users[userId]) {
    res.redirect("/urls");
  } else {
    const templateVars = {
      email: "",
      password: "",
      user: null,
      message
    };
    res.render("login", templateVars);
  }
});
app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const user = getUserByEmail(email, users);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    res.status(403).send("Incorrect email or password.");
  }

  req.session.user_id = user.id;
  res.redirect(`/urls`);
});
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect(`/login`);
});
app.get("/register", (req, res) => {
  const userId = req.session.user_id;
  if (userId && users[userId]) {
    res.redirect("/urls");
  } else {
    const templateVars = {
      email: "",
      password: "",
      user: null,
    };
    res.render("register", templateVars);
  }
});
app.post("/register", (req, res) => {
  console.log(req.session);
  const id = generateRandomString(users);
  const email = req.body.email;
  const password = req.body.password;

  if (email === "" || password === "") {
    res.status(400).send("Please enter an email and password.");
  }

  const existingUser = getUserByEmail(email, users);
  if (existingUser) {
    return res.status(400).send("Email already in use.");
  }

  const hashedPassword = bcrypt.hashSync(password, salt);
  const user = { id, email, password: hashedPassword };
  users[id] = user;
  req.session.user_id = id;
  res.redirect("/urls");
});

// URL Routes
app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});
app.get("/urls/new", (req, res, next) => {
  checkLoggedIn(req, res, next, users);
}, (req, res) => {
  const userId = req.session.user_id;
  const user = users[userId];

  if (!user) {
    console.log("Redirecting to /login with redirected=true");
    res.redirect("/login?redirected=true");
    return;
  }

  const templateVars = { user };
  res.render("urls_new", templateVars);
});
app.get("/urls", (req, res) => {
  const userId = req.session.user_id;
  const user = users[userId];

  if (!user) {
    return res.status(401).send("You must be logged in to view URLs. Please <a href='/login'>login</a> or <a href='/register'>register</a>.");
  }

  const userUrls = urlsForUser(userId, urlDatabase);
  const templateVars = {
    user,
    urls: userUrls,
  };
  res.render("urls_index", templateVars);
});
app.get("/urls/:id", (req, res) => {
  const userId = req.session.user_id;
  const user = users[userId];
  const urlEntry = urlDatabase[req.params.id];

  if (!user) {
    return res.status(401).send("You must be logged in to view URLs. Please <a href='/login'>login</a> or <a href='/register'>register</a>.");
  }

  if (!urlEntry || urlEntry.userID !== userId) {
    return res.status(403).send("Access Denied. You are not the owner of this URL.");
  }

  const templateVars = { user, id: req.params.id, longURL: urlEntry.longURL };
  res.render("urls_show", templateVars);
});
app.post("/urls", (req, res, next) => {
  checkLoggedIn(req, res, next, users);
}, (req, res) => {
  let longURL = req.body.longURL;
  const userId = req.session.user_id;

  if (!longURL || longURL.trim() === "") {
    return res.status(400).send("Invalid URL");
  }

  const shortURL = generateRandomString(urlDatabase);
  urlDatabase[shortURL] = { longURL, userID: userId };

  res.redirect(`/urls/${shortURL}`);
});
app.put("/urls/:id", (req, res, next) => {
  checkLoggedIn(req, res, next, users);
}, (req, res) => {
  const shortURLId = req.params.id;
  const userId = req.session.user_id;
  const urlEntry = urlDatabase[shortURLId];

  if (!urlEntry) {
    return res.status(404).send("Short URL not found");
  }
  
  if (urlEntry.userID !== userId) {
    return res.status(403).send("Access Denied. You are not the owner of this URL.");
  }

  const newLongURL = req.body.newlongURL;
  urlDatabase[shortURLId].longURL = newLongURL;
  res.redirect("/urls");
});
app.delete("/urls/:id/", (req, res) => {
  const shortURL = req.params.id;
  const userId = req.session.user_id;
  const urlEntry = urlDatabase[shortURL];

  if (!userId) {
    return res.status(401).send("You must be logged in to delete URLs. Please <a href='/login'>login</a> or <a href='/register'>register</a>.");
  }

  if (!urlEntry) {
    return res.status(404).send("Short URL not found");
  }

  if (urlEntry.userID !== userId) {
    return res.status(403).send("Access Denied. You are not the owner of this URL.");
  }
  delete urlDatabase[shortURL];
  res.redirect("/urls");
});

//Redirect Route (shortURL)
app.get("/u/:id", (req, res) => {
  const shortURL = req.params.id;
  const urlEntry = urlDatabase[shortURL];

  if (urlEntry) {
    res.redirect(urlEntry.longURL);
  } else {
    res.status(404).send("Short URL not found");
  }
});

// Catch-all 404 Route
app.use((req, res) => {
  res.status(404).send("404: Page not found");
});

// General Error Handler
app.use((err, req, res,) => {
  console.error(err.stack);
  res.status(500).send("500: Internal Server Error");
});

//Start Server
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});