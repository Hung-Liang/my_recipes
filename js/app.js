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
    const categoryNav = document.getElementById("category-nav");

    // Category mapping for display
    const CATEGORY_MAP = {
        'poultry': '家禽/雞肉',
        'meat': '肉類料理',
        'seafood': '海鮮料理',
        'staples': '主食/麵飯',
        'snacks_desserts': '點心/早餐',
        'sauces_basics': '醬料/基礎',
        'unsort': '待分類'
    };

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
                // STRICT VALIDATION: Every recipe must have a 'path' attribute
                const isValid = parsed.recipes && 
                                parsed.recipes.length > 0 && 
                                parsed.recipes.every(r => r.path);
                
                if (isValid) {
                    recipes = parsed.recipes;
                    if (parsed.allTags) parsed.allTags.forEach(tag => allTags.add(tag));
                    renderTags();
                    renderRecipeList();
                    console.log("Loaded from valid cache");
                } else {
                    console.log("Cache is invalid or stale (missing path), clearing...");
                    localStorage.removeItem(CACHE_KEY);
                }
            } catch (e) {
                console.error("Cache parsing error", e);
                localStorage.removeItem(CACHE_KEY);
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
        const badge = document.getElementById("tag-count-badge");
        if (selectedTags.size === 0) {
            selectedTagsSpan.textContent = "無";
            clearTagsButton.classList.add("hidden");
            badge.classList.add("hidden");
        } else {
            selectedTagsSpan.textContent = Array.from(selectedTags).join(", ");
            clearTagsButton.classList.remove("hidden");
            badge.textContent = selectedTags.size;
            badge.classList.remove("hidden");
        }
    }

    // Function to clear all selected tags
    function clearAllTags() {
        selectedTags.clear();
        displayedCount = itemsPerPage; // Reset pagination
        renderTags();
        renderRecipeList();
    }

    // Toggle Tags Panel
    const toggleBtn = document.getElementById("toggle-tags");
    const tagsSection = document.getElementById("tags-filter-section");
    const toggleIcon = document.getElementById("toggle-icon");

    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            const isHidden = tagsSection.classList.contains("hidden");
            if (isHidden) {
                tagsSection.classList.remove("hidden");
                toggleIcon.classList.add("rotate-180");
            } else {
                tagsSection.classList.add("hidden");
                toggleIcon.classList.remove("rotate-180");
            }
        });
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

    // Function to render the list of recipes with grouping by category
    function renderRecipeList() {
        // Ensure we are in list view
        recipeListContainer.classList.remove("hidden");
        recipeDetailContainer.classList.add("hidden");
        
        recipeListContainer.innerHTML = "";
        categoryNav.innerHTML = "";
        
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

        // Group recipes by category
        const groups = {};
        filteredRecipes.forEach(recipe => {
            const cat = recipe.path.split('/')[0];
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(recipe);
        });

        // Define sort order based on CATEGORY_MAP keys
        const sortedCats = Object.keys(CATEGORY_MAP).filter(cat => groups[cat]);

        sortedCats.forEach(cat => {
            // 1. Create Navigation Button
            const navBtn = document.createElement("button");
            navBtn.className = "px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm";
            navBtn.textContent = CATEGORY_MAP[cat] || cat;
            navBtn.onclick = () => {
                const element = document.getElementById(`section-${cat}`);
                if (element) {
                    const offset = 20; // Extra padding from top
                    const elementPosition = element.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - offset;
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: "smooth"
                    });
                }
            };
            categoryNav.appendChild(navBtn);

            // 2. Create Section Header
            const header = document.createElement("div");
            header.id = `section-${cat}`;
            header.className = "col-span-full mt-8 mb-4 first:mt-0";
            header.innerHTML = `
                <div class="flex items-center space-x-4">
                    <h2 class="text-2xl font-bold text-gray-900">${CATEGORY_MAP[cat] || cat}</h2>
                    <div class="flex-grow h-px bg-gray-200"></div>
                    <span class="text-sm text-gray-500 font-medium">${groups[cat].length} 份食譜</span>
                </div>
            `;
            recipeListContainer.appendChild(header);

            // 3. Create Recipe Cards for this category
            groups[cat].forEach(recipe => {
                const card = document.createElement("div");
                card.className = "bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-200 cursor-pointer flex flex-col h-full";

                const tagsHtml = recipe.tags && recipe.tags.length > 0
                    ? `<div class="flex flex-wrap gap-1 mt-auto pt-4">
                         ${recipe.tags.map(tag => `<span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">${tag}</span>`).join("")}
                       </div>`
                    : "";

                card.innerHTML = `
                    <h3 class="text-xl font-bold text-gray-900 mb-2">${recipe.name}</h3>
                    <p class="text-gray-600 line-clamp-2 text-sm mb-4">${recipe.description}</p>
                    ${tagsHtml}
                `;
                card.onclick = () => {
                    window.location.hash = `recipe/${recipe.path}`;
                };
                recipeListContainer.appendChild(card);
            });
        });
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

    // Initial call to fetch data and render the list when DOM is ready
    document.addEventListener("DOMContentLoaded", async () => {
        // Setup UI Interaction elements first
        const toggleBtn = document.getElementById("toggle-tags");
        const tagsSection = document.getElementById("tags-filter-section");
        const toggleIcon = document.getElementById("toggle-icon");
        const shareButton = document.getElementById("share-button");

        // PC default: Expand tags if screen is wide (MD breakpoint is 768px)
        if (window.innerWidth >= 768 && tagsSection && toggleIcon) {
            tagsSection.classList.remove("hidden");
            toggleIcon.classList.add("rotate-180");
        }

        await fetchRecipeSummaries();
        renderTags();
        handleRouting();

        // Attach event listener to clear tags button
        if (clearTagsButton) {
            clearTagsButton.addEventListener("click", clearAllTags);
        }

        // Attach event listener to search input
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                searchTerm = e.target.value;
                displayedCount = itemsPerPage; // Reset pagination on search
                renderRecipeList();
            });
        }

        // Attach event listener to the back button
        if (backButton) {
            backButton.addEventListener("click", () => {
                window.location.hash = "";
            });
        }

        // Setup UI Interaction after content is loaded
        const toggleBtn = document.getElementById("toggle-tags");
        const tagsSection = document.getElementById("tags-filter-section");
        const toggleIcon = document.getElementById("toggle-icon");
        const shareButton = document.getElementById("share-button");

        // PC default: Expand tags if screen is wide
        if (window.innerWidth >= 768 && tagsSection && toggleIcon) {
            tagsSection.classList.remove("hidden");
            toggleIcon.classList.add("rotate-180");
        }

        if (toggleBtn && tagsSection && toggleIcon) {
            toggleBtn.onclick = () => {
                const isHidden = tagsSection.classList.contains("hidden");
                if (isHidden) {
                    tagsSection.classList.remove("hidden");
                    toggleIcon.classList.add("rotate-180");
                } else {
                    tagsSection.classList.add("hidden");
                    toggleIcon.classList.remove("rotate-180");
                }
            };
        }

        if (shareButton) {
            shareButton.onclick = async () => {
                if (!currentRecipe) return;
                const shareData = {
                    title: `Hung的食譜 - ${currentRecipe.name}`,
                    text: currentRecipe.description,
                    url: window.location.href
                };

                if (navigator.share) {
                    try {
                        await navigator.share(shareData);
                    } catch (err) {
                        console.log("Error sharing", err);
                    }
                } else {
                    try {
                        await navigator.clipboard.writeText(window.location.href);
                        const originalText = shareButton.innerHTML;
                        shareButton.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                            已複製網址
                        `;
                        shareButton.classList.replace("bg-blue-500", "bg-green-500");
                        setTimeout(() => {
                            shareButton.innerHTML = originalText;
                            shareButton.classList.replace("bg-green-500", "bg-blue-500");
                        }, 2000);
                    } catch (err) {
                        console.error("Failed to copy", err);
                    }
                }
            };
        }
    });
})();
