const express = require("express");
const app = express();
const PORT = 8080; // default port 8080

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

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
  res.render("urls_new");
});

app.get("/urls", (req, res) => {
  const templateVars = { urls: urlDatabase };
  res.render("urls_index", templateVars);
});

app.get("/urls/:id", (req, res) => {
  const longURL = urlDatabase[req.params.id];
  const templateVars = { id: req.params.id, longURL: longURL };
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

app.get("/u/:id", (req, res) => {
  const shortURL = req.params.id;
  const longURL = urlDatabase[shortURL];
  
  if (longURL) {
    res.redirect(longURL);
  } else {
    res.status(404).send("Short URL not found");
  }
});

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
    if (!urlDatabase[randomString]) {
      break;
    }
  }

  return randomString;
}