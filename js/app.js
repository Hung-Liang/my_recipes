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

    // Store original quantities for scaling
    let currentRecipe = null;
    let recipes = []; // This will hold the fetched recipes

    /**
     * Function to fetch JSON files from the /recipes directory.
     * In a real-world scenario, you might need a server-side script to list files.
     * Here, we'll manually list the files for demonstration purposes.
     * This function is an example and might need adjustments depending on your server setup.
     */
    async function fetchRecipeData() {
        const fetchedRecipes = [];
        try {
            const response = await fetch('asset/recipes.json');
            if (!response.ok) {
                throw new Error(`Failed to fetch recipes.json: ${response.statusText}`);
            }
            const fileNames = await response.json();

            for (const fileName of fileNames) {
                try {
                    const recipeResponse = await fetch(fileName);
                    if (!recipeResponse.ok) {
                        throw new Error(`Failed to fetch ${fileName}: ${recipeResponse.statusText}`);
                    }
                    const recipe = await recipeResponse.json();
                    // Dynamically calculate the ratio based on the first ingredient
                    if (recipe.ingredients.length > 0 && recipe.ingredients[0].quantity > 0) {
                        const baseQuantity = recipe.ingredients[0].quantity;
                        recipe.ingredients.forEach((ingredient) => {
                            ingredient.ratio = ingredient.quantity / baseQuantity;
                        });
                    }
                    fetchedRecipes.push(recipe);
                } catch (error) {
                    console.error(error);
                }
            }
        } catch (error) {
            console.error(error);
        }
        return fetchedRecipes;
    }

    // Function to render the list of recipes
    function renderRecipeList() {
        recipeListContainer.innerHTML = "";
        recipes.forEach((recipe) => {
            const card = document.createElement("div");
            card.className =
                "bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-200 cursor-pointer";
            card.innerHTML = `
                <h2 class="text-2xl font-semibold text-gray-900 mb-2">${recipe.name}</h2>
                <p class="text-gray-600">${recipe.description}</p>
            `;
            card.onclick = () => showRecipeDetail(recipe.id);
            recipeListContainer.appendChild(card);
        });
    }

    // Function to display a single recipe's details
    function showRecipeDetail(recipeId) {
        const recipe = recipes.find((r) => r.id === recipeId);
        if (!recipe) {
            console.error("Recipe not found:", recipeId);
            return;
        }
        currentRecipe = recipe; // Store the current recipe for scaling
        recipeListContainer.classList.add("hidden");
        recipeDetailContainer.classList.remove("hidden");

        recipeDetailName.textContent = recipe.name;
        recipeDetailDescription.textContent = recipe.description;

        // Render ingredients with scaling functionality
        recipeDetailIngredients.innerHTML = "";
        recipe.ingredients.forEach((ingredient) => {
            const listItem = document.createElement("li");
            listItem.className = "flex items-center space-x-2";
            listItem.innerHTML = `
                <span class="text-gray-700 w-1/2">${ingredient.name}:</span>
                <input
                    type="number"
                    value="${ingredient.quantity}"
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

    // Initial call to fetch data and render the list when the page loads
    window.onload = async () => {
        recipes = await fetchRecipeData();
        renderRecipeList();
    };
})();
