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

    // Store original quantities for scaling
    let currentRecipe = null;
    let recipes = []; // This will hold the recipe summaries (name, description, tags, filename)
    let recipeCache = new Map(); // Cache for full recipe data
    let allTags = new Set(); // Store all unique tags
    let selectedTags = new Set(); // Store currently selected tags

    /**
     * Function to fetch recipe summaries from Info.json.
     * This approach loads all recipe metadata in a single request,
     * avoiding multiple network calls during initialization.
     */
    async function fetchRecipeSummaries() {
        try {
            const response = await fetch("asset/Info.json");
            if (!response.ok) {
                throw new Error(`Failed to fetch Info.json: ${response.statusText}`);
            }
            const data = await response.json();
            
            // Set last updated timestamp
            data.lastUpdated = new Date().toISOString();
            
            // Populate all tags from the pre-computed list
            if (data.allTags && Array.isArray(data.allTags)) {
                data.allTags.forEach(tag => allTags.add(tag));
            }
            
            console.log(`Loaded ${data.totalRecipes} recipes with ${data.allTags.length} unique tags`);
            
            return data.recipes || [];
            
        } catch (error) {
            console.error("Error fetching recipe summaries:", error);
            return [];
        }
    }

    /**
     * Function to load a single recipe's full details on demand.
     * Uses caching to avoid repeated network requests.
     */
    async function loadRecipeDetails(filename) {
        // Check cache first
        if (recipeCache.has(filename)) {
            return recipeCache.get(filename);
        }

        try {
            const recipeResponse = await fetch(`recipes/${filename}.json`);
            if (!recipeResponse.ok) {
                throw new Error(`Failed to fetch ${filename}.json: ${recipeResponse.statusText}`);
            }

            const recipe = await recipeResponse.json();
            recipe.filename = filename;

            // Calculate ingredient ratios for scaling
            if (recipe.ingredients.length > 0 && recipe.ingredients[0].quantity > 0) {
                const baseQuantity = recipe.ingredients[0].quantity;
                recipe.ingredients.forEach((ingredient) => {
                    ingredient.ratio = ingredient.quantity / baseQuantity;
                });
            }

            // Cache the recipe
            recipeCache.set(filename, recipe);
            return recipe;
        } catch (error) {
            console.error(`Error loading recipe ${filename}:`, error);
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
        renderTags();
        renderRecipeList();
    }

    // Function to filter recipes based on selected tags
    function getFilteredRecipes() {
        if (selectedTags.size === 0) {
            return recipes;
        }
        return recipes.filter((recipe) => {
            if (!recipe.tags || !Array.isArray(recipe.tags)) {
                return false;
            }
            return Array.from(selectedTags).every((selectedTag) =>
                recipe.tags.includes(selectedTag)
            );
        });
    }

    // Function to render the list of recipes
    function renderRecipeList() {
        recipeListContainer.innerHTML = "";
        const filteredRecipes = getFilteredRecipes();

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

        filteredRecipes.forEach((recipe) => {
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
                <p class="text-gray-600">${recipe.description}</p>
                ${tagsHtml}
            `;
            card.onclick = () => showRecipeDetail(recipe.filename);
            recipeListContainer.appendChild(card);
        });
    }

    // Function to display a single recipe's details
    async function showRecipeDetail(filename) {
        try {
            // Load full recipe details
            const recipe = await loadRecipeDetails(filename);
            if (!recipe) {
                console.error("Recipe not found:", filename);
                return;
            }

            currentRecipe = recipe; // Store the current recipe for scaling
            recipeListContainer.classList.add("hidden");
            recipeDetailContainer.classList.remove("hidden");

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
            // Optionally show error message to user
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
                // Fixed: Access the data attribute using camelCase
                const otherOriginalQuantity = parseFloat(input.dataset.originalQuantity);
                const newCalculatedQuantity = otherOriginalQuantity * scalingFactor;
                // Round to 2 decimal places for better readability
                input.value = newCalculatedQuantity.toFixed(2);
            }
        });
    }

    // Function to show the recipe list and hide the detail view
    function showRecipeList() {
        recipeListContainer.classList.remove("hidden");
        recipeDetailContainer.classList.add("hidden");
    }

    // Attach event listener to the back button
    backButton.addEventListener("click", showRecipeList);

    // Attach event listener to clear tags button
    clearTagsButton.addEventListener("click", clearAllTags);

    // Initial call to fetch data and render the list when the page loads
    window.onload = async () => {
        recipes = await fetchRecipeSummaries();
        renderTags();
        renderRecipeList();
    };
})();
