// ===== iMyBook - My Reading List page =====
// This file does the CRUD: Create, Read, Update, Delete (saved in Local Storage)

// ---------- get the HTML elements ----------
const titleInput = document.getElementById("titleInput");
const authorInput = document.getElementById("authorInput");
const pagesInput = document.getElementById("pagesInput");
const perDayInput = document.getElementById("perDayInput");
const statusInput = document.getElementById("statusInput");
const notesInput = document.getElementById("notesInput");
const addBookBtn = document.getElementById("addBookBtn");
const messageBox = document.getElementById("message");
const listMessage = document.getElementById("listMessage");
const statsBox = document.getElementById("statsBox");
const filterText = document.getElementById("filterText");
const filterStatus = document.getElementById("filterStatus");
const bookList = document.getElementById("bookList");

// ---------- variables ----------
let books = loadBooks();   // READ the saved books from Local Storage when the page opens
let editingId = null;      // id of the book that is being edited
let deletingId = null;     // id of the book that is waiting for delete confirmation


// =====================================================
// EVENTS
// =====================================================
addBookBtn.addEventListener("click", () => {
  addBook();
});

filterText.addEventListener("input", () => {
  showBooks();
});

filterStatus.addEventListener("change", () => {
  showBooks();
});


// =====================================================
// VALIDATION (used by both Add and Update)
// returns an error text, or "" if everything is OK
// =====================================================
function checkBook(title, author, totalPages, currentPage, perDay) {
  if (title == "") {
    return "Title cannot be empty.";
  }
  if (author == "") {
    return "Author cannot be empty.";
  }
  if (isNaN(totalPages) || totalPages <= 0) {
    return "Total pages must be a number more than 0.";
  }
  if (totalPages > 10000) {
    return "Total pages cannot be more than 10000.";
  }
  if (isNaN(currentPage) || currentPage < 0) {
    return "Current page must be 0 or more.";
  }
  if (currentPage > totalPages) {
    return "Current page cannot be more than total pages.";
  }
  if (isNaN(perDay) || perDay <= 0) {
    return "Pages per day must be a number more than 0.";
  }
  return "";
}


// =====================================================
// CREATE
// =====================================================
function addBook() {
  const title = titleInput.value.trim();
  const author = authorInput.value.trim();
  const totalPages = parseInt(pagesInput.value);
  const perDay = parseInt(perDayInput.value);
  const status = statusInput.value;
  const notes = notesInput.value.trim();

  const error = checkBook(title, author, totalPages, 0, perDay);
  if (error != "") {
    showMessage(messageBox, error, "error");
    return;
  }

  // check duplicate
  for (let i = 0; i < books.length; i++) {
    if (books[i].title.toLowerCase() == title.toLowerCase() &&
        books[i].author.toLowerCase() == author.toLowerCase()) {
      showMessage(messageBox, "This book is already in your reading list.", "error");
      return;
    }
  }

  let currentPage = 0;
  if (status == "Finished") {
    currentPage = totalPages;   // finished book = all pages read
  }

  const newBook = {
    id: Date.now(),
    title: title,
    author: author,
    totalPages: totalPages,
    currentPage: currentPage,
    pagesPerDay: perDay,
    status: status,
    notes: notes,
    dateAdded: formatDate(new Date())
  };

  books.push(newBook);
  saveBooks(books);

  // clear the form
  titleInput.value = "";
  authorInput.value = "";
  pagesInput.value = "";
  perDayInput.value = 20;
  statusInput.value = "Want to Read";
  notesInput.value = "";

  showMessage(messageBox, "\"" + title + "\" was added to your reading list.", "success");
  showBooks();
}


// =====================================================
// READ (show all the books on the screen)
// =====================================================
function showBooks() {
  bookList.innerHTML = "";
  showStats();

  const searchWord = filterText.value.trim().toLowerCase();
  const statusWanted = filterStatus.value;
  let shown = 0;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];

    // filter by status
    if (statusWanted != "All" && book.status != statusWanted) {
      continue;
    }
    // filter by search word
    if (searchWord != "") {
      const text = book.title.toLowerCase() + " " + book.author.toLowerCase();
      if (text.includes(searchWord) == false) {
        continue;
      }
    }

    shown++;
    if (book.id == editingId) {
      bookList.appendChild(makeEditCard(book));
    } else {
      bookList.appendChild(makeBookCard(book));
    }
  }

  // empty messages
  if (books.length == 0) {
    bookList.innerHTML = "<p class='empty'>Your reading list is empty. Add a book above or from the Discover page.</p>";
  } else if (shown == 0) {
    bookList.innerHTML = "<p class='empty'>No books match your search or filter.</p>";
  }
}

// small calculation: total progress of all books
function showStats() {
  let finished = 0;
  let pagesRead = 0;
  let pagesTotal = 0;

  for (let i = 0; i < books.length; i++) {
    if (books[i].status == "Finished") {
      finished++;
    }
    pagesRead += books[i].currentPage;
    pagesTotal += books[i].totalPages;
  }

  let percent = 0;
  if (pagesTotal > 0) {
    percent = (pagesRead / pagesTotal) * 100;
  }

  statsBox.textContent = "Books: " + books.length + "  |  Finished: " + finished +
    "  |  Pages read: " + pagesRead + " of " + pagesTotal + " pages (" + percent.toFixed(1) + "%)";
}

// make the normal card for one book
function makeBookCard(book) {
  const card = document.createElement("div");
  card.className = "list-card";

  const title = document.createElement("h3");
  title.textContent = book.title;
  card.appendChild(title);

  const author = document.createElement("p");
  author.textContent = "by " + book.author;
  card.appendChild(author);

  const status = document.createElement("span");
  status.className = "badge " + book.status.replace(/ /g, "-");
  status.textContent = book.status;
  card.appendChild(status);

  // calculation: progress, pages left, days left
  const percent = (book.currentPage / book.totalPages) * 100;
  const pagesLeft = book.totalPages - book.currentPage;
  const daysLeft = Math.ceil(pagesLeft / book.pagesPerDay);

  // progress bar
  const bar = document.createElement("div");
  bar.className = "bar";
  const fill = document.createElement("div");
  fill.className = "fill";
  fill.style.width = percent + "%";
  bar.appendChild(fill);
  card.appendChild(bar);

  const progress = document.createElement("p");
  progress.textContent = "Progress: " + book.currentPage + " / " + book.totalPages + " pages (" + percent.toFixed(1) + "%)";
  card.appendChild(progress);

  const left = document.createElement("p");
  if (pagesLeft == 0) {
    left.textContent = "You finished this book. Well done!";
  } else {
    left.textContent = "Pages left: " + pagesLeft + " pages. About " + daysLeft + " day(s) at " + book.pagesPerDay + " pages per day.";
  }
  card.appendChild(left);

  if (book.notes != "") {
    const notes = document.createElement("p");
    notes.className = "hint";
    notes.textContent = "Notes: " + book.notes;
    card.appendChild(notes);
  }

  const added = document.createElement("p");
  added.className = "hint";
  added.textContent = "Added on " + book.dateAdded;
  card.appendChild(added);

  // buttons
  if (book.id == deletingId) {
    // ask the user to confirm before delete
    const ask = document.createElement("p");
    ask.className = "warning";
    ask.textContent = "Delete this book from your list?";
    card.appendChild(ask);

    const yesBtn = document.createElement("button");
    yesBtn.className = "btn danger small";
    yesBtn.textContent = "Yes, delete";
    yesBtn.addEventListener("click", () => {
      deleteBook(book.id);
    });
    card.appendChild(yesBtn);

    const noBtn = document.createElement("button");
    noBtn.className = "btn small";
    noBtn.textContent = "No, keep it";
    noBtn.addEventListener("click", () => {
      deletingId = null;
      showBooks();
    });
    card.appendChild(noBtn);
  } else {
    const editBtn = document.createElement("button");
    editBtn.className = "btn small";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => {
      editingId = book.id;
      deletingId = null;
      showBooks();
    });
    card.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn danger small";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      deletingId = book.id;
      editingId = null;
      showBooks();
    });
    card.appendChild(deleteBtn);
  }

  return card;
}


// =====================================================
// UPDATE (edit form shows inside the card)
// =====================================================

// helper: make one label + input and put it in the card
function makeField(card, labelText, inputType, value) {
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.type = inputType;
  input.value = value;
  card.appendChild(label);
  card.appendChild(input);
  return input;
}

function makeEditCard(book) {
  const card = document.createElement("div");
  card.className = "list-card editing";

  const heading = document.createElement("h3");
  heading.textContent = "Edit book";
  card.appendChild(heading);

  const titleEdit = makeField(card, "Title", "text", book.title);
  const authorEdit = makeField(card, "Author", "text", book.author);
  const pagesEdit = makeField(card, "Total pages", "number", book.totalPages);
  const currentEdit = makeField(card, "Current page (pages I have read)", "number", book.currentPage);
  const perDayEdit = makeField(card, "Pages per day", "number", book.pagesPerDay);

  const statusLabel = document.createElement("label");
  statusLabel.textContent = "Status";
  card.appendChild(statusLabel);
  const statusEdit = document.createElement("select");
  const options = ["Want to Read", "Reading", "Finished"];
  for (let i = 0; i < options.length; i++) {
    const option = document.createElement("option");
    option.value = options[i];
    option.textContent = options[i];
    statusEdit.appendChild(option);
  }
  statusEdit.value = book.status;
  card.appendChild(statusEdit);

  const notesEdit = makeField(card, "Notes", "text", book.notes);

  const editMessage = document.createElement("div");
  editMessage.className = "message hidden";
  card.appendChild(editMessage);

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn primary small";
  saveBtn.textContent = "Save changes";
  saveBtn.addEventListener("click", () => {
    const newTitle = titleEdit.value.trim();
    const newAuthor = authorEdit.value.trim();
    const newPages = parseInt(pagesEdit.value);
    let newCurrent = parseInt(currentEdit.value);
    const newPerDay = parseInt(perDayEdit.value);
    let newStatus = statusEdit.value;

    const error = checkBook(newTitle, newAuthor, newPages, newCurrent, newPerDay);
    if (error != "") {
      showMessage(editMessage, error, "error");
      return;
    }

    // status rules
    if (newStatus == "Finished") {
      newCurrent = newPages;
    } else if (newCurrent == newPages) {
      newStatus = "Finished";
    }

    // update the book object
    book.title = newTitle;
    book.author = newAuthor;
    book.totalPages = newPages;
    book.currentPage = newCurrent;
    book.pagesPerDay = newPerDay;
    book.status = newStatus;
    book.notes = notesEdit.value.trim();

    saveBooks(books);
    editingId = null;
    showBooks();
    showMessage(listMessage, "\"" + newTitle + "\" was updated.", "success");
  });
  card.appendChild(saveBtn);

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn small";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => {
    editingId = null;
    showBooks();
  });
  card.appendChild(cancelBtn);

  return card;
}


// =====================================================
// DELETE
// =====================================================
function deleteBook(id) {
  let removedTitle = "";
  const newList = [];

  // copy every book except the one we want to delete
  for (let i = 0; i < books.length; i++) {
    if (books[i].id == id) {
      removedTitle = books[i].title;
    } else {
      newList.push(books[i]);
    }
  }

  books = newList;
  saveBooks(books);
  deletingId = null;
  showBooks();
  showMessage(listMessage, "\"" + removedTitle + "\" was deleted from your list.", "success");
}


// show the list when the page opens
showBooks();
