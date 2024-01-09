const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();
const PORT = 8080; // default port 8080

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

//URL DATABASE
const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};
//USER DATABASE
const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk",
  },
};

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

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});
app.get("/urls/new", (req, res) => {
  const templateVars = {
    username: req.cookies["username"]
  };
  res.render("urls_new", templateVars);
});

app.get("/urls", (req, res) => {
  const templateVars = {
    username: req.cookies["username"],
    urls: urlDatabase
  };
  res.render("urls_index", templateVars);
});

app.get("/urls/:id", (req, res) => {
  const longURL = urlDatabase[req.params.id];
  const templateVars = { username: req.cookies["username"], id: req.params.id, longURL: longURL };
  res.render("urls_show", templateVars);
});

app.post("/urls", (req, res) => {
  let longURL = req.body.longURL;
//check if longURL is undefined or an empty string
  if (!longURL || longURL.trim() === "") {
    return res.status(400).send("Invalid URL");
  }

  const shortURL = generateRandomString();
  urlDatabase[shortURL] = req.body.longURL;
  console.log(req.body);
  console.log(`Short URL: ${shortURL}`);

  res.redirect(`/urls/${shortURL}`);
});

app.post("/urls/:id/delete", (req, res) => {
  const shortURL = req.params.id;

  // Check if the shortURL exists in the urlDatabase
  if (urlDatabase.hasOwnProperty(shortURL)) {
    delete urlDatabase[shortURL]; // Remove the URL
    res.redirect("/urls"); // Redirect back to the urls_index page
  } else {
    res.status(404).send("Short URL not found"); // Handle the case where the short URL doesn't exist
  }
});

app.post("/urls/:id", (req, res) => {
  const shortURLId = req.params.id;
  const newLongURL = req.body.newLongURL;

  // Update the long URL value in your urlDatabase
  urlDatabase[shortURLId] = newLongURL;

  // Redirect the client back to the /urls page
  res.redirect("/urls");
});

app.get("/u/:id", (req, res) => {
  const shortURL = req.params.id;
  const longURL = urlDatabase[shortURL];

  if (longURL) {
    res.redirect(longURL);
  } else {
    res.status(404).send("Short URL not found");
  }
});

app.post("/login", (req, res) => {
  const username = req.body.username;
  res.cookie(`username`, username);
  res.redirect(`/urls`);
});

app.post("/logout", (req, res) => {
  res.clearCookie("username");
  res.redirect(`/urls`);
});

app.get("/register", (req, res) => {
  const templateVars = {
    email: "",
    password: "",
  };
  res.render("register", templateVars);
});

app.post("/register", (req, res) => {
  const id = generateRandomString();
  const email = req.body.email;
  const password = req.body.password;
  const user = { id, email, password };

  users[id] = user;
  res.cookie("user_id", id);
  res.redirect("/urls");

});

//FUNCTIONS
//generates a random unique id
function generateRandomString() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString;
  //ensures no unique id will show up more than once
  while (true) {
    randomString = ``;
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length)
      randomString += characters.charAt(randomIndex);
    }
    // exit the loop if the generated string does not exist in database
    if (!urlDatabase[randomString] || !users[randomString]) {
      break;
    }
  }

  return randomString;
}