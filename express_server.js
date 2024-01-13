const express = require("express");
const cookieSession = require("cookie-session");
const bcrypt = require("bcryptjs");
const salt = bcrypt.genSaltSync(10);
const app = express();
const PORT = 8080;

// HELPER FUNCTIONS
const { getUserByEmail } = require("./helpers");

// MIDDLEWARE
app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
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

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/urls/new", checkLoggedIn, (req, res) => {
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

  const userUrls = urlsForUser(userId);
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

app.post("/urls", checkLoggedIn, (req, res) => {
  let longURL = req.body.longURL;
  const userId = req.session.user_id;

  // Check if longURL is undefined or an empty string
  if (!longURL || longURL.trim() === "") {
    return res.status(400).send("Invalid URL");
  }

  const shortURL = generateRandomString();
  urlDatabase[shortURL] = { longURL, userID: userId };

  res.redirect(`/urls/${shortURL}`);
});

app.post("/urls/:id/delete", (req, res) => {
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

app.post("/urls/:id", checkLoggedIn, (req, res) => {
  const shortURLId = req.params.id;
  const userId = req.session.user_id;
  const urlEntry = urlDatabase[shortURLId];

  if (!userId) {
    return res.status(401).send("You must be logged in to edit URLs. Please <a href='/login'>login</a> or <a href='/register'>register</a>.");
  }

  if (!urlEntry) {
    return res.status(404).send("Short URL not found");
  }
  
  if (urlEntry.userID !== userId) {
    return res.status(403).send("Access Denied. You are not the owner of this URL.");
  }

  const newLongURL = req.body.longURL;
  urlDatabase[shortURLId].longURL = newLongURL;
  // Redirect the client back to the /urls page
  res.redirect("/urls");
});

app.get("/u/:id", (req, res) => {
  const shortURL = req.params.id;
  const urlEntry = urlDatabase[shortURL];

  if (urlEntry) {
    res.redirect(urlEntry.longURL);
  } else {
    res.status(404).send("Short URL not found");
  }
});

app.get("/login", (req, res) => {
  const userId = req.session.user_id;
  const redirectedReason = req.query.redirected;

  let message = null;
  if (redirectedReason === "unauthorized") {
    message = "You must be logged in to create a new URL.";
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
  const id = generateRandomString();
  const email = req.body.email;
  const password = req.body.password;

  if (email === "" || password === "") {
    res.status(400).send("Please enter an email and password.");
  };

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

// FUNCTIONS
// generates a random unique id
function generateRandomString() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString;
  // ensures no unique id will show up more than once
  while (true) {
    randomString = ``;
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length)
      randomString += characters.charAt(randomIndex);
    }
    // exit the loop if the generated string does not exist in the database
    if (!urlDatabase[randomString] || !users[randomString]) {
      break;
    }
  }

  return randomString;
};

function checkLoggedIn(req, res, next) {
  const userId = req.session.user_id;

  if (userId && users[userId]) {
    next();
  } else {
    res.redirect("/login?redirected=unauthorized");
  }
};

function urlsForUser(id) {
  const userUrls = {};
  for (const shortURL in urlDatabase) {
    if (urlDatabase[shortURL].userID === id) {
      userUrls[shortURL] = urlDatabase[shortURL];
    }
  }
  return userUrls;
}
