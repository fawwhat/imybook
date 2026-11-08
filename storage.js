// storage.js - helper functions shared by BOTH pages
// (Local Storage = the place where the app saves data, even after we close the app)

const LIST_KEY = "imybookList";             // key for the reading list (CRUD records)
const SUGGEST_KEY = "imybookSuggestions";   // key for the saved suggestions

// get the reading list from Local Storage
function loadBooks() {
  const saved = localStorage.getItem(LIST_KEY);
  if (saved === null) {
    return [];   // nothing saved yet
  }
  try {
    return JSON.parse(saved);
  } catch (error) {
    return [];   // data is broken, so start with an empty list
  }
}

// save the reading list into Local Storage
function saveBooks(books) {
  localStorage.setItem(LIST_KEY, JSON.stringify(books));
}

// get the saved suggestions
function loadSuggestions() {
  const saved = localStorage.getItem(SUGGEST_KEY);
  if (saved === null) {
    return [];
  }
  try {
    return JSON.parse(saved);
  } catch (error) {
    return [];
  }
}

// save the suggestions
function saveSuggestions(list) {
  localStorage.setItem(SUGGEST_KEY, JSON.stringify(list));
}

// show a message on the screen. type = "success", "error" or "info"
function showMessage(element, text, type) {
  element.textContent = text;
  element.className = "message " + type;
}

// hide a message
function clearMessage(element) {
  element.textContent = "";
  element.className = "message hidden";
}

// change a date into a nice text, e.g. 27 October 2026
function formatDate(date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
