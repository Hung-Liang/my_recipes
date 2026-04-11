// Use a self-contained closure to avoid polluting the global namespace.
(function () {
    // Get a reference to the main containers
    const recipeListContainer = document.getElementById("recipe-list-container");
    const recipeDetailContainer = document.getElementById("recipe-detail-container");
    const recipeDetailName = document.getElementById("recipe-detail-name");
    const recipeDetailDescription = document.getElementById("recipe-detail-description");
    const recipeDetailIngredients = document.getElementById("recipe-detail-ingredients");
    const recipeDetailSteps = document.getElementById("recipe-detail-steps");
    const recipeDetailNotes = document.getElementById("recipe-detail-notes");
    const recipeDetailNotesContainer = document.getElementById("recipe-detail-notes-container");
    const backButton = document.getElementById("back-button");
    const servingsInput = document.getElementById("servings-input");
    const servingsUnit = document.getElementById("servings-unit");
    const tagsContainer = document.getElementById("tags-container");
    const selectedTagsSpan = document.getElementById("selected-tags");
    const clearTagsButton = document.getElementById("clear-tags");
    const searchInput = document.getElementById("search-input");

    // Store original quantities for scaling
    let currentRecipe = null;
    let recipes = []; // This will hold the recipe summaries
    let recipeCache = new Map(); // Cache for full recipe data
    let allTags = new Set(); // Store all unique tags
    let selectedTags = new Set(); // Store currently selected tags
    let searchTerm = ""; // Store current search keyword
    
    // Pagination state
    let itemsPerPage = 9;
    let displayedCount = 9;

    /**
     * Function to fetch recipe summaries from info.json.
     * Implements basic caching to localStorage for faster initial paint.
     */
    async function fetchRecipeSummaries() {
        const CACHE_KEY = "recipe_summaries_cache";
        
        // Try to load from cache first for immediate display
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
            try {
                const parsed = JSON.parse(cachedData);
                recipes = parsed.recipes || [];
                if (parsed.allTags) parsed.allTags.forEach(tag => allTags.add(tag));
                renderTags();
                renderRecipeList();
                console.log("Loaded from cache");
            } catch (e) {
                console.error("Cache parsing error", e);
            }
        }

        try {
            const response = await fetch("asset/info.json");
            if (!response.ok) {
                throw new Error(`Failed to fetch info.json: ${response.statusText}`);
            }
            const data = await response.json();
            
            // Update recipes and tags
            recipes = data.recipes || [];
            allTags.clear();
            if (data.allTags && Array.isArray(data.allTags)) {
                data.allTags.forEach(tag => allTags.add(tag));
            }
            
            // Save to cache
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            
            return recipes;
            
        } catch (error) {
            console.error("Error fetching recipe summaries:", error);
            return recipes; // Return cached if available
        }
    }

    /**
     * Function to load a single recipe's full details on demand.
     * Uses caching to avoid repeated network requests.
     */
    async function loadRecipeDetails(path) {
        // Check cache first
        if (recipeCache.has(path)) {
            return recipeCache.get(path);
        }

        try {
            const recipeResponse = await fetch(`recipes/${path}`);
            if (!recipeResponse.ok) {
                throw new Error(`Failed to fetch ${path}: ${recipeResponse.statusText}`);
            }

            const recipe = await recipeResponse.json();
            recipe.path = path;

            // Calculate ingredient ratios for scaling
            if (recipe.ingredients && recipe.ingredients.length > 0 && recipe.ingredients[0].quantity > 0) {
                const baseQuantity = recipe.ingredients[0].quantity;
                recipe.ingredients.forEach((ingredient) => {
                    ingredient.ratio = ingredient.quantity / baseQuantity;
                });
            }

            // Cache the recipe
            recipeCache.set(path, recipe);
            return recipe;
        } catch (error) {
            console.error(`Error loading recipe ${path}:`, error);
            return null;
        }
    }

    // Function to render all available tags
    function renderTags() {
        tagsContainer.innerHTML = "";
        Array.from(allTags)
            .sort()
            .forEach((tag) => {
                const tagButton = document.createElement("button");
                tagButton.className = selectedTags.has(tag)
                    ? "px-3 py-1 text-sm rounded-full border-2 border-blue-500 bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                    : "px-3 py-1 text-sm rounded-full border-2 border-gray-300 bg-white text-gray-700 hover:border-blue-500 hover:text-blue-500 transition-colors";
                tagButton.textContent = tag;
                tagButton.onclick = () => toggleTag(tag);
                tagsContainer.appendChild(tagButton);
            });
        updateSelectedTagsDisplay();
    }

    // Function to toggle tag selection
    function toggleTag(tag) {
        if (selectedTags.has(tag)) {
            selectedTags.delete(tag);
        } else {
            selectedTags.add(tag);
        }
        displayedCount = itemsPerPage; // Reset pagination on filter
        renderTags();
        renderRecipeList();
    }

    // Function to update selected tags display
    function updateSelectedTagsDisplay() {
        if (selectedTags.size === 0) {
            selectedTagsSpan.textContent = "無";
            clearTagsButton.classList.add("hidden");
        } else {
            selectedTagsSpan.textContent = Array.from(selectedTags).join(", ");
            clearTagsButton.classList.remove("hidden");
        }
    }

    // Function to clear all selected tags
    function clearAllTags() {
        selectedTags.clear();
        displayedCount = itemsPerPage; // Reset pagination
        renderTags();
        renderRecipeList();
    }

    // Function to filter recipes based on selected tags and search term
    function getFilteredRecipes() {
        let filtered = recipes;

        // Filter by tags
        if (selectedTags.size > 0) {
            filtered = filtered.filter((recipe) => {
                if (!recipe.tags || !Array.isArray(recipe.tags)) {
                    return false;
                }
                return Array.from(selectedTags).every((selectedTag) =>
                    recipe.tags.includes(selectedTag)
                );
            });
        }

        // Filter by search term
        if (searchTerm) {
            const lowTerm = searchTerm.toLowerCase();
            filtered = filtered.filter((recipe) => 
                recipe.name.toLowerCase().includes(lowTerm) || 
                recipe.description.toLowerCase().includes(lowTerm) ||
                (recipe.tags && recipe.tags.some(tag => tag.toLowerCase().includes(lowTerm)))
            );
        }

        return filtered;
    }

    // Function to render the list of recipes with pagination
    function renderRecipeList() {
        // Ensure we are in list view
        recipeListContainer.classList.remove("hidden");
        recipeDetailContainer.classList.add("hidden");
        
        recipeListContainer.innerHTML = "";
        const filteredRecipes = getFilteredRecipes();
        const recipesToShow = filteredRecipes.slice(0, displayedCount);

        if (filteredRecipes.length === 0) {
            const noResultsDiv = document.createElement("div");
            noResultsDiv.className = "col-span-full text-center py-8";
            noResultsDiv.innerHTML = `
                <p class="text-gray-500 text-lg">沒有找到符合條件的食譜</p>
                <p class="text-gray-400 text-sm mt-2">嘗試調整篩選條件</p>
            `;
            recipeListContainer.appendChild(noResultsDiv);
            return;
        }

        recipesToShow.forEach((recipe) => {
            const card = document.createElement("div");
            card.className =
                "bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-200 cursor-pointer";

            // Create tags display
            const tagsHtml =
                recipe.tags && recipe.tags.length > 0
                    ? `<div class="flex flex-wrap gap-1 mt-3">
                     ${recipe.tags
                         .map(
                             (tag) =>
                                 `<span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">${tag}</span>`
                         )
                         .join("")}
                   </div>`
                    : "";

            card.innerHTML = `
                <h2 class="text-2xl font-semibold text-gray-900 mb-2">${recipe.name}</h2>
                <p class="text-gray-600 line-clamp-2">${recipe.description}</p>
                ${tagsHtml}
            `;
            card.onclick = () => {
                window.location.hash = `recipe/${recipe.path}`;
            };
            recipeListContainer.appendChild(card);
        });

        // Add "Load More" button if there are more recipes to show
        if (displayedCount < filteredRecipes.length) {
            const loadMoreContainer = document.createElement("div");
            loadMoreContainer.className = "col-span-full flex justify-center py-8";
            const loadMoreButton = document.createElement("button");
            loadMoreButton.className = "px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors shadow-md";
            loadMoreButton.textContent = "載入更多食譜";
            loadMoreButton.onclick = (e) => {
                e.stopPropagation();
                displayedCount += itemsPerPage;
                renderRecipeList();
                // Scroll slightly to show new items
                window.scrollBy({ top: 200, behavior: 'smooth' });
            };
            loadMoreContainer.appendChild(loadMoreButton);
            recipeListContainer.appendChild(loadMoreContainer);
        }
    }

    // Function to display a single recipe's details
    async function showRecipeDetail(filename) {
        try {
            // Show loading state if needed
            recipeDetailName.textContent = "載入中...";
            
            // Load full recipe details
            const recipe = await loadRecipeDetails(filename);
            if (!recipe) {
                console.error("Recipe not found:", filename);
                window.location.hash = ""; // Back to list if not found
                return;
            }

            currentRecipe = recipe; // Store the current recipe for scaling
            recipeListContainer.classList.add("hidden");
            recipeDetailContainer.classList.remove("hidden");
            // Scroll to top
            window.scrollTo(0, 0);

            recipeDetailName.textContent = recipe.name;
            recipeDetailDescription.textContent = recipe.description;

            // Set up servings display and control
            if (recipe.servings) {
                servingsInput.value = recipe.servings.quantity;
                servingsUnit.textContent = recipe.servings.unit;
            } else {
                servingsInput.value = 1;
                servingsUnit.textContent = "份";
            }

            // Remove any existing event listeners to avoid duplicates
            servingsInput.removeEventListener("input", handleServingsChange);

            // Render ingredients with scaling functionality
            renderIngredients();

            // Attach event listener to servings input for scaling
            servingsInput.addEventListener("input", handleServingsChange);

            // Render steps
            recipeDetailSteps.innerHTML = "";
            recipe.steps.forEach((step) => {
                const listItem = document.createElement("li");
                listItem.textContent = step;
                recipeDetailSteps.appendChild(listItem);
            });

            // Render notes or hide the container if there are none
            recipeDetailNotes.innerHTML = "";
            if (recipe.notes && recipe.notes.length > 0) {
                recipe.notes.forEach((note) => {
                    const listItem = document.createElement("li");
                    listItem.textContent = note;
                    recipeDetailNotes.appendChild(listItem);
                });
                recipeDetailNotesContainer.classList.remove("hidden");
            } else {
                recipeDetailNotesContainer.classList.add("hidden");
            }
        } catch (error) {
            console.error("Error displaying recipe details:", error);
            window.location.hash = "";
        }
    }

    // Function to handle routing based on hash
    function handleRouting() {
        const hash = window.location.hash;
        if (hash.startsWith("#recipe/")) {
            const filename = hash.substring(8);
            showRecipeDetail(filename);
        } else {
            renderRecipeList();
        }
    }

    // Function to render ingredients based on current servings
    function renderIngredients() {
        if (!currentRecipe) return;

        const currentServings = parseFloat(servingsInput.value);
        const originalServings = currentRecipe.servings ? currentRecipe.servings.quantity : 1;
        const scalingFactor = currentServings / originalServings;

        recipeDetailIngredients.innerHTML = "";
        currentRecipe.ingredients.forEach((ingredient) => {
            const scaledQuantity = (ingredient.quantity * scalingFactor).toFixed(2);
            const listItem = document.createElement("li");
            listItem.className = "flex items-center space-x-2";
            listItem.innerHTML = `
                <span class="text-gray-700 w-1/2">${ingredient.name}:</span>
                <input
                    type="number"
                    value="${scaledQuantity}"
                    data-original-quantity="${ingredient.quantity}"
                    data-ratio="${ingredient.ratio}"
                    class="ingredient-input appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                <span class="text-gray-500">${ingredient.unit}</span>
            `;
            recipeDetailIngredients.appendChild(listItem);
        });

        // Attach event listeners to all ingredient inputs for scaling
        const ingredientInputs = document.querySelectorAll(".ingredient-input");
        ingredientInputs.forEach((input) => {
            input.addEventListener("input", handleIngredientChange);
        });
    }

    // Function to handle servings change and update all ingredients
    function handleServingsChange() {
        renderIngredients();
    }

    // Function to handle ingredient quantity changes and scale other ingredients
    function handleIngredientChange(event) {
        const changedInput = event.target;
        const newQuantity = parseFloat(changedInput.value);
        const originalQuantity = parseFloat(changedInput.dataset.originalQuantity);

        if (isNaN(newQuantity) || originalQuantity === 0) {
            return;
        }

        // Calculate the scaling factor
        const scalingFactor = newQuantity / originalQuantity;

        // Update all other inputs based on the scaling factor
        const allInputs = document.querySelectorAll(".ingredient-input");
        allInputs.forEach((input) => {
            if (input !== changedInput) {
                const otherOriginalQuantity = parseFloat(input.dataset.originalQuantity);
                const newCalculatedQuantity = otherOriginalQuantity * scalingFactor;
                input.value = newCalculatedQuantity.toFixed(2);
            }
        });
    }

    // Attach event listener to the back button
    backButton.addEventListener("click", () => {
        window.location.hash = "";
    });

    // Attach event listener to clear tags button
    clearTagsButton.addEventListener("click", clearAllTags);

    // Attach event listener to search input
    searchInput.addEventListener("input", (e) => {
        searchTerm = e.target.value;
        displayedCount = itemsPerPage; // Reset pagination on search
        renderRecipeList();
    });

    // Handle back/forward navigation
    window.addEventListener("hashchange", handleRouting);

    // Initial call to fetch data and render the list when DOM is ready
    document.addEventListener("DOMContentLoaded", async () => {
        await fetchRecipeSummaries();
        renderTags();
        handleRouting(); // Call routing instead of just renderRecipeList
    });
})();
