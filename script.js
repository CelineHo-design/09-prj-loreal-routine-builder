/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const selectionCount = document.getElementById("selectionCount");
const generateRoutineBtn = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");
const clearSelectionsBtn = document.getElementById("clearSelectionsBtn");
const productSearchInput = document.getElementById("productSearchInput");
const rtlToggle = document.getElementById("rtlToggle");
const savedSelectionsHint = document.getElementById("savedSelectionsHint");
const searchResultsCount = document.getElementById("searchResultsCount");

const WORKER_URL = window.WORKER_URL || "https://loreal.czh8637.workers.dev/";
const STORAGE_KEY = "lorealRoutineSelections";
const RTL_STORAGE_KEY = "lorealRoutineRTL";
const selectedProductIds = new Set();
let allProducts = [];
let routineGenerated = false;
let isRTL = false;
let messages = [
  {
    role: "system",
    content:
      "You are a warm, expert L'Oréal skincare and beauty advisor. Help users build a polished routine with the products they selected, and keep your advice concise and practical. Only answer questions related to the generated routine or to beauty topics such as skincare, haircare, makeup, fragrance, and other related beauty care areas. If the user asks something unrelated, politely redirect them back to beauty advice.",
  },
];

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  if (!allProducts.length) {
    const response = await fetch("products.json");
    const data = await response.json();
    allProducts = data.products;
  }

  return allProducts;
}

/* Apply the saved RTL layout preference */
function applyRTLLayout(isRTLMode) {
  document.documentElement.dir = isRTLMode ? "rtl" : "ltr";
  rtlToggle.textContent = isRTLMode ? "Switch to LTR" : "Switch to RTL";
  rtlToggle.setAttribute("aria-pressed", String(isRTLMode));
}

/* Format category labels for display */
function formatCategory(category) {
  return category
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/* Get the currently selected products */
function getSelectedProducts() {
  return allProducts.filter((product) => selectedProductIds.has(product.id));
}

/* Save the selected product IDs in localStorage for page reloads */
function saveSelectedProducts() {
  try {
    if (!selectedProductIds.size) {
      localStorage.removeItem(STORAGE_KEY);
      savedSelectionsHint.hidden = true;
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify([...selectedProductIds]));
  } catch (error) {
    console.warn("Could not save selections:", error);
  }
}

/* Restore the selected product IDs from localStorage */
function loadSelectedProducts() {
  try {
    const savedSelections = localStorage.getItem(STORAGE_KEY);

    if (!savedSelections) {
      savedSelectionsHint.hidden = true;
      return;
    }

    const savedIds = JSON.parse(savedSelections);
    if (Array.isArray(savedIds)) {
      selectedProductIds.clear();
      savedIds.forEach((id) => selectedProductIds.add(Number(id)));

      if (savedIds.length) {
        savedSelectionsHint.textContent =
          "Saved selections restored from your last visit.";
        savedSelectionsHint.hidden = false;
      } else {
        savedSelectionsHint.hidden = true;
      }
    }
  } catch (error) {
    console.warn("Could not load selections:", error);
    savedSelectionsHint.hidden = true;
  }
}

/* Render the selected products list */
function renderSelectedProducts() {
  const selectedProducts = getSelectedProducts();
  selectionCount.textContent = `${selectedProducts.length} item${selectedProducts.length === 1 ? "" : "s"}`;

  if (!selectedProducts.length) {
    selectedProductsList.innerHTML = `
      <p class="empty-selection">Choose products from the grid to start your routine.</p>
    `;
    generateRoutineBtn.disabled = true;
    clearSelectionsBtn.disabled = true;
    saveSelectedProducts();
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-pill" data-product-id="${product.id}">
        <span>${product.name}</span>
        <button class="remove-product-btn" data-product-id="${product.id}" aria-label="Remove ${product.name}">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `,
    )
    .join("");

  generateRoutineBtn.disabled = false;
  clearSelectionsBtn.disabled = false;
  saveSelectedProducts();
}

/* Display products based on the current category and keyword search */
async function renderProductGrid() {
  const products = await loadProducts();
  const selectedCategory = categoryFilter.value;
  const searchTerm = productSearchInput.value.trim().toLowerCase();

  let filteredProducts = products;

  if (selectedCategory) {
    filteredProducts = filteredProducts.filter(
      (product) => product.category === selectedCategory,
    );
  }

  if (searchTerm) {
    filteredProducts = filteredProducts.filter((product) => {
      const searchableText = [
        product.name,
        product.brand,
        product.category,
        product.description,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(searchTerm);
    });
  }

  if (!selectedCategory && !searchTerm) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        Select a category to view products
      </div>
    `;
    searchResultsCount.textContent = "";
    return;
  }

  if (!filteredProducts.length) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products match your search.
      </div>
    `;
    searchResultsCount.textContent = "0 products found";
    return;
  }

  displayProducts(filteredProducts);
  searchResultsCount.textContent = `Showing ${filteredProducts.length} matching product${filteredProducts.length === 1 ? "" : "s"}`;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProductIds.has(product.id);

      return `
        <article class="product-card ${isSelected ? "selected" : ""}" data-product-id="${product.id}" tabindex="0">
          <button class="product-select-toggle" data-product-id="${product.id}" aria-label="${isSelected ? "Remove" : "Select"} ${product.name}">
            <i class="fa-solid ${isSelected ? "fa-check" : "fa-plus"}"></i>
          </button>

          <img src="${product.image}" alt="${product.name}" />

          <div class="product-info">
            <span class="product-brand">${product.brand}</span>
            <h3>${product.name}</h3>
            <p class="product-category">${formatCategory(product.category)}</p>

            <button class="details-toggle" data-product-id="${product.id}" aria-expanded="false">
              View description
            </button>

            <p class="product-description" id="description-${product.id}" hidden>${product.description}</p>
          </div>
        </article>
      `;
    })
    .join("");
}

/* Toggle selection when user clicks a card */
function toggleProductSelection(productId) {
  if (selectedProductIds.has(productId)) {
    selectedProductIds.delete(productId);
  } else {
    selectedProductIds.add(productId);
  }

  renderSelectedProducts();
  renderProductGrid();
}

/* Remove all saved selections at once */
function clearAllSelections() {
  selectedProductIds.clear();
  localStorage.removeItem(STORAGE_KEY);
  renderSelectedProducts();
  renderProductGrid();
}

/* Toggle a product description panel */
function toggleDescription(productId) {
  const descriptionElement = document.getElementById(
    `description-${productId}`,
  );
  const detailsButton = document.querySelector(
    `.details-toggle[data-product-id="${productId}"]`,
  );

  if (!descriptionElement || !detailsButton) {
    return;
  }

  const allDescriptions = document.querySelectorAll(".product-description");
  const allButtons = document.querySelectorAll(".details-toggle");

  const shouldOpen = descriptionElement.hidden;

  allDescriptions.forEach((element) => {
    element.hidden = true;
  });

  allButtons.forEach((button) => {
    button.textContent = "View description";
    button.setAttribute("aria-expanded", "false");
  });

  if (shouldOpen) {
    descriptionElement.hidden = false;
    detailsButton.textContent = "Hide description";
    detailsButton.setAttribute("aria-expanded", "true");
  }
}

/* Safely render a string inside our chat bubbles */
function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/* Convert plain text into readable chat-friendly blocks with bullets */
function formatMessageContent(content) {
  const lines = content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return "";
  }

  const formattedBlocks = [];
  let listItems = [];

  const pushList = () => {
    if (!listItems.length) {
      return;
    }

    formattedBlocks.push(
      `<ul>${listItems.map((item) => `<li>${item}</li>`).join("")}</ul>`,
    );
    listItems = [];
  };

  lines.forEach((line) => {
    if (/^[-*]\s+/.test(line)) {
      listItems.push(escapeHtml(line.replace(/^[-*]\s+/, "")));
      return;
    }

    if (/^\d+\.\s+/.test(line)) {
      listItems.push(escapeHtml(line.replace(/^\d+\.\s+/, "")));
      return;
    }

    pushList();
    formattedBlocks.push(`<p>${escapeHtml(line)}</p>`);
  });

  pushList();

  return formattedBlocks.join("");
}

/* Simulate the AI typing itself out in the chat bubble */
function typeAssistantMessage(element, text) {
  let currentText = "";

  const typingInterval = setInterval(() => {
    currentText = text.slice(0, currentText.length + 1);
    element.textContent = currentText;

    if (currentText.length === text.length) {
      clearInterval(typingInterval);
      element.innerHTML = formatMessageContent(text);
    }
  }, 16);
}

/* Add a new chat message to the chat window */
function addChatMessage(role, content, citations = []) {
  const messageClass = role === "user" ? "user-message" : "assistant-message";
  const bubble = document.createElement("div");
  bubble.className = `chat-message ${messageClass}`;

  const label = document.createElement("strong");
  label.textContent = role === "user" ? "You" : "Advisor";
  bubble.appendChild(label);

  const messageBody = document.createElement(role === "user" ? "p" : "div");

  if (role === "user") {
    messageBody.innerHTML = formatMessageContent(content);
  } else {
    messageBody.className = "assistant-text";
    typeAssistantMessage(messageBody, content);
  }

  bubble.appendChild(messageBody);

  if (citations.length) {
    const citationList = document.createElement("div");
    citationList.className = "citation-list";
    citationList.innerHTML = `<strong>Sources</strong>${citations
      .map((citation) => {
        const citationUrl = citation.url || citation.title || "";
        const citationLabel = citation.title || citationUrl || "Source link";
        return `<a href="${citationUrl}" target="_blank" rel="noreferrer">${citationLabel}</a>`;
      })
      .join("")}`;
    bubble.appendChild(citationList);
  }

  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Enable or disable the chatbox when needed */
function setChatEnabled(isEnabled) {
  userInput.disabled = !isEnabled;
  sendBtn.disabled = !isEnabled;
  userInput.placeholder = isEnabled
    ? "Ask me about products, routines, skincare, or haircare…"
    : "Chat is temporarily unavailable";
}

/* Pull the text reply out of the worker response so both chat-completions and responses API payloads work */
function extractReplyContent(data) {
  const citations = extractWebSearchCitations(data);

  if (Array.isArray(data.choices) && data.choices[0]?.message?.content) {
    return {
      content: data.choices[0].message.content,
      citations: [],
    };
  }

  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return {
      content: data.output_text,
      citations,
    };
  }

  if (Array.isArray(data.output)) {
    const combinedText = data.output
      .flatMap((item) => (Array.isArray(item.content) ? item.content : []))
      .map((entry) => (typeof entry.text === "string" ? entry.text : ""))
      .filter(Boolean)
      .join("\n");

    if (combinedText.trim()) {
      return {
        content: combinedText,
        citations,
      };
    }
  }

  return {
    content: "I’m sorry, I couldn’t generate a response right now.",
    citations: [],
  };
}

/* Extract real web citations from the Responses API payload */
function extractWebSearchCitations(data) {
  const citations = [];
  const seenUrls = new Set();

  function visit(value) {
    if (!value || typeof value !== "object") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (value.type === "url_citation" && typeof value.url === "string") {
      const normalizedUrl = value.url.trim();
      if (!normalizedUrl || seenUrls.has(normalizedUrl)) {
        return;
      }

      seenUrls.add(normalizedUrl);
      citations.push({
        url: normalizedUrl,
        title:
          typeof value.title === "string" && value.title.trim()
            ? value.title.trim()
            : normalizedUrl,
      });
    }

    if (Array.isArray(value.annotations)) {
      value.annotations.forEach(visit);
    }

    if (Array.isArray(value.content)) {
      value.content.forEach(visit);
    }

    Object.values(value).forEach(visit);
  }

  visit(data);
  return citations;
}

/* Send the conversation to the Cloudflare Worker */
async function sendToWorker(chatMessages) {
  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages: chatMessages, useWebSearch: true }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(
      data.error || "The routine request could not be completed.",
    );
  }

  return extractReplyContent(data);
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async () => {
  await renderProductGrid();
});

/* Filter products as the user types */
productSearchInput.addEventListener("input", async () => {
  await renderProductGrid();
});

/* Handle clicks inside the products grid */
productsContainer.addEventListener("click", (e) => {
  const selectButton = e.target.closest(".product-select-toggle");
  if (selectButton) {
    e.preventDefault();
    const productId = Number(selectButton.dataset.productId);
    toggleProductSelection(productId);
    return;
  }

  const detailsButton = e.target.closest(".details-toggle");
  if (detailsButton) {
    e.preventDefault();
    const productId = Number(detailsButton.dataset.productId);
    toggleDescription(productId);
    return;
  }

  const productCard = e.target.closest(".product-card");
  if (productCard && !e.target.closest("button")) {
    const productId = Number(productCard.dataset.productId);
    toggleProductSelection(productId);
  }
});

/* Let keyboard users toggle a card too */
productsContainer.addEventListener("keydown", (e) => {
  if (
    (e.key === "Enter" || e.key === " ") &&
    e.target.classList.contains("product-card")
  ) {
    e.preventDefault();
    const productId = Number(e.target.dataset.productId);
    toggleProductSelection(productId);
  }
});

/* Remove selected product from the list */
selectedProductsList.addEventListener("click", (e) => {
  const removeButton = e.target.closest(".remove-product-btn");
  if (!removeButton) {
    return;
  }

  const productId = Number(removeButton.dataset.productId);
  selectedProductIds.delete(productId);
  renderSelectedProducts();
  renderProductGrid();
});

clearSelectionsBtn.addEventListener("click", () => {
  clearAllSelections();
});

rtlToggle.addEventListener("click", () => {
  isRTL = !isRTL;
  applyRTLLayout(isRTL);
  localStorage.setItem(RTL_STORAGE_KEY, String(isRTL));
});

/* Generate a personalized routine with only the selected products */
generateRoutineBtn.addEventListener("click", async () => {
  const selectedProducts = getSelectedProducts();

  if (!selectedProducts.length) {
    addChatMessage(
      "assistant",
      "Please select at least one product before generating your routine.",
    );
    return;
  }

  const productSummary = selectedProducts.map((product) => ({
    id: product.id,
    brand: product.brand,
    name: product.name,
    category: product.category,
    description: product.description,
  }));

  const routineQuestion = {
    role: "user",
    content: `Build a personalized beauty routine using only these selected products: ${JSON.stringify(productSummary)}. Keep the response easy to follow, stylish, and product-focused.`,
  };

  messages.push(routineQuestion);
  addChatMessage("user", routineQuestion.content);

  try {
    addChatMessage("assistant", "I’m creating a routine for you now...");
    const replyData = await sendToWorker(messages);
    messages.push({ role: "assistant", content: replyData.content });

    routineGenerated = true;
    setChatEnabled(true);

    chatWindow.lastElementChild.remove();
    addChatMessage("assistant", replyData.content, replyData.citations);
  } catch (error) {
    routineGenerated = false;
    setChatEnabled(false);
    chatWindow.lastElementChild.remove();
    addChatMessage("assistant", error.message);
  }
});

/* Chat form submission for follow-up questions */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const question = userInput.value.trim();
  if (!question) {
    return;
  }

  messages.push({ role: "user", content: question });
  addChatMessage("user", question);
  userInput.value = "";

  try {
    addChatMessage("assistant", "Thinking...");
    const replyData = await sendToWorker(messages);
    messages.push({ role: "assistant", content: replyData.content });

    chatWindow.lastElementChild.remove();
    addChatMessage("assistant", replyData.content, replyData.citations);
  } catch (error) {
    chatWindow.lastElementChild.remove();
    addChatMessage("assistant", error.message);
  }
});

/* Initialize the UI on page load */
(async () => {
  await loadProducts();
  loadSelectedProducts();
  isRTL = localStorage.getItem(RTL_STORAGE_KEY) === "true";
  applyRTLLayout(isRTL);
  renderSelectedProducts();
  setChatEnabled(true);
  addChatMessage(
    "assistant",
    "Choose a category from the filter, select a few products, or ask a beauty question right away.",
  );
})();
