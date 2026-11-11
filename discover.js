// ===== iMyBook - Discover page =====
// This file does: API calls, suggestion logic, calculator, and saving to My Reading List

// ---------- Google Books API key ----------
const GOOGLE_BOOKS_KEY = "AIzaSyBnRPDCOJI45AiyNicF7plnjnZHtz9I_fM";

// ---------- get the HTML elements ----------
const searchType = document.getElementById("searchType");
const searchText = document.getElementById("searchText");
const genreSelect = document.getElementById("genreSelect");
const lengthChoice = document.getElementById("lengthChoice");
const minRating = document.getElementById("minRating");
const authorWanted = document.getElementById("authorWanted");
const searchBtn = document.getElementById("searchBtn");
const messageBox = document.getElementById("message");
const suggestSection = document.getElementById("suggestSection");
const suggestBox = document.getElementById("suggestBox");
const resultsBox = document.getElementById("results");
const savedSuggestBox = document.getElementById("savedSuggestions");
const clearSuggestBtn = document.getElementById("clearSuggestBtn");

// detail panel
const detailBox = document.getElementById("detailBox");
const dCover = document.getElementById("dCover");
const dTitle = document.getElementById("dTitle");
const dAuthor = document.getElementById("dAuthor");
const dDesc = document.getElementById("dDesc");
const dSubjects = document.getElementById("dSubjects");
const dGoogle = document.getElementById("dGoogle");
const dStats = document.getElementById("dStats");
const dBio = document.getElementById("dBio");
const closeBtn = document.getElementById("closeBtn");
const calcPages = document.getElementById("calcPages");
const calcPerDay = document.getElementById("calcPerDay");
const calcMinutes = document.getElementById("calcMinutes");
const calcBtn = document.getElementById("calcBtn");
const calcResult = document.getElementById("calcResult");
const rDays = document.getElementById("rDays");
const rTime = document.getElementById("rTime");
const rDate = document.getElementById("rDate");
const addBtn = document.getElementById("addBtn");
const detailMessage = document.getElementById("detailMessage");

// ---------- variables ----------
let foundBooks = [];     // books from the search
let selectedBook = null; // the book that the user clicked "View Details"


// =====================================================
// EVENTS
// =====================================================

// 1) change search type -> show the text box or the genre dropdown
searchType.addEventListener("change", () => {
  if (searchType.value == "genre") {
    genreSelect.classList.remove("hidden");
    searchText.classList.add("hidden");
  } else {
    genreSelect.classList.add("hidden");
    searchText.classList.remove("hidden");
    if (searchType.value == "title") {
      searchText.placeholder = "e.g. Harry Potter";
    } else {
      searchText.placeholder = "e.g. J.K. Rowling";
    }
  }
});

// 2) click Search button
searchBtn.addEventListener("click", () => {
  searchBooks();
});

// 3) press Enter in the text box
searchText.addEventListener("keydown", (event) => {
  if (event.key == "Enter") {
    searchBooks();
  }
});

// 4) click Calculate button
calcBtn.addEventListener("click", () => {
  calculateReading();
});

// 5) click Add to My Reading List
addBtn.addEventListener("click", () => {
  addToMyList();
});

// 6) close the detail panel
closeBtn.addEventListener("click", () => {
  detailBox.classList.add("hidden");
  selectedBook = null;
});

// 7) clear saved suggestions
clearSuggestBtn.addEventListener("click", () => {
  saveSuggestions([]);
  showSavedSuggestions();
  showMessage(messageBox, "Saved suggestions cleared.", "success");
});


// =====================================================
// API 1: Open Library Search API  (get the list of books)
// =====================================================
function searchBooks() {
  const type = searchType.value;
  let keyword = "";

  if (type == "genre") {
    keyword = genreSelect.value;
  } else {
    keyword = searchText.value.trim();
  }

  // input validation
  if (keyword == "") {
    showMessage(messageBox, "Please type a title or an author first.", "error");
    return;
  }
  if (keyword.length < 2) {
    showMessage(messageBox, "Please type at least 2 letters.", "error");
    return;
  }

  // choose the search field for the API
  let field = "title";
  if (type == "author") {
    field = "author";
  } else if (type == "genre") {
    field = "subject";
  }

  const url = "https://openlibrary.org/search.json?" + field + "=" + encodeURIComponent(keyword) +
    "&limit=20&fields=key,title,author_name,first_publish_year,cover_i,number_of_pages_median,ratings_average,edition_count,subject";

  showMessage(messageBox, "Searching, please wait...", "info");
  resultsBox.innerHTML = "";
  suggestSection.classList.add("hidden");

  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error("Server error " + response.status);
      }
      return response.json();
    })
    .then(data => {
      // change the JSON into my own simple book objects
      foundBooks = [];
      for (let i = 0; i < data.docs.length; i++) {
        const d = data.docs[i];

        let authorName = "Unknown author";
        if (d.author_name && d.author_name.length > 0) {
          authorName = d.author_name[0];
        }

        let pages = null;
        if (d.number_of_pages_median) {
          pages = d.number_of_pages_median;
        }

        let rating = null;
        if (d.ratings_average) {
          rating = d.ratings_average;
        }

        let coverId = null;
        if (d.cover_i) {
          coverId = d.cover_i;
        }

        let editions = 0;
        if (d.edition_count) {
          editions = d.edition_count;
        }

        // the work key must look like /works/OL123W
        let workKey = d.key;
        if (workKey.indexOf("/works/") != 0) {
          workKey = "/works/" + workKey;
        }

        // subjects of the book (used by the genre check)
        let subjects = [];
        if (d.subject) {
          subjects = d.subject;
        }

        const book = {
          key: workKey,
          title: d.title,
          author: authorName,
          year: d.first_publish_year,
          coverId: coverId,
          pages: pages,
          rating: rating,
          editions: editions,
          subjects: subjects
        };
        foundBooks.push(book);
      }

      // empty result
      if (foundBooks.length == 0) {
        showMessage(messageBox, "No books found for \"" + keyword + "\". Try another keyword.", "error");
        return;
      }

      showMessage(messageBox, "Found " + foundBooks.length + " books for \"" + keyword + "\".", "success");
      showBooks();
      makeSuggestions(type, keyword);
    })
    .catch(error => {
      // failed API request (no internet, server down, etc.)
      showMessage(messageBox, "Could not get data from the book API. Please check your internet and try again. (" + error.message + ")", "error");
    });
}


// show the cover image (API: Open Library Covers API)
function makeCover(coverId, title, size) {
  if (coverId == null) {
    const empty = document.createElement("div");
    empty.className = "cover no-cover";
    empty.textContent = "No cover";
    return empty;
  }
  const img = document.createElement("img");
  img.className = "cover";
  img.alt = "Cover of " + title;
  img.src = "https://covers.openlibrary.org/b/id/" + coverId + "-" + size + ".jpg";
  return img;
}

// show all the search results as cards
function showBooks() {
  resultsBox.innerHTML = "";

  for (let i = 0; i < foundBooks.length; i++) {
    const book = foundBooks[i];

    const card = document.createElement("div");
    card.className = "book-card";

    card.appendChild(makeCover(book.coverId, book.title, "M"));

    const title = document.createElement("h3");
    title.textContent = book.title;
    card.appendChild(title);

    const author = document.createElement("p");
    author.textContent = book.author;
    card.appendChild(author);

    const info = document.createElement("p");
    info.className = "hint";
    let infoText = "";
    if (book.year) {
      infoText += "First published " + book.year + ". ";
    }
    if (book.pages != null) {
      infoText += book.pages + " pages. ";
    } else {
      infoText += "Pages not listed. ";
    }
    if (book.rating != null) {
      infoText += "Rating " + book.rating.toFixed(1) + " / 5";
    } else {
      infoText += "No rating yet";
    }
    info.textContent = infoText;
    card.appendChild(info);

    const detailBtn = document.createElement("button");
    detailBtn.className = "btn small";
    detailBtn.textContent = "View Details";
    detailBtn.addEventListener("click", () => {
      showDetails(book);
    });
    card.appendChild(detailBtn);

    resultsBox.appendChild(card);
  }
}


// =====================================================
// SUGGESTION LOGIC (my own if / else if / else statements)
// It checks: genre/author/title, book length, rating, and popularity
// =====================================================
function makeSuggestions(type, keyword) {
  const lengthWanted = lengthChoice.value;        // any, short, medium, long
  const ratingWanted = parseFloat(minRating.value); // 0, 3 or 4
  const preferredAuthor = authorWanted.value.trim().toLowerCase();  // optional
  let suggestions = [];

  for (let i = 0; i < foundBooks.length; i++) {
    const book = foundBooks[i];
    let score = 0;
    let reason = "";
    let skip = false;   // true = this book is NOT suitable

    // --- condition 1: book length ---
    if (lengthWanted == "any") {
      score += 1;
    } else if (book.pages == null) {
      skip = true;      // we cannot check the length, so do not suggest it
    } else if (lengthWanted == "short") {
      if (book.pages <= 250) {
        score += 2;
        reason += "Short read (" + book.pages + " pages). ";
      } else {
        skip = true;
      }
    } else if (lengthWanted == "medium") {
      if (book.pages > 250 && book.pages <= 450) {
        score += 2;
        reason += "Medium length (" + book.pages + " pages). ";
      } else {
        skip = true;
      }
    } else if (lengthWanted == "long") {
      if (book.pages > 450) {
        score += 2;
        reason += "Long read (" + book.pages + " pages). ";
      } else {
        skip = true;
      }
    }

    // --- condition 2: rating ---
    if (book.rating == null) {
      if (ratingWanted > 0) {
        skip = true;    // user wants a minimum rating but this book has none
      }
    } else if (book.rating < ratingWanted) {
      skip = true;      // rating is too low
    } else if (book.rating >= 4) {
      score += 3;
      reason += "Highly rated (" + book.rating.toFixed(1) + " / 5). ";
    } else if (book.rating >= 3) {
      score += 2;
      reason += "Good rating (" + book.rating.toFixed(1) + " / 5). ";
    } else {
      score += 1;
    }

    // --- condition 3: genre / author / title match ---
    if (type == "genre") {
      // check if one of the book's subjects really has the genre word
      let genreFound = false;
      for (let s = 0; s < book.subjects.length; s++) {
        const subjectText = book.subjects[s].toLowerCase().replace("-", " ");
        if (subjectText.includes(keyword.toLowerCase())) {
          genreFound = true;
        }
      }
      if (genreFound) {
        score += 2;
        reason += "Listed under the " + keyword + " genre. ";
      } else {
        score += 1;
        reason += "Related to " + keyword + ". ";
      }
    } else if (type == "author") {
      if (book.author.toLowerCase().includes(keyword.toLowerCase())) {
        score += 2;
        reason += "Written by " + book.author + ". ";
      }
    } else {
      score += 1;
      reason += "Matches your title search. ";
    }

    // --- condition 4: preferred author (optional box) ---
    if (preferredAuthor != "") {
      if (book.author.toLowerCase().includes(preferredAuthor)) {
        score += 2;
        reason += "Written by your preferred author. ";
      }
    }

    // --- condition 5: popular book (many editions) ---
    if (book.editions >= 30) {
      score += 1;
      reason += "Popular book (" + book.editions + " editions). ";
    }

    // a book needs at least 3 points to be suggested
    if (skip == false && score >= 3) {
      suggestions.push({
        title: book.title,
        author: book.author,
        pages: book.pages,
        rating: book.rating,
        score: score,
        reason: reason,
        searchedFor: keyword,
        date: formatDate(new Date())
      });
    }
  }

  // sort the suggestions from highest score to lowest score (bubble sort)
  for (let a = 0; a < suggestions.length - 1; a++) {
    for (let b = 0; b < suggestions.length - 1 - a; b++) {
      if (suggestions[b].score < suggestions[b + 1].score) {
        const temp = suggestions[b];
        suggestions[b] = suggestions[b + 1];
        suggestions[b + 1] = temp;
      }
    }
  }

  // only keep the top 3
  const topThree = [];
  for (let k = 0; k < suggestions.length && k < 3; k++) {
    topThree.push(suggestions[k]);
  }

  suggestSection.classList.remove("hidden");
  suggestBox.innerHTML = "";

  if (topThree.length == 0) {
    // fallback message when nothing is suitable
    const none = document.createElement("p");
    none.textContent = "Sorry, no suitable book found. Try another length, a lower rating, or a different keyword.";
    suggestBox.appendChild(none);
    return;
  }

  for (let m = 0; m < topThree.length; m++) {
    const item = document.createElement("div");
    item.className = "suggest-item";

    const t = document.createElement("h3");
    t.textContent = (m + 1) + ". " + topThree[m].title + " - " + topThree[m].author;
    item.appendChild(t);

    const r = document.createElement("p");
    r.textContent = topThree[m].reason;
    item.appendChild(r);

    suggestBox.appendChild(item);
  }

  // save the suggestions in Local Storage
  saveSuggestions(topThree);
  showSavedSuggestions();
}

// show the suggestions that are saved in Local Storage
function showSavedSuggestions() {
  const saved = loadSuggestions();
  savedSuggestBox.innerHTML = "";

  if (saved.length == 0) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = "No saved suggestions yet. Search for a book to get some.";
    savedSuggestBox.appendChild(empty);
    return;
  }

  for (let i = 0; i < saved.length; i++) {
    const item = document.createElement("div");
    item.className = "suggest-item";

    const t = document.createElement("h3");
    t.textContent = saved[i].title + " - " + saved[i].author;
    item.appendChild(t);

    const r = document.createElement("p");
    r.textContent = saved[i].reason;
    item.appendChild(r);

    const d = document.createElement("p");
    d.className = "hint";
    d.textContent = "Searched for \"" + saved[i].searchedFor + "\" on " + saved[i].date;
    item.appendChild(d);

    savedSuggestBox.appendChild(item);
  }
}


// =====================================================
// DETAIL PANEL (uses 4 more APIs)
// =====================================================
function showDetails(book) {
  selectedBook = book;
  detailBox.classList.remove("hidden");

  dTitle.textContent = book.title;
  dAuthor.textContent = "by " + book.author;
  dCover.innerHTML = "";
  dCover.appendChild(makeCover(book.coverId, book.title, "L"));

  dDesc.textContent = "Loading description...";
  dSubjects.textContent = "";
  dGoogle.textContent = "Loading...";
  dStats.textContent = "Loading...";
  dBio.textContent = "Loading...";

  // reset the calculator
  if (book.pages != null) {
    calcPages.value = book.pages;
  } else {
    calcPages.value = "";
  }
  calcPerDay.value = 20;
  calcMinutes.value = 2;
  calcResult.classList.add("hidden");
  clearMessage(detailMessage);

  loadDescription(book);
  loadGoogleInfo(book);
  loadReadingStats(book);
  loadAuthorBio(book);

  detailBox.scrollIntoView();
}

// API 3: Open Library Works API (description and subjects)
function loadDescription(book) {
  fetch("https://openlibrary.org" + book.key + ".json")
    .then(response => {
      if (!response.ok) {
        throw new Error("Server error " + response.status);
      }
      return response.json();
    })
    .then(data => {
      if (selectedBook != book) { return; }   // user already clicked another book

      // the description can be a string OR an object with "value"
      let text = "";
      if (typeof data.description == "string") {
        text = data.description;
      } else if (data.description && data.description.value) {
        text = data.description.value;
      }

      if (text == "") {
        dDesc.textContent = "No description is available for this book.";
      } else {
        if (text.length > 700) {
          text = text.substring(0, 700) + "...";
        }
        dDesc.textContent = text;
      }

      // show the first 6 subjects
      if (data.subjects && data.subjects.length > 0) {
        let subjectText = "Subjects: ";
        for (let i = 0; i < data.subjects.length && i < 6; i++) {
          subjectText += data.subjects[i];
          if (i < data.subjects.length - 1 && i < 5) {
            subjectText += ", ";
          }
        }
        dSubjects.textContent = subjectText;
      }
    })
    .catch(error => {
      if (selectedBook != book) { return; }
      dDesc.textContent = "Could not load the description. (" + error.message + ")";
    });
}

// API 4: Google Books API (rating, page count, publisher)
function loadGoogleInfo(book) {
  let url = "https://www.googleapis.com/books/v1/volumes?q=intitle:" + encodeURIComponent(book.title) +
    "+inauthor:" + encodeURIComponent(book.author) + "&maxResults=1";

  // add the key only if the user pasted a real one
  if (GOOGLE_BOOKS_KEY != "PASTE_YOUR_KEY_HERE" && GOOGLE_BOOKS_KEY != "") {
    url += "&key=" + GOOGLE_BOOKS_KEY;
  }

  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error("Server error " + response.status);
      }
      return response.json();
    })
    .then(data => {
      if (selectedBook != book) { return; }

      if (!data.items || data.items.length == 0) {
        dGoogle.textContent = "No Google Books information found for this book.";
        return;
      }

      const info = data.items[0].volumeInfo;
      let text = "";
      if (info.averageRating) {
        text += "Average rating: " + info.averageRating + " / 5";
        if (info.ratingsCount) {
          text += " (" + info.ratingsCount + " ratings)";
        }
        text += ". ";
      } else {
        text += "No Google rating yet. ";
      }
      if (info.pageCount) {
        text += "Pages: " + info.pageCount + ". ";
        // if Open Library had no page count, use this one in the calculator
        if (calcPages.value == "") {
          calcPages.value = info.pageCount;
        }
      }
      if (info.publisher) {
        text += "Publisher: " + info.publisher + ". ";
      }
      dGoogle.textContent = text;
    })
    .catch(error => {
      if (selectedBook != book) { return; }
      dGoogle.textContent = "Could not load Google Books information. (" + error.message + ")";
    });
}

// API 5: Open Library Reading Stats API (how many readers want to read / are reading / finished it)
function loadReadingStats(book) {
  fetch("https://openlibrary.org" + book.key + "/bookshelves.json")
    .then(response => {
      if (!response.ok) {
        throw new Error("Server error " + response.status);
      }
      return response.json();
    })
    .then(data => {
      if (selectedBook != book) { return; }

      if (!data.counts) {
        dStats.textContent = "No reader statistics found for this book.";
        return;
      }

      let wantToRead = 0;
      let reading = 0;
      let alreadyRead = 0;
      if (data.counts.want_to_read) { wantToRead = data.counts.want_to_read; }
      if (data.counts.currently_reading) { reading = data.counts.currently_reading; }
      if (data.counts.already_read) { alreadyRead = data.counts.already_read; }

      dStats.textContent = wantToRead + " readers want to read it, " + reading +
        " are reading it now, and " + alreadyRead + " have finished it.";
    })
    .catch(error => {
      if (selectedBook != book) { return; }
      dStats.textContent = "Reader statistics are not available. (" + error.message + ")";
    });
}

// API 6: Wikipedia REST API (short info about the author)
function loadAuthorBio(book) {
  if (book.author == "Unknown author") {
    dBio.textContent = "The author of this book is unknown.";
    return;
  }

  fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(book.author))
    .then(response => {
      if (!response.ok) {
        throw new Error("No Wikipedia page found");
      }
      return response.json();
    })
    .then(data => {
      if (selectedBook != book) { return; }

      if (data.extract && data.type == "standard") {
        let text = data.extract;
        if (text.length > 500) {
          text = text.substring(0, 500) + "...";
        }
        dBio.textContent = text;
      } else {
        dBio.textContent = "No clear author information found on Wikipedia.";
      }
    })
    .catch(error => {
      if (selectedBook != book) { return; }
      dBio.textContent = "Author information is not available. (" + error.message + ")";
    });
}


// =====================================================
// CALCULATION: how many days to finish the book?
// =====================================================
function calculateReading() {
  const totalPages = parseInt(calcPages.value);
  const perDay = parseInt(calcPerDay.value);
  const minutesPerPage = parseFloat(calcMinutes.value);

  // input validation
  if (isNaN(totalPages) || isNaN(perDay) || isNaN(minutesPerPage)) {
    showMessage(detailMessage, "Please fill in total pages, pages per day and minutes per page.", "error");
    calcResult.classList.add("hidden");
    return;
  }
  if (totalPages <= 0 || perDay <= 0 || minutesPerPage <= 0) {
    showMessage(detailMessage, "All numbers must be more than 0.", "error");
    calcResult.classList.add("hidden");
    return;
  }
  if (totalPages > 10000) {
    showMessage(detailMessage, "Total pages cannot be more than 10000.", "error");
    calcResult.classList.add("hidden");
    return;
  }

  // if the user reads more pages per day than the book has, it is still only 1 day
  const days = Math.ceil(totalPages / perDay);

  // total reading time
  const totalMinutes = Math.round(totalPages * minutesPerPage);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // finish date (if I start today, day 1 is today)
  const finishDate = new Date();
  finishDate.setDate(finishDate.getDate() + days - 1);

  rDays.textContent = "Days to finish: " + days + " day(s) at " + perDay + " pages per day";
  rTime.textContent = "Total reading time: " + hours + " hour(s) " + minutes + " minute(s)";
  rDate.textContent = "Expected finish date (if I start today): " + formatDate(finishDate);
  calcResult.classList.remove("hidden");
  clearMessage(detailMessage);
}


// =====================================================
// CREATE: add the selected book into My Reading List (Local Storage)
// =====================================================
function addToMyList() {
  if (selectedBook == null) {
    return;
  }

  const totalPages = parseInt(calcPages.value);
  let perDay = parseInt(calcPerDay.value);

  // validation
  if (isNaN(totalPages) || totalPages <= 0) {
    showMessage(detailMessage, "Please fill in the total pages first (it is needed for the reading list).", "error");
    return;
  }
  if (isNaN(perDay) || perDay <= 0) {
    perDay = 20;
  }

  const books = loadBooks();

  // check duplicate
  for (let i = 0; i < books.length; i++) {
    if (books[i].title.toLowerCase() == selectedBook.title.toLowerCase() &&
        books[i].author.toLowerCase() == selectedBook.author.toLowerCase()) {
      showMessage(detailMessage, "This book is already in your reading list.", "error");
      return;
    }
  }

  const newBook = {
    id: Date.now(),
    title: selectedBook.title,
    author: selectedBook.author,
    totalPages: totalPages,
    currentPage: 0,
    pagesPerDay: perDay,
    status: "Want to Read",
    notes: "",
    dateAdded: formatDate(new Date())
  };

  books.push(newBook);
  saveBooks(books);
  showMessage(detailMessage, "\"" + newBook.title + "\" was added to My Reading List.", "success");
}


// show saved suggestions when the page opens
showSavedSuggestions();
