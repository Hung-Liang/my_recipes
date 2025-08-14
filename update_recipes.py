import os
import json
import re

def update_recipe_list():
    """
    Dynamically updates the fileNames array in js/app.js with the
    list of JSON files in the recipes directory.
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    recipes_dir = os.path.join(script_dir, 'recipes')
    js_app_path = os.path.join(script_dir, 'js', 'app.js')

    # Get the list of recipe files
    try:
        recipe_files = [f"recipes/{file}" for file in os.listdir(recipes_dir) if file.endswith('.json')]
    except FileNotFoundError:
        print(f"Error: The directory '{recipes_dir}' was not found.")
        return

    # Create the JSON string for the file list
    file_names_json = json.dumps(recipe_files)

    # Read the app.js file
    try:
        with open(js_app_path, 'r', encoding='utf-8') as f:
            app_js_content = f.read()
    except FileNotFoundError:
        print(f"Error: The file '{js_app_path}' was not found.")
        return

    # Use regex to replace the fileNames array
    # This regex looks for "const fileNames = [...]" and replaces the array contents
    new_content, replacements = re.subn(
        r"(const fileNames = )(\[.*?\]);",
        r"\g<1>" + file_names_json + ";",
        app_js_content
    )

    if replacements > 0:
        # Write the updated content back to the file
        with open(js_app_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Successfully updated js/app.js with the new recipe list.")
    else:
        print("Could not find the fileNames array in js/app.js. No changes were made.")

if __name__ == "__main__":
    update_recipe_list()
